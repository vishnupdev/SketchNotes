"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acceptFrame, newCollector } from "@/lib/qr/frames";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { CameraIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";
import { BTN } from "@/components/WatchParty/ui";

/**
 * Read a connection code off another screen with the camera.
 *
 * A code is a couple of kilobytes and is often shown as several QR frames in
 * turn (see `CodeExchange`), so frames are collected until the whole code is
 * in; a bare, single code is taken as it is. The camera is released the moment
 * a code is read, the button is pressed again, or this unmounts.
 */
export function CodeScanner({ label, onCode }: { label: string; onCode: (code: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const collectorRef = useRef(newCollector());
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    const video = videoRef.current;
    if (!video) return;
    setNote("");
    collectorRef.current = newCollector();
    setScanning(true);
    const scanner = await startScanner({
      video,
      continuous: true,
      onError: (message) => {
        setNote(message);
        setScanning(false);
      },
      onResult: (text) => {
        void (async () => {
          const result = await acceptFrame(collectorRef.current, text);
          if (result.status === "progress") {
            setNote(`Reading… ${result.received} of ${result.total} parts`);
            return;
          }
          if (result.status === "failed") {
            setNote(result.reason);
            return;
          }
          stop();
          setNote("");
          onCodeRef.current(result.status === "complete" ? result.payload : text);
        })();
      },
    });
    scannerRef.current = scanner;
    if (!scanner) setScanning(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {scanning ? (
        <button type="button" onClick={stop} className={cx(BTN, "self-start")}>
          <StopIcon size={15} />
          Stop camera
        </button>
      ) : (
        <button type="button" onClick={() => void start()} className={cx(BTN, "self-start")}>
          <CameraIcon size={15} />
          {label}
        </button>
      )}
      <div
        className={cx(
          "relative aspect-square w-full max-w-72 overflow-hidden rounded-2xl border border-border bg-paper",
          !scanning && "hidden",
        )}
      >
        <video ref={videoRef} playsInline muted aria-label="Camera preview" className="size-full object-cover" />
      </div>
      {note && (
        <p role="status" className="text-[12px] text-ink-soft">
          {note}
        </p>
      )}
    </div>
  );
}
