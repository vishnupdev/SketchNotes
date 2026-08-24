"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQrStore } from "@/store/useQrStore";
import { decodeImageFile } from "@/lib/qr/decode";
import { hasMultipleCameras, startScanner, type Scanner } from "@/lib/qr/scanner";
import { ScanResult } from "@/components/QrTool/molecules/ScanResult";
import { CameraFlipIcon, CameraIcon, ImportIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

/**
 * Read a code: with the camera, or out of a picture that already has one.
 *
 * Both routes matter. The camera is the obvious one, but a QR code is just as
 * often *on* the screen you are looking at — in a screenshot, an email, a PDF —
 * and on a laptop there is no second device to point at it with. So a file, a
 * drop and a paste all decode too, with no camera permission involved at all.
 *
 * The camera is released the moment scanning stops, the panel unmounts, or the
 * app is switched (the workspace unmounts an app it isn't showing). A scanner
 * that outlives the screen it belongs to is the one bug this app must not have.
 */
export function ScanPanel() {
  const remember = useQrStore((s) => s.remember);
  const [scanning, setScanning] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [flip, setFlip] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hasMultipleCameras().then(setFlip);
  }, []);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  // Whatever ends this panel's life also ends the camera's.
  useEffect(() => stop, [stop]);

  const start = useCallback(
    async (which: "environment" | "user" = facing) => {
      setError("");
      setResult(null);
      stop();
      const video = videoRef.current;
      if (!video) return;
      setScanning(true);
      const scanner = await startScanner({
        video,
        facing: which,
        onResult: (text) => {
          setResult(text);
          remember(text, "scanned");
          setScanning(false);
          scannerRef.current = null;
        },
        onError: (message) => {
          setError(message);
          setScanning(false);
        },
      });
      scannerRef.current = scanner;
      if (!scanner) setScanning(false);
    },
    [facing, remember, stop],
  );

  const flipCamera = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (scanning) void start(next);
  };

  const readFile = useCallback(
    async (file: File) => {
      setError("");
      setResult(null);
      setBusy(true);
      try {
        const text = await decodeImageFile(file);
        if (text) {
          setResult(text);
          remember(text, "scanned");
        } else {
          setError("No QR code was found in that image.");
        }
      } catch {
        setError("That image couldn't be read.");
      } finally {
        setBusy(false);
      }
    },
    [remember],
  );

  // A code pasted as an image — a screenshot, straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])]
        .find((i) => i.kind === "file" && i.type.startsWith("image/"))
        ?.getAsFile();
      if (file) void readFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [readFile]);

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        className={cx(
          "relative aspect-square w-full overflow-hidden rounded-2xl border bg-paper",
          dragOver ? "border-accent ring-2 ring-accent" : "border-border",
        )}
      >
        {/* Always in the DOM: the scanner attaches the stream to this element,
            and a video that only exists while scanning would have to be found
            after the stream is already open. */}
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera preview"
          className={cx("size-full object-cover", scanning ? "" : "hidden")}
        />

        {scanning && (
          /* Aiming frame. Purely decorative — the decoder samples the middle
             square of the frame, which is what this marks out. */
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="size-[62%] rounded-2xl border-2 border-on-accent/80 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
          </div>
        )}

        {!scanning && (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <CameraIcon size={26} />
            </span>
            <p className="max-w-[38ch] text-[13px] leading-relaxed text-ink-soft">
              Point the camera at a code, or drop, paste or choose a picture that has one in it.
              Everything is decoded on this device.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {scanning ? (
          <button type="button" onClick={stop} className={BTN_ACCENT}>
            <StopIcon size={15} />
            Stop camera
          </button>
        ) : (
          <button type="button" onClick={() => void start()} className={BTN_ACCENT} disabled={busy}>
            <CameraIcon size={15} />
            Start camera
          </button>
        )}
        {flip && (
          <button type="button" onClick={flipCamera} className={BTN}>
            <CameraFlipIcon size={15} />
            {facing === "environment" ? "Front camera" : "Rear camera"}
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className={BTN} disabled={busy}>
          <ImportIcon size={15} />
          {busy ? "Reading…" : "From a picture"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose a picture containing a QR code"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void readFile(file);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {result !== null && <ScanResult text={result} onClear={() => setResult(null)} />}
    </div>
  );
}
