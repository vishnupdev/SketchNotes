import {
  createAnswer,
  createOffer,
  maxMessageSize,
  rtcSupported,
  whenOpen,
  type Peer,
  type ReachMode,
} from "@/lib/rtc/peer";
import { checksum32, deflateText, inflateText, type PackEncoding } from "@/lib/pack";
import type { CloneOrigin, CloneReceipt } from "./types";

/**
 * The direct link a clone crosses, over a cable or over a network.
 *
 * The connection itself is `lib/rtc/peer.ts` — the same introduction dance the
 * rest of the workspace uses, with no signalling server: the offer and the
 * answer are turned into text the user carries across (a QR code, a link, a
 * pasted token) and after that the path is device to device. What is new here
 * is the *conversation* on top of it, and every part of it earns its place:
 *
 *  - **A header before the bytes.** The receiver is told the size up front, so
 *    its progress bar is a real fraction rather than a spinner, and so it can
 *    refuse something absurd before a byte is spent.
 *  - **Compression on the wire.** A device clone is mostly JSON and base64
 *    image data, which deflates by two thirds or more. Over a USB tether that
 *    is the difference between three seconds and ten.
 *  - **A checksum over the whole payload.** A clone is written straight into
 *    the store, so a truncated one must be *refused*, not half-applied.
 *  - **A receipt travelling back.** The sending device is usually the one being
 *    replaced, so "did it actually land?" is the only question that matters —
 *    and without an answer from the far end, nothing on the sending screen can
 *    honestly claim it did.
 *
 * Framing follows the workspace's established split: control messages are JSON
 * *strings*, payload is *ArrayBuffers*, told apart by `typeof event.data`. An
 * ordered channel means chunks cannot overtake each other, so no chunk needs an
 * index.
 */

export { rtcSupported as cloneLinkSupported };

/** Conservative default; raised to whatever the connection negotiated. */
const DEFAULT_CHUNK = 16 * 1024;
/** Ceiling regardless of what SCTP offers — bigger buys nothing and costs latency. */
const MAX_CHUNK = 256 * 1024;

/** What the sender announces before the payload starts. */
interface Head {
  t: "head";
  /** Compressed payload size, so progress is measured in real wire bytes. */
  bytes: number;
  /** How the payload was packed. */
  enc: PackEncoding;
  /** FNV-1a over the *unpacked* clone text. */
  checksum: string;
  from: CloneOrigin;
  takenAt: number;
  /** Keys in the clone, for the "12 apps, 214 items" line. */
  keys: number;
}

type Control =
  | Head
  /** The receiver is ready for the payload. */
  | { t: "go" }
  /** Every byte has been sent. */
  | { t: "end" }
  /** Arrived and verified — not yet written. */
  | { t: "got"; keys: number }
  /** Written into the receiving browser. */
  | { t: "done"; receipt: CloneReceipt }
  /** Either side giving up, with something to show a person. */
  | { t: "bad"; reason: string };

const isControl = (value: unknown): value is Control =>
  !!value && typeof value === "object" && typeof (value as Control).t === "string";

/* ------------------------------- handlers ------------------------------ */

export interface CloneLinkHandlers {
  onOpen?: () => void;
  /** Progress on the wire, 0..1. Fires on both sides. */
  onProgress?: (moved: number, total: number) => void;
  /** Receiver only: the sender has described what is coming. */
  onIncoming?: (head: { from: CloneOrigin; takenAt: number; bytes: number; keys: number }) => void;
  /** Receiver only: the whole clone arrived and its checksum matched. */
  onClone?: (json: string) => void;
  /** Sender only: the far end has it, intact. */
  onDelivered?: (keys: number) => void;
  /** Sender only: the far end wrote it in. */
  onReceipt?: (receipt: CloneReceipt) => void;
  onError?: (message: string) => void;
  onClosed?: () => void;
}

export interface CloneLink {
  /** The local description to carry to the other device. */
  description: string;
  /** Feed the description that came back. */
  accept: (remote: string) => Promise<void>;
  /** Sender only: push the clone across. Resolves when the last byte is queued. */
  send: (json: string) => Promise<void>;
  /** Receiver only: report back what applying the clone did. */
  report: (receipt: CloneReceipt) => void;
  close: () => void;
}

const CHANNEL = "oneapp-clone";

/* -------------------------------- sending ------------------------------ */

/**
 * The sending side. The data channel is created here, so it can be wired up
 * before the connection is live.
 */
export async function createCloneSender(
  reach: ReachMode,
  from: CloneOrigin,
  takenAt: number,
  handlers: CloneLinkHandlers = {},
): Promise<CloneLink> {
  const { peer, channel } = await createOffer(reach, CHANNEL, {
    onUnreachable: () => handlers.onError?.(unreachable(reach)),
  });

  let ready: (() => void) | null = null;
  const cleared = new Promise<void>((resolve) => {
    ready = resolve;
  });

  channel.binaryType = "arraybuffer";
  channel.onopen = () => handlers.onOpen?.();
  channel.onclose = () => handlers.onClosed?.();
  channel.onerror = () => handlers.onError?.("The direct link failed.");
  channel.onmessage = (event) => {
    const message = parse(event.data);
    if (!message) return;
    if (message.t === "go") ready?.();
    else if (message.t === "got") handlers.onDelivered?.(message.keys);
    else if (message.t === "done") handlers.onReceipt?.(message.receipt);
    else if (message.t === "bad") handlers.onError?.(message.reason);
  };

  return {
    description: peer.description,
    accept: peer.accept,
    send: async (json) => {
      await whenOpen(channel);
      const { data: packed, enc } = await deflateText(json);
      // Re-viewed rather than copied. `deflateText` types its buffer as
      // ArrayBufferLike — which in principle covers a SharedArrayBuffer, and
      // `send` takes only the plain kind. Nothing here is ever shared (the bytes
      // come from a CompressionStream in this same worker), so this narrows the
      // type without touching the data.
      const data = new Uint8Array(packed.buffer as ArrayBuffer, packed.byteOffset, packed.length);
      const head: Head = {
        t: "head",
        bytes: data.length,
        enc,
        checksum: checksum32(json),
        from,
        takenAt,
        keys: countKeys(json),
      };
      channel.send(JSON.stringify(head));

      // Wait for the receiver's go-ahead rather than firing bytes at a channel
      // that may not have a listener attached yet — the answering side wires
      // its handlers up when the channel event arrives, which is after ours.
      await Promise.race([cleared, timeout(20_000, "The other device didn't answer.")]);

      const chunk = Math.min(maxMessageSize(peer.pc) ?? DEFAULT_CHUNK, MAX_CHUNK);
      channel.bufferedAmountLowThreshold = chunk * 4;
      for (let at = 0; at < data.length; at += chunk) {
        await drain(channel, chunk);
        channel.send(data.subarray(at, Math.min(at + chunk, data.length)));
        handlers.onProgress?.(Math.min(at + chunk, data.length), data.length);
      }
      channel.send(JSON.stringify({ t: "end" } satisfies Control));
    },
    report: () => {
      /* the sending side has nothing to report */
    },
    close: () => closeBoth(peer, channel),
  };
}

/* ------------------------------- receiving ----------------------------- */

/**
 * The receiving side. The channel is opened by the other peer, so it arrives as
 * an event and the handlers are attached when it does.
 */
export async function createCloneReceiver(
  offer: string,
  reach: ReachMode,
  handlers: CloneLinkHandlers = {},
): Promise<CloneLink> {
  const { peer, channel } = await createAnswer(offer, reach, {
    onUnreachable: () => handlers.onError?.(unreachable(reach)),
  });

  let open: RTCDataChannel | null = null;
  void channel.then((c) => {
    open = c;
    attachReceiver(c, handlers);
  });

  return {
    description: peer.description,
    accept: async () => {
      /* the offer arrived above; there is nothing further to take in */
    },
    send: async () => {
      throw new Error("The receiving side doesn't send.");
    },
    report: (receipt) => {
      try {
        open?.send(JSON.stringify({ t: "done", receipt } satisfies Control));
      } catch {
        /* the link closed first — the clone is written either way */
      }
    },
    close: () => {
      if (open) closeBoth(peer, open);
      else peer.close();
    },
  };
}

function attachReceiver(channel: RTCDataChannel, handlers: CloneLinkHandlers): void {
  let head: Head | null = null;
  let parts: Uint8Array[] = [];
  let got = 0;

  channel.binaryType = "arraybuffer";
  channel.onopen = () => handlers.onOpen?.();
  channel.onclose = () => handlers.onClosed?.();
  channel.onerror = () => handlers.onError?.("The direct link failed.");
  channel.onmessage = (event) => {
    if (typeof event.data !== "string") {
      if (!head) return; // bytes before a header: not ours, and unreadable
      const bytes = new Uint8Array(event.data as ArrayBuffer);
      parts.push(bytes);
      got += bytes.length;
      handlers.onProgress?.(got, head.bytes);
      return;
    }

    const message = parse(event.data);
    if (!message) return;

    if (message.t === "head") {
      head = message;
      parts = [];
      got = 0;
      handlers.onIncoming?.({
        from: message.from,
        takenAt: message.takenAt,
        bytes: message.bytes,
        keys: message.keys,
      });
      channel.send(JSON.stringify({ t: "go" } satisfies Control));
      return;
    }

    if (message.t === "bad") {
      handlers.onError?.(message.reason);
      return;
    }

    if (message.t !== "end" || !head) return;

    const carried = head;
    head = null;
    void finish(channel, carried, parts, handlers);
    parts = [];
  };
}

/** Reassemble, unpack, verify — then, and only then, hand the clone up. */
async function finish(
  channel: RTCDataChannel,
  head: Head,
  parts: Uint8Array[],
  handlers: CloneLinkHandlers,
): Promise<void> {
  const fail = (reason: string) => {
    handlers.onError?.(reason);
    try {
      channel.send(JSON.stringify({ t: "bad", reason } satisfies Control));
    } catch {
      /* nothing more can be said down a dead channel */
    }
  };

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  if (total !== head.bytes) {
    fail("The clone didn't arrive whole — the link dropped part of it.");
    return;
  }

  const joined = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    joined.set(part, at);
    at += part.length;
  }

  let json: string;
  try {
    json = await inflateText(joined, head.enc);
  } catch {
    fail("The clone couldn't be unpacked.");
    return;
  }
  if (checksum32(json) !== head.checksum) {
    fail("The clone arrived damaged — send it again.");
    return;
  }

  try {
    channel.send(JSON.stringify({ t: "got", keys: head.keys } satisfies Control));
  } catch {
    /* the sender left; the clone is still good and still ours to apply */
  }
  handlers.onClone?.(json);
}

/* -------------------------------- plumbing ----------------------------- */

function parse(data: unknown): Control | null {
  if (typeof data !== "string") return null;
  try {
    const value: unknown = JSON.parse(data);
    return isControl(value) ? value : null;
  } catch {
    return null;
  }
}

/** Back-pressure: filling the buffer without waiting closes the channel. */
function drain(channel: RTCDataChannel, chunk: number): Promise<void> {
  if (channel.bufferedAmount <= chunk * 8) return Promise.resolve();
  return new Promise((resolve) => {
    const onLow = () => {
      channel.removeEventListener("bufferedamountlow", onLow);
      resolve();
    };
    channel.addEventListener("bufferedamountlow", onLow);
  });
}

const timeout = (ms: number, message: string): Promise<never> =>
  new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), ms));

const unreachable = (reach: ReachMode): string =>
  reach === "internet"
    ? "No direct path between these two networks was found. Put both devices on the same network, or use a cable."
    : "No direct path was found. Check both devices really are on the same network — or on the same cable.";

/** Key count straight off the envelope, without parsing the whole document. */
function countKeys(json: string): number {
  try {
    const outer = JSON.parse(json) as { document?: string };
    const inner = JSON.parse(outer.document ?? "{}") as { entries?: Record<string, string> };
    return Object.keys(inner.entries ?? {}).length;
  } catch {
    return 0;
  }
}

function closeBoth(peer: Peer, channel: RTCDataChannel): void {
  try {
    channel.close();
  } finally {
    peer.close();
  }
}

