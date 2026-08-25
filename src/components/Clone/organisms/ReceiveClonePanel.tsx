"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearInviteFromLocation,
  decodeCode,
  encodeCode,
  inviteFromLocation,
  CodeError,
} from "@/lib/rtc/code";
import { acceptFrame, newCollector } from "@/lib/qr/frames";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { cloneLinkSupported, createCloneReceiver, type CloneLink } from "@/lib/Clone/link";
import { readCloneFile } from "@/lib/Clone/drive";
import { CloneError } from "@/lib/Clone/snapshot";
import { reachFor, ROUTE_MAP, TRANSPORTS } from "@/lib/Clone/routes";
import type { CloneStage, CloneTransport } from "@/lib/Clone/types";
import { useCloneStore } from "@/store/useCloneStore";
import { RoutePicker } from "@/components/Clone/molecules/RoutePicker";
import { CodeOut } from "@/components/Clone/molecules/CodeOut";
import { CodeIn } from "@/components/Clone/molecules/CodeIn";
import { MoveProgress } from "@/components/Clone/molecules/MoveProgress";
import { ArrivalPanel } from "@/components/Clone/organisms/ArrivalPanel";
import { DriveIcon, LinkIcon, QrIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

const TRANSPORT_ICON: Record<CloneTransport, React.ReactNode> = {
  link: <LinkIcon size={16} />,
  drive: <DriveIcon size={16} />,
  codes: <QrIcon size={16} />,
};

/**
 * Cloning *onto* this device.
 *
 * Three ways in, one destination: whatever carried the clone, it ends up in
 * {@link ArrivalPanel}, which validates it and shows what applying it would
 * change before anything is written. That split is the point — the dangerous
 * part of cloning has nothing to do with the transport, so the transport code
 * never gets to write anything.
 *
 * An invite in the URL is adopted on arrival. A link sent from the other device
 * carries the connection code after the `#`, which browsers never send to a
 * server, so opening it here is enough to be introduced — and the fragment is
 * cleared once taken, so a reload doesn't try to reconnect to a dead offer.
 */
export function ReceiveClonePanel() {
  const route = useCloneStore((s) => s.route);
  const setRoute = useCloneStore((s) => s.setRoute);
  const wide = useCloneStore((s) => s.wide);
  const setWide = useCloneStore((s) => s.setWide);

  const [transport, setTransport] = useState<CloneTransport | null>(null);
  const [stage, setStage] = useState<CloneStage>("idle");
  const [myCode, setMyCode] = useState("");
  const [arrived, setArrived] = useState("");
  const [moved, setMoved] = useState(0);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const linkRef = useRef<CloneLink | null>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const collectorRef = useRef(newCollector());
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const cleanup = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    linkRef.current?.close();
    linkRef.current = null;
  }, []);

  // No camera and no open connection survives this panel.
  useEffect(() => cleanup, [cleanup]);

  const reset = () => {
    cleanup();
    setTransport(null);
    setStage("idle");
    setMyCode("");
    setArrived("");
    setMoved(0);
    setTotal(0);
    setNote("");
    setScanning(false);
    setBusy(false);
    setError("");
  };

  /* --------------------------- the direct link -------------------------- */

  const takeOffer = useCallback(
    async (raw: string) => {
      setBusy(true);
      setError("");
      try {
        const offer = await decodeCode(raw);
        setStage("connecting");
        const link = await createCloneReceiver(offer, reachFor(route, wide), {
          onIncoming: (head) => {
            setStage("moving");
            setTotal(head.bytes);
            setNote(`From ${head.from.label}.`);
          },
          onProgress: (m, t) => {
            setMoved(m);
            setTotal(t);
          },
          onClone: (json) => {
            setStage("arrived");
            setArrived(json);
          },
          onError: (message) => {
            setError(message);
            setStage("failed");
          },
        });
        linkRef.current = link;
        setMyCode(await encodeCode(link.description));
        setStage("pairing");
      } catch (e) {
        setError(
          e instanceof CodeError ? e.message : "That code couldn't be used to open a connection.",
        );
        setStage("failed");
      } finally {
        setBusy(false);
      }
    },
    [route, wide],
  );

  // A link opened from the other device: take the invite, then clean the URL.
  useEffect(() => {
    const invite = inviteFromLocation();
    if (!invite) return;
    clearInviteFromLocation();
    setTransport("link");
    void takeOffer(invite);
  }, [takeOffer]);

  /* ------------------------------- a file ------------------------------- */

  const openFile = async (file: File | Blob) => {
    setTransport("drive");
    setBusy(true);
    setError("");
    try {
      setArrived(await readCloneFile(file));
      setStage("arrived");
    } catch (e) {
      setError(e instanceof CloneError ? e.message : "That file couldn't be read.");
      setStage("failed");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- the codes ---------------------------- */

  const stopScan = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const startCodes = async () => {
    setTransport("codes");
    setError("");
    setStage("moving");
    setNote("");
    collectorRef.current = newCollector();
    setScanning(true);

    // Wait a tick so the <video> exists before a stream is attached to it.
    await Promise.resolve();
    const video = videoRef.current;
    if (!video) {
      setScanning(false);
      return;
    }

    scannerRef.current = await startScanner({
      video,
      continuous: true,
      onError: (message) => {
        setError(message);
        setScanning(false);
        setStage("failed");
      },
      onResult: (text) => {
        void (async () => {
          const result = await acceptFrame(collectorRef.current, text);
          if (result.status === "progress") {
            setMoved(result.received);
            setTotal(result.total);
            setNote(`${result.received} of ${result.total} parts read.`);
            return;
          }
          if (result.status === "failed") {
            setError(result.reason);
            return;
          }
          if (result.status !== "complete" || result.kind !== "data") return;

          stopScan();
          setArrived(result.payload);
          setStage("arrived");
        })();
      },
    });
  };

  /* --------------------------------- views ------------------------------ */

  if (arrived) {
    return (
      <ArrivalPanel
        text={arrived}
        route={route}
        onApplied={(receipt) => linkRef.current?.report(receipt)}
        onDiscard={reset}
      />
    );
  }

  if (transport === null) {
    const info = ROUTE_MAP[route];
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Take another device&apos;s whole workspace onto this one. You&apos;ll see exactly what it
          holds and what it would change here before anything is written.
        </p>

        <RoutePicker route={route} onRoute={setRoute} wide={wide} onWide={setWide} />

        <div className="flex flex-col gap-2">
          {info.transports.map((id) => {
            const t = TRANSPORTS[id];
            const disabled = id === "link" && !cloneLinkSupported();
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (id === "link") setTransport("link");
                  else if (id === "drive") fileRef.current?.click();
                  else void startCodes();
                }}
                className="flex items-start gap-3 rounded-xl border border-border bg-panel p-3 text-left transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                <span aria-hidden className="mt-0.5 flex-none text-accent">
                  {TRANSPORT_ICON[id]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">
                    {id === "drive" ? "From a clone file" : t.label}
                    {disabled && " — not available in this browser"}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
                    {id === "drive"
                      ? "Pick the clone written by the other device — off a USB drive, a memory card or anywhere else."
                      : id === "codes"
                        ? "Point this device's camera at the codes the other one is showing."
                        : t.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Drop target as well as a button: on a desktop, dragging the file off
            the drive is the shortest path there is. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void openFile(file);
          }}
          className={cx(
            "rounded-xl border border-dashed p-4 text-center text-[12px] transition-colors",
            dragging ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-soft",
          )}
        >
          …or drop a clone file here.
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="sr-only"
          aria-label="Clone file to read"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so the same file can be picked twice
            if (file) void openFile(file);
          }}
        />

        {error && (
          <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={reset} className={cx(BTN, "self-start")}>
        ← Choose another route
      </button>

      {transport === "link" && (
        <>
          {!myCode && (
            <CodeIn
              title="Take the other device's code"
              hint="Open Clone → Send there, then scan the code it shows or paste it in here."
              label="Open the connection"
              busy={busy}
              onCode={(code) => void takeOffer(code)}
            />
          )}

          {myCode && stage !== "arrived" && (
            <CodeOut
              code={myCode}
              kind="answer"
              qrFirst
              title="Now show this back"
              hint="The other device reads this reply, and then sends the clone. Hold it up to its camera, or copy it across."
            />
          )}

          <MoveProgress stage={stage} moved={moved} total={total} note={note} />
        </>
      )}

      {transport === "codes" && (
        <>
          <div className="relative mx-auto aspect-video w-full max-w-88 overflow-hidden rounded-xl border border-border bg-ed-bg">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera, reading the clone from the other device's screen"
              className="size-full object-cover"
            />
          </div>

          {scanning ? (
            <button type="button" onClick={stopScan} className={cx(BTN, "self-start")}>
              <StopIcon size={15} />
              Stop the camera
            </button>
          ) : (
            <button type="button" onClick={() => void startCodes()} className={cx(BTN, "self-start")}>
              Start the camera again
            </button>
          )}

          <MoveProgress stage={stage} moved={moved} total={total} note={note} />
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Keep the camera on the other screen until every part has been read. Parts can arrive in
            any order, so a missed one simply comes round again.
          </p>
        </>
      )}

      {transport === "drive" && busy && (
        <p role="status" className="text-[12.5px] text-ink-soft">
          Reading the clone file…
        </p>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
