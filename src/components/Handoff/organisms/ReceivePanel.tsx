"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyBackup, BackupError, readBackupJson } from "@/lib/backup";
import type { BackupSummary, RestoreMode } from "@/lib/backup/types";
import { acceptFrame, buildFrames, newCollector } from "@/lib/qr/frames";
import { createReceiver, type HandoffLink } from "@/lib/Handoff/webrtc";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { FramePlayer } from "@/components/Handoff/molecules/FramePlayer";
import { APP_MAP } from "@/components/AppCatalog";
import { CameraIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, formatBytes } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const DANGER =
  "inline-flex items-center gap-2 rounded-full border border-danger px-4 py-2.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-40";

interface Arrived {
  entries: Record<string, string>;
  summary: BackupSummary;
}

/**
 * The receiving half: point the camera at the other device and wait.
 *
 * One scanner handles both transports, because the stream says which it is: a
 * chain of data frames is assembled here, while a connection offer is answered
 * with a code of our own and the payload then arrives over the direct link. The
 * user is never asked which mode to be in — they point the camera at whatever is
 * being shown.
 *
 * What arrives is *always* checked before it is written: it must parse as a
 * OneApp document, its keys must be ones this workspace owns, and the user has
 * to choose add-or-replace. A transfer is untrusted input like a file is.
 */
export function ReceivePanel() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [answerFrames, setAnswerFrames] = useState<string[]>([]);
  const [arrived, setArrived] = useState<Arrived | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const linkRef = useRef<HandoffLink | null>(null);
  const collectorRef = useRef(newCollector());

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const cleanup = useCallback(() => {
    stop();
    linkRef.current?.close();
    linkRef.current = null;
  }, [stop]);

  // Leaving the panel or the app ends the camera and any open link.
  useEffect(() => cleanup, [cleanup]);

  /** Validate a received document and show what it holds. */
  const present = useCallback((json: string) => {
    try {
      const { entries, summary } = readBackupJson(json);
      setArrived({ entries, summary });
      setStatus("");
      setError("");
    } catch (e) {
      setError(
        e instanceof BackupError
          ? e.message
          : "What arrived wasn't something this workspace can read.",
      );
    }
  }, []);

  const start = useCallback(async () => {
    setError("");
    setArrived(null);
    setProgress(null);
    setAnswerFrames([]);
    collectorRef.current = newCollector();
    const video = videoRef.current;
    if (!video) return;
    setScanning(true);
    setStatus("Point this at the other device's code.");

    const scanner = await startScanner({
      video,
      continuous: true,
      onError: (message) => {
        setError(message);
        setScanning(false);
      },
      onResult: (text) => {
        void (async () => {
          const result = await acceptFrame(collectorRef.current, text);
          if (result.status === "ignored") return;
          if (result.status === "progress") {
            setProgress({ received: result.received, total: result.total });
            setStatus(`Reading… ${result.received} of ${result.total} parts`);
            return;
          }
          if (result.status === "failed") {
            setError(result.reason);
            setProgress(null);
            return;
          }

          // A complete stream. Data is the payload itself; an offer means the
          // other device wants the fast link, and expects an answer back.
          if (result.kind === "data") {
            stop();
            setProgress(null);
            present(result.payload);
            return;
          }
          if (result.kind === "offer") {
            setStatus("Connection offer received — replying…");
            collectorRef.current = newCollector();
            try {
              const link = await createReceiver(result.payload, {
                onPayload: (payload) => {
                  stop();
                  setAnswerFrames([]);
                  present(payload);
                },
                onError: (message) => setError(message),
              });
              linkRef.current = link;
              setAnswerFrames(await buildFrames(link.description, "answer"));
              setStatus("Show this reply to the other device to open the link.");
            } catch {
              setError("That offer couldn't be answered. Ask the other device to show codes instead.");
            }
          }
        })();
      },
    });
    scannerRef.current = scanner;
    if (!scanner) setScanning(false);
  }, [present, stop]);

  const apply = (mode: RestoreMode) => {
    if (!arrived) return;
    setBusy(true);
    void applyBackup(arrived.entries, mode)
      .then(() => {
        // Apps read their data once at start-up, so a reload is what makes the
        // received data appear everywhere — the same as restoring a backup.
        window.location.reload();
      })
      .catch(() => {
        setBusy(false);
        setError("Saving what arrived didn't finish. Nothing else was changed.");
      });
  };

  return (
    <div className="flex flex-col gap-4">
      {!arrived && (
        <>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-paper">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera preview"
              className={cx("size-full object-cover", scanning ? "" : "hidden")}
            />
            {!scanning && (
              <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <CameraIcon size={26} />
                </span>
                <p className="max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">
                  On the other device, open Handoff → Send, choose what to send, and hold its screen
                  up to this camera. Nothing goes over the internet.
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
              <button type="button" onClick={() => void start()} className={BTN_ACCENT}>
                <CameraIcon size={15} />
                Start camera
              </button>
            )}
          </div>

          {progress && (
            <div
              role="progressbar"
              aria-label="Parts received"
              aria-valuenow={progress.received}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              className="h-1.5 w-full overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${(progress.received / progress.total) * 100}%` }}
              />
            </div>
          )}

          {answerFrames.length > 0 && (
            <FramePlayer
              frames={answerFrames}
              caption="Hold this up to the sending device's camera."
            />
          )}
        </>
      )}

      {status && !arrived && (
        <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {arrived && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
          <div>
            <p className="text-[14px] font-bold">Received</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              {arrived.summary.keys} keys · {formatBytes(arrived.summary.bytes)}
              {arrived.summary.createdAt > 0
                ? ` · sent ${new Date(arrived.summary.createdAt).toLocaleString()}`
                : ""}
            </p>
          </div>

          <ul role="list" className="flex flex-col gap-1">
            {arrived.summary.rows.map((row) => (
              <li
                key={row.app ?? "settings"}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="min-w-0 truncate font-semibold">
                  {row.app ? (APP_MAP[row.app]?.name ?? row.app) : "Workspace settings"}
                </span>
                <span className="flex-none text-ink-soft">{formatBytes(row.bytes)}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply("merge")}
              disabled={busy}
              className={BTN_ACCENT}
            >
              {busy ? "Saving…" : "Add to this device"}
            </button>
            <button
              type="button"
              onClick={() => (confirmReplace ? apply("replace") : setConfirmReplace(true))}
              disabled={busy}
              className={confirmReplace ? DANGER : BTN}
            >
              {confirmReplace ? "Really replace everything" : "Replace everything"}
            </button>
            <button
              type="button"
              onClick={() => {
                setArrived(null);
                setConfirmReplace(false);
              }}
              disabled={busy}
              className={BTN}
            >
              Discard
            </button>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-soft">
            {confirmReplace
              ? "Replacing deletes anything this device has that the transfer doesn't include."
              : "Adding keeps what's already here and overwrites only what arrived. The page reloads when it's done."}
          </p>
        </div>
      )}
    </div>
  );
}
