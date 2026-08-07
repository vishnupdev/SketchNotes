"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_MESSAGES,
  captureFrame,
  classifyError,
  closeCamera,
  openCamera,
  type Facing,
} from "@/lib/ColorLens/camera";
import { CameraFlipIcon, CameraIcon, CloseIcon } from "@/components/SketchNotes/atoms/icons";

interface CameraViewProps {
  /** Receives the captured still as a data URL. */
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * In-app viewfinder. The stream is attached to a local <video> and the captured
 * frame is drawn to a canvas in this page — nothing is sent anywhere. Tracks are
 * stopped on capture, on cancel and on unmount, so the camera indicator never
 * stays lit after the user has moved on.
 */
export function CameraView({ onCapture, onCancel }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    closeCamera(streamRef.current);
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    void (async () => {
      try {
        const stream = await openCamera(facing);
        // The effect may have been torn down (or the camera flipped again)
        // while permission was pending — release this stream if so.
        if (cancelled) {
          closeCamera(stream);
          return;
        }
        stop();
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          if (!cancelled) setReady(true);
        }
      } catch (err) {
        if (!cancelled) setError(CAMERA_MESSAGES[classifyError(err)]);
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    const shot = captureFrame(video);
    if (!shot) {
      setError("The camera hasn't produced a frame yet. Give it a moment and try again.");
      return;
    }
    stop();
    onCapture(shot);
  }

  function cancel() {
    stop();
    onCancel();
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-6 text-center">
        <p className="mx-auto max-w-[420px] text-[13.5px] leading-relaxed text-text">{error}</p>
        <button
          type="button"
          onClick={cancel}
          className="mt-4 rounded-full border border-border bg-paper px-5 py-2.5 text-[13.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-panel">
      <div className="relative bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          // The front camera is mirrored so the preview matches what a person
          // expects to see of themselves; the rear camera is not.
          className="block max-h-[58vh] w-full object-contain"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />
        {!ready && (
          <p className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-[.14em] text-white/80">
            Starting camera…
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={cancel}
          aria-label="Close the camera"
          className="grid size-11 place-items-center rounded-full border border-border bg-paper text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CloseIcon size={18} />
        </button>

        <button
          type="button"
          onClick={shoot}
          disabled={!ready}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <CameraIcon size={18} />
          Capture
        </button>

        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label={facing === "environment" ? "Switch to the front camera" : "Switch to the rear camera"}
          className="grid size-11 place-items-center rounded-full border border-border bg-paper text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CameraFlipIcon size={18} />
        </button>
      </div>
    </div>
  );
}
