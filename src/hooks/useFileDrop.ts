"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAnswer,
  createOffer,
  maxMessageSize,
  rtcSupported,
  whenOpen,
  type ReachMode,
} from "@/lib/rtc/peer";
import { CodeError, decodeCode, encodeCode } from "@/lib/rtc/code";
import { receiveFiles, sendFiles, type Receiver, type Transfer } from "@/lib/FileDrop/transfer";
import {
  canSaveToFolder,
  canStreamDownload,
  chooseSink,
  pickFolder,
  type Partial as PartialFile,
  type Sink,
} from "@/lib/FileDrop/sink";
import { ScreenAwake } from "@/lib/FileDrop/wake";
import type {
  FileMeta,
  FileResult,
  TransferPhase,
  TransferProgress,
} from "@/lib/FileDrop/types";

/**
 * One File Drop session, from "introduce the two devices" to "the files are
 * across".
 *
 * All the awkward asynchrony of a serverless connection lives here so the panels
 * stay declarative: build a code, wait for the reply code, open the channel, run
 * the transfer, and tear absolutely everything down on the way out. The pieces
 * underneath are shared — `lib/rtc/` makes the connection, `lib/FileDrop/`
 * moves the bytes — and this is the only place that knows the order they go in.
 *
 * The role is fixed when a session starts, because it decides who speaks first:
 * the **sender** produces the offer and waits for a reply, the **receiver**
 * consumes an offer and produces the reply.
 */

export type Role = "send" | "receive";

export interface FileDropState {
  supported: boolean;
  phase: TransferPhase;
  /** Our code, for the other device to read. */
  myCode: string;
  /** The reply we are waiting for, once we have asked for it. */
  awaitingReply: boolean;
  /** What the sender says it is about to send (receiver side). */
  offer: { files: FileMeta[]; total: number } | null;
  progress: TransferProgress | null;
  results: FileResult[];
  message: string;
  error: string;
  /** Where received files will be written, once chosen. */
  sinkLabel: string;
  canPickFolder: boolean;
  /**
   * Whether the fallback sink can stream to disk. When false, a file that will
   * not fit in memory has to go into a folder instead — which the UI has to say
   * *before* a multi-gigabyte transfer starts.
   */
  canStream: boolean;
  /** Bytes of each offered file already on disk from an interrupted attempt. */
  resumable: Record<number, PartialFile>;
  /** Set while a partial file is being re-hashed so a resume can verify. */
  checking: string;

  /** Sender: create the invite for these files. */
  host: (files: File[], mode: ReachMode) => Promise<void>;
  /** Receiver: take an invite code (pasted, scanned or from a link). */
  join: (code: string, mode: ReachMode) => Promise<void>;
  /** Sender: feed in the reply code the other device produced. */
  reply: (code: string) => Promise<void>;
  /**
   * Receiver: start writing. `useFolder` opens the folder picker, which is the
   * only sink that can resume and the best one for very large files.
   */
  accept: (useFolder: boolean) => Promise<void>;
  /** Receiver: look in a folder for parts of this transfer already on disk. */
  checkResume: () => Promise<void>;
  decline: () => void;
  cancel: () => void;
  /** Forget everything and go back to the start. */
  reset: () => void;
}

export function useFileDrop(): FileDropState {
  const [phase, setPhase] = useState<TransferPhase>("idle");
  const [myCode, setMyCode] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [offer, setOffer] = useState<{ files: FileMeta[]; total: number } | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [results, setResults] = useState<FileResult[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sinkLabel, setSinkLabel] = useState("");
  const [canStream, setCanStream] = useState(false);
  const [resumable, setResumable] = useState<Record<number, PartialFile>>({});
  const [checking, setChecking] = useState("");

  const peerRef = useRef<{
    pc: RTCPeerConnection;
    close: () => void;
    accept: (remote: string) => Promise<void>;
  } | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const transferRef = useRef<Transfer | null>(null);
  const receiverRef = useRef<Receiver | null>(null);
  const filesRef = useRef<File[]>([]);
  /** A folder chosen for this session, kept so a resume can look inside it. */
  const folderRef = useRef<FileSystemDirectoryHandle | null>(null);
  const sinkRef = useRef<Sink | null>(null);
  const awake = useRef(new ScreenAwake());
  const alive = useRef(true);

  const teardown = useCallback(() => {
    transferRef.current?.cancel("Left the app.");
    transferRef.current = null;
    receiverRef.current = null;
    try {
      channelRef.current?.close();
    } catch {
      /* already closed */
    }
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  useEffect(() => {
    alive.current = true;
    void canStreamDownload().then((ok) => {
      if (alive.current) setCanStream(ok);
    });
    const lock = awake.current;
    return () => {
      alive.current = false;
      // Leaving the app must not leave a connection, a half-written file or the
      // screen pinned on.
      void lock.release();
      teardown();
    };
  }, [teardown]);

  const set = useCallback(<T,>(setter: (value: T) => void, value: T) => {
    if (alive.current) setter(value);
  }, []);

  const fail = useCallback(
    (text: string) => {
      if (!alive.current) return;
      setError(text);
      setPhase("failed");
    },
    [],
  );

  /* ------------------------------- sender ------------------------------- */

  const host = useCallback(
    async (files: File[], mode: ReachMode) => {
      if (!rtcSupported()) {
        fail("This browser can't open a direct connection.");
        return;
      }
      teardown();
      filesRef.current = files;
      setError("");
      setResults([]);
      setProgress(null);
      setMyCode("");
      setAwaitingReply(false);
      setPhase("pairing");
      setMessage(
        mode === "local"
          ? "Building an invite for devices on this network…"
          : "Building an invite that works across networks…",
      );

      try {
        const { peer, channel } = await createOffer(mode, "oneapp-filedrop", {
          onState: (state) => {
            if (state === "connected") set(setMessage, "Connected.");
            if (state === "failed") fail("The connection failed. Try again, or use this network only.");
          },
          onUnreachable: () =>
            fail(
              mode === "internet"
                ? "No direct path between these two networks could be found. Put both devices on the same network (a phone hotspot works) and try “this network only”."
                : "No path was found on this network. If the devices are on different networks, switch to “anywhere”.",
            ),
        });
        peerRef.current = peer;
        channelRef.current = channel;
        set(setMyCode, await encodeCode(peer.description));
        set(setAwaitingReply, true);
        set(setMessage, "Send this to the other device, then paste its reply below.");
      } catch {
        fail("An invite couldn't be created on this device.");
      }
    },
    [fail, set, teardown],
  );

  const reply = useCallback(
    async (code: string) => {
      const peer = peerRef.current;
      const channel = channelRef.current;
      if (!peer || !channel) return;
      setError("");
      setPhase("connecting");
      setMessage("Connecting…");
      try {
        await peer.accept(await decodeCode(code));
        await whenOpen(channel);
        set(setPhase, "transferring");
        set(setMessage, "Sending…");
        // Minutes of transfer: hold the screen so a sleeping phone doesn't stall it.
        void awake.current.acquire();
        transferRef.current = sendFiles(
          channel,
          filesRef.current,
          {
            onProgress: (p) => set(setProgress, p),
            onFileDone: (r) => alive.current && setResults((list) => [...list, r]),
            onDone: () => {
              void awake.current.release();
              set(setPhase, "done");
              set(setMessage, "Everything is across.");
            },
            onCancelled: (reason) => {
              void awake.current.release();
              set(setPhase, "cancelled");
              set(setMessage, reason);
            },
            onError: (m) => fail(m),
            onRehash: (fraction) =>
              set(
                setChecking,
                fraction >= 1 ? "" : `Checking what already arrived… ${Math.round(fraction * 100)}%`,
              ),
          },
          // Read from the negotiated association, so chunks are as large as
          // this particular connection will carry.
          maxMessageSize(peer.pc),
        );
      } catch (e) {
        fail(
          e instanceof CodeError
            ? e.message
            : "That reply didn't open a connection. Check both devices are on the chosen network and try again.",
        );
      }
    },
    [fail, set],
  );

  /* ------------------------------ receiver ------------------------------ */

  const join = useCallback(
    async (code: string, mode: ReachMode) => {
      if (!rtcSupported()) {
        fail("This browser can't open a direct connection.");
        return;
      }
      teardown();
      setError("");
      setResults([]);
      setProgress(null);
      setOffer(null);
      setPhase("pairing");
      setMessage("Reading the invite…");

      try {
        const description = await decodeCode(code);
        const { peer, channel } = await createAnswer(description, mode, {
          onState: (state) => {
            if (state === "failed") fail("The connection failed. Ask for a new invite and try again.");
          },
          onUnreachable: () =>
            fail("No direct path to the sending device was found on this network."),
        });
        peerRef.current = peer;
        set(setMyCode, await encodeCode(peer.description));
        set(setMessage, "Give this reply back to the sending device.");

        const open = await channel;
        channelRef.current = open;
        receiverRef.current = receiveFiles(open, {
          onOffer: (files, total) => {
            set(setOffer, { files, total });
            set(setResumable, {});
            set(setPhase, "offered");
            set(setMessage, "");
          },
          onProgress: (p) => set(setProgress, p),
          onFileDone: (r) => alive.current && setResults((list) => [...list, r]),
          onDone: () => {
            void awake.current.release();
            set(setPhase, "done");
            set(setMessage, "Everything arrived.");
          },
          onCancelled: (reason) => {
            void awake.current.release();
            set(setPhase, "cancelled");
            set(setMessage, reason);
          },
          onError: (m) => fail(m),
        });
        transferRef.current = receiverRef.current;
      } catch (e) {
        fail(
          e instanceof CodeError ? e.message : "That invite couldn't be used. Ask for a fresh one.",
        );
      }
    },
    [fail, set, teardown],
  );

  /**
   * Look in a folder for a partly-received copy of each offered file.
   *
   * Separate from accepting, because it asks for the folder and then reads back
   * (and hashes) whatever is already there — seconds of work on a few gigabytes,
   * against minutes to re-transfer them. Nothing is written by this.
   */
  const checkResume = useCallback(async () => {
    const files = offer?.files;
    if (!files) return;
    const dir = folderRef.current ?? (await pickFolder());
    if (!dir) return;
    folderRef.current = dir;
    const sink = await chooseSink(dir);
    sinkRef.current = sink;
    if (!sink.existing) return;

    const found: Record<number, PartialFile> = {};
    for (let index = 0; index < files.length; index++) {
      const meta = files[index];
      set(setChecking, `Checking “${meta.name}” for what already arrived…`);
      const partial = await sink.existing(meta);
      if (partial && partial.bytes > 0) found[index] = partial;
    }
    set(setChecking, "");
    set(setResumable, found);
  }, [offer, set]);

  const accept = useCallback(
    async (useFolder: boolean) => {
      const receiver = receiverRef.current;
      if (!receiver) return;
      /*
       * Sink order matters for large files: a folder streams to disk *and* can be
       * resumed, a streaming download has no size ceiling either, and collecting
       * into memory is only ever the last resort.
       */
      const dir = useFolder ? (folderRef.current ?? (await pickFolder())) : null;
      if (dir) folderRef.current = dir;
      const sink = dir && sinkRef.current?.kind === "disk" ? sinkRef.current : await chooseSink(dir);
      sinkRef.current = sink;
      set(setSinkLabel, sink.label);
      set(setPhase, "transferring");
      set(setMessage, `Receiving — ${sink.label}.`);
      void awake.current.acquire();
      // Only a sink that can resume is told about the partial files it found.
      receiver.accept(sink, sink.resumable ? resumable : {});
    },
    [resumable, set],
  );

  const decline = useCallback(() => {
    receiverRef.current?.decline();
    setPhase("cancelled");
    setMessage("You declined the transfer.");
  }, []);

  const cancel = useCallback(() => {
    transferRef.current?.cancel();
    setPhase("cancelled");
  }, []);

  const reset = useCallback(() => {
    void awake.current.release();
    teardown();
    setPhase("idle");
    setMyCode("");
    setAwaitingReply(false);
    setOffer(null);
    setProgress(null);
    setResults([]);
    setMessage("");
    setError("");
    setSinkLabel("");
    setResumable({});
    setChecking("");
    filesRef.current = [];
    sinkRef.current = null;
    // The chosen folder is kept: a retry after a dropped connection is exactly
    // when its contents are worth looking at again.
  }, [teardown]);

  return {
    supported: rtcSupported(),
    phase,
    myCode,
    awaitingReply,
    offer,
    progress,
    results,
    message,
    error,
    sinkLabel,
    canPickFolder: canSaveToFolder(),
    canStream,
    resumable,
    checking,
    host,
    join,
    reply,
    accept,
    checkResume,
    decline,
    cancel,
    reset,
  };
}
