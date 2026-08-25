"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acceptFrame, newCollector } from "@/lib/qr/frames";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { cx } from "@/lib/utils";
import { CameraIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/**
 * Taking the other device's half of the introduction.
 *
 * Two ways in, and both are always offered: a camera, for when the other device
 * is in the room, and a paste box, for everything else. Neither is the "real"
 * one — a laptop with no camera is as ordinary as a phone with no keyboard, and
 * a route that works on one device and not the other is not a route.
 *
 * The camera path reads the same chunked frame stream the sending side plays,
 * so a code too long for one QR still arrives; parts may be read in any order
 * and any number of times, and the collector reports how many are still
 * missing. Nothing is submitted automatically from the paste box: a half-copied
 * code should fail with "that code is incomplete", which is the reader's job,
 * not a guess made while someone is still pasting.
 */
export function CodeIn({
  title,
  hint,
  label,
  busy,
  onCode,
}: {
  title: string;
  hint: string;
  /** Verb for the submit button — "Connect", "Start the clone". */
  label: string;
  busy?: boolean;
  /** Fires with a complete code, from either route. */
  onCode: (code: string) => void;
}) {
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const collectorRef = useRef(newCollector());

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  // The camera must never outlive this panel — leaving the tab, switching apps
  // or finishing the clone all unmount it, and all three must release it.
  useEffect(() => stop, [stop]);

  const scan = async () => {
    setError("");
    setStatus("");
    collectorRef.current = newCollector();
    setScanning(true);

    // Wait a frame so the <video> element exists before the stream is attached.
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
      },
      onResult: (scanned) => {
        void (async () => {
          const result = await acceptFrame(collectorRef.current, scanned);
          if (result.status === "progress") {
            setStatus(`Reading… ${result.received} of ${result.total} parts`);
            return;
          }
          if (result.status === "failed") {
            setError(result.reason);
            return;
          }
          if (result.status !== "complete") return;

          stop();
          setStatus("");
          onCode(result.payload);
        })();
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-3.5">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{hint}</p>
      </div>

      {scanning ? (
        <>
          <div className="relative mx-auto aspect-video w-full max-w-88 overflow-hidden rounded-xl border border-border bg-ed-bg">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera, reading the other device's code"
              className="size-full object-cover"
            />
          </div>
          <button type="button" onClick={stop} className={cx(BTN, "self-start")}>
            <StopIcon size={15} />
            Stop the camera
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void scan()} className={cx(BTN, "self-start")}>
          <CameraIcon size={15} />
          Scan it with the camera
        </button>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Or paste the code
        </span>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="OAD1.… or https://…/clone#i=…"
          aria-label="Code from the other device"
          className="w-full resize-y rounded-[9px] border-[1.5px] border-border bg-panel px-2.5 py-2 font-mono text-[11.5px] wrap-anywhere text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </label>

      <button
        type="button"
        onClick={() => onCode(text)}
        disabled={busy || text.trim().length === 0}
        className={cx(BTN_ACCENT, "self-start")}
      >
        {busy ? "Working…" : label}
      </button>

      {status && (
        <p role="status" className="text-[12.5px] text-ink-soft">
          {status}
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
