"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQrFilesStore } from "@/store/useQrFilesStore";
import {
  acceptFileFrame,
  FILE_CLASS_LABEL,
  missingParts,
  newFileCollector,
  type RebuiltFile,
} from "@/lib/qr/file-frames";
import { decodeImageFile } from "@/lib/qr/decode";
import { startScanner, type Scanner } from "@/lib/qr/scanner";
import { saveBlob } from "@/lib/download";
import { safeFileName } from "@/lib/QrFiles/files";
import { FileTile } from "@/components/QrFiles/molecules/FileTile";
import {
  CameraIcon,
  DownloadIcon,
  ImportIcon,
  StopIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
const BTN_ACCENT =
  "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

interface Progress {
  received: number;
  total: number;
  what: string;
  missing: number[];
}

/**
 * The return direction: codes back into the file they came from.
 *
 * Two ways in, because the codes might be on a screen a foot away or on a sheet
 * of paper photographed last week. The camera reads a playing loop; the picture
 * route reads one still at a time, which is what a printed sheet actually
 * produces — and needs no camera permission at all.
 *
 * Nothing is written to disk until the whole set has arrived *and* its checksum
 * matches. A file rebuilt from a misread code would open, look plausible and be
 * quietly wrong, which is the one outcome worth engineering against.
 */
export function RebuildPanel() {
  const remember = useQrFilesStore((s) => s.remember);

  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [file, setFile] = useState<RebuiltFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  /**
   * The preview wouldn't play or draw. Not a transfer failure — the bytes
   * verified — so it says exactly that rather than leaving a broken-image icon
   * to imply the file arrived damaged.
   */
  const [previewFailed, setPreviewFailed] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pictureRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const collectorRef = useRef(newFileCollector());

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }, []);

  // Leaving the panel or the app releases the camera and the preview's blob.
  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  /** One scanned line, from whichever route found it. */
  const feed = useCallback(
    async (text: string) => {
      const result = await acceptFileFrame(collectorRef.current, text);
      if (result.status === "ignored") return "ignored" as const;

      if (result.status === "progress") {
        setProgress({
          received: result.received,
          total: result.total,
          what: FILE_CLASS_LABEL[result.fileClass].toLowerCase(),
          missing: missingParts(collectorRef.current),
        });
        setError("");
        return "progress" as const;
      }

      if (result.status === "failed") {
        setProgress(null);
        setError(result.reason);
        collectorRef.current = newFileCollector();
        return "failed" as const;
      }

      stop();
      setProgress(null);
      setStatus("");
      setError("");
      setFile(result.file);
      setPreviewFailed(false);
      setPreview(
        URL.createObjectURL(
          new Blob([result.file.bytes as BlobPart], {
            type: result.file.mime || "application/octet-stream",
          }),
        ),
      );
      remember({
        name: result.file.name,
        mime: result.file.mime,
        fileClass: result.file.fileClass,
        size: result.file.bytes.length,
        parts: collectorRef.current.total,
        origin: "rebuilt",
      });
      collectorRef.current = newFileCollector();
      return "complete" as const;
    },
    [remember, stop],
  );

  const start = useCallback(async () => {
    setError("");
    setFile(null);
    setPreview(null);
    setPreviewFailed(false);
    setProgress(null);
    collectorRef.current = newFileCollector();
    const video = videoRef.current;
    if (!video) return;

    setScanning(true);
    setStatus("Point this at the codes. They can be read in any order.");

    const scanner = await startScanner({
      video,
      continuous: true,
      onError: (message) => {
        setError(message);
        setScanning(false);
      },
      onResult: (text) => void feed(text),
    });
    scannerRef.current = scanner;
    if (!scanner) setScanning(false);
  }, [feed]);

  /** A photo or screenshot of one code — the printed-sheet route. */
  const readPicture = async (picture: File) => {
    setReading(true);
    setError("");
    try {
      const text = await decodeImageFile(picture);
      if (!text) {
        setError("No code was found in that picture. One code per picture — crop in if it helps.");
        return;
      }
      const outcome = await feed(text);
      if (outcome === "ignored") {
        setError(
          "That is a QR code, but not one of this app's file codes. QR Codes → Scan reads ordinary codes.",
        );
      }
    } catch {
      setError("That picture couldn't be read.");
    } finally {
      setReading(false);
    }
  };

  const save = () => {
    if (!file) return;
    saveBlob(
      new Blob([file.bytes as BlobPart], { type: file.mime || "application/octet-stream" }),
      safeFileName(file.name),
    );
  };

  const again = () => {
    setFile(null);
    setPreview(null);
    setPreviewFailed(false);
    setProgress(null);
    setError("");
    collectorRef.current = newFileCollector();
  };

  return (
    <div className="flex flex-col gap-4">
      {!file && (
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
                <p className="max-w-[42ch] text-[13px] leading-relaxed text-ink-soft">
                  On the device holding the file, open QR Files → Encode and play the loop. Point
                  this camera at it, or at a printed sheet, until every code has been read.
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
            <button
              type="button"
              onClick={() => pictureRef.current?.click()}
              disabled={reading}
              className={BTN}
            >
              <ImportIcon size={15} />
              {reading ? "Reading…" : "Add a picture of a code"}
            </button>
            <input
              ref={pictureRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Picture of a code"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) void readPicture(picked);
                e.target.value = "";
              }}
            />
          </div>

          {progress && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-panel p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold">
                  Reading a {progress.what} — {progress.received} of {progress.total} codes
                </p>
                <span className="font-mono text-[11px] text-ink-soft">
                  {Math.round((progress.received / progress.total) * 100)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Codes read"
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
              {/* With a sheet in front of you, the numbers still missing are an
                  instruction; "83 of 85" is only a mood. */}
              {progress.missing.length > 0 && progress.received > progress.total / 2 && (
                <p className="text-[12px] leading-relaxed text-ink-soft">
                  Still need {progress.missing.join(", ")}
                  {progress.total - progress.received > progress.missing.length ? " and more" : ""}.
                </p>
              )}
            </div>
          )}

          {status && !progress && (
            <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
              {status}
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {file && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
          <p className="text-[14px] font-bold">Rebuilt, and it verified</p>

          <FileTile
            name={file.name}
            mime={file.mime}
            size={file.bytes.length}
            fileClass={file.fileClass}
            note="Every code arrived and the checksum matched, so this is byte-for-byte the file that was encoded."
          />

          {preview && !previewFailed && file.fileClass === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={`Rebuilt picture: ${file.name}`}
              onError={() => setPreviewFailed(true)}
              className="max-h-80 w-full rounded-xl border border-border object-contain"
            />
          )}
          {preview && !previewFailed && file.fileClass === "audio" && (
            <audio src={preview} controls onError={() => setPreviewFailed(true)} className="w-full">
              <track kind="captions" />
            </audio>
          )}
          {preview && !previewFailed && file.fileClass === "video" && (
            <video
              src={preview}
              controls
              playsInline
              onError={() => setPreviewFailed(true)}
              className="max-h-80 w-full rounded-xl border border-border bg-paper"
            >
              <track kind="captions" />
            </video>
          )}

          {previewFailed && (
            <p className="text-[12px] leading-relaxed text-ink-soft">
              This browser can&rsquo;t play or draw that format, so there is no preview — the
              transfer itself still verified. Save it and open it in something that reads this
              kind of file.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} className={BTN_ACCENT}>
              <DownloadIcon size={15} />
              Save the file
            </button>
            <button type="button" onClick={again} className={BTN}>
              Read another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
