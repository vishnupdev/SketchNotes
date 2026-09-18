"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDetectStore } from "@/store/useDetectStore";
import { DetectionCanvas } from "@/components/Detect/molecules/DetectionCanvas";
import { DetectionList } from "@/components/Detect/molecules/DetectionList";
import { DetectSettings } from "@/components/Detect/molecules/DetectSettings";
import { reconcile, type Detection, type TrackedDetection } from "@/lib/Detect/detections";
import { composeSnapshot, type BoxPalette } from "@/lib/Detect/draw";
import { cx } from "@/lib/utils";
import {
  DownloadIcon,
  ImportIcon,
  TargetIcon,
  TrashIcon,
} from "@/components/SketchNotes/atoms/icons";

interface Picture {
  name: string;
  url: string;
  width: number;
  height: number;
}

/**
 * Detection in a photo you already have.
 *
 * Not a lesser version of the live view — the tab that makes the app work at
 * all for a desktop with no webcam, a browser that refuses camera permission,
 * and the far commoner case of wanting to know what is in a picture that was
 * taken hours ago. It is also where the Accurate model belongs: a still has all
 * the time in the world, so the slow model costs nothing but the wait.
 *
 * The picture is read with an object URL and never uploaded, and the URL is
 * revoked the moment another picture replaces it or the tab is left.
 */
export function PicturePanel() {
  const model = useDetectStore((s) => s.model);
  const minScore = useDetectStore((s) => s.minScore);
  const showScores = useDetectStore((s) => s.showScores);
  const record = useDetectStore((s) => s.record);

  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trackedRef = useRef<TrackedDetection[]>([]);

  const [picture, setPicture] = useState<Picture | null>(null);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  // One place revokes the object URL, and it runs on replacement and on unmount
  // alike. A leaked URL pins the whole decoded bitmap in memory.
  useEffect(() => {
    if (!picture) return;
    return () => URL.revokeObjectURL(picture.url);
  }, [picture]);

  const open = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("That is not a picture. Open a JPEG, PNG, WebP, GIF or AVIF.");
      return;
    }
    setError(null);
    setDetections(null);
    trackedRef.current = [];

    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      setPicture({ name: file.name, url, width: probe.naturalWidth, height: probe.naturalHeight });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That picture could not be opened — it may be damaged or in a format this browser can't read.");
    };
    probe.src = url;
  }, []);

  const run = useCallback(async () => {
    const image = imageRef.current;
    if (!image || !picture) return;

    setBusy(true);
    setError(null);
    try {
      // The element may still be decoding when the button is pressed; handing a
      // half-decoded image to the model gives an empty result rather than an
      // error, which would read as "nothing in this picture".
      await image.decode().catch(() => {});

      const { detect } = await import("@/lib/Detect/engine");
      const found = await detect(image, model, { minScore, maxBoxes: 40 });

      trackedRef.current = reconcile([], found);
      setDetections(found);
      setRevision((n) => n + 1);
      record(found);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The detector could not be loaded.");
    } finally {
      setBusy(false);
      setNote(null);
    }
  }, [picture, model, minScore, record]);

  const close = useCallback(() => {
    setPicture(null);
    setDetections(null);
    trackedRef.current = [];
    setError(null);
  }, []);

  const save = useCallback(() => {
    const image = imageRef.current;
    const stage = stageRef.current;
    if (!image || !picture) return;

    const styles = getComputedStyle(stage ?? image);
    const palette: BoxPalette = {
      box: styles.getPropertyValue("--detect-box").trim(),
      held: styles.getPropertyValue("--detect-box-held").trim(),
      ink: styles.getPropertyValue("--detect-box-ink").trim(),
    };

    const canvas = composeSnapshot(
      image,
      { width: picture.width, height: picture.height },
      trackedRef.current,
      palette,
      { showScores },
    );
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${picture.name.replace(/\.[^.]+$/, "")}-detected.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [picture, showScores]);

  const getDetections = useCallback(() => trackedRef.current, []);

  if (!picture) {
    return (
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            const file = event.dataTransfer.files[0];
            if (file) open(file);
          }}
          onPaste={(event) => {
            const file = event.clipboardData.files[0];
            if (file) open(file);
          }}
          className={cx(
            "flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed p-8 text-center",
            over ? "border-accent bg-accent-soft" : "border-border bg-panel",
          )}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <TargetIcon size={26} />
          </span>

          <div>
            <p className="text-[15px] font-extrabold">Find the objects in a picture</p>
            <p className="mx-auto mt-1 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-soft">
              A photo, a screenshot, a frame from a video. It is read on this device and never
              uploaded — and this tab needs no camera at all.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="hover-glow inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent"
          >
            <ImportIcon size={15} />
            Choose a picture
          </button>

          <p className="text-[11.5px] text-ink-soft">…or drop one here, or paste one.</p>

          {error && (
            <p role="alert" className="max-w-[46ch] text-[12.5px] font-semibold text-danger">
              {error}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) open(file);
              event.target.value = "";
            }}
            className="hidden"
          />
        </div>

        <DetectSettings idPrefix="detect-picture" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-soft" title={picture.name}>
          {picture.name} · {picture.width}×{picture.height}
        </p>
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
        >
          <TrashIcon size={14} />
          Close
        </button>
      </div>

      <div ref={stageRef} className="relative overflow-hidden rounded-[18px] border border-border bg-ink">
        {/* A plain <img>, not next/image: the source is an object URL for a file
            the user just picked, which the optimiser can neither fetch nor size.
            Width and height are the picture's own, so the box is reserved
            before it paints and nothing shifts (rule #7). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={picture.url}
          alt={
            detections
              ? `The picture you opened, with ${detections.length} detected objects outlined`
              : "The picture you opened"
          }
          width={picture.width}
          height={picture.height}
          className="block max-h-[56vh] w-full object-contain"
        />
        {detections && (
          <DetectionCanvas
            sourceSize={{ width: picture.width, height: picture.height }}
            getDetections={getDetections}
            live={false}
            revision={revision}
            showScores={showScores}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="hover-glow inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-bold text-on-accent disabled:opacity-45"
        >
          <TargetIcon size={16} />
          {busy ? (note ?? "Looking…") : detections ? "Look again" : "Find the objects"}
        </button>

        <button
          type="button"
          onClick={save}
          disabled={!detections?.length}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-semibold hover:border-accent hover:text-accent disabled:opacity-45"
        >
          <DownloadIcon size={15} />
          Save with the boxes
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold leading-relaxed text-danger">
          {error}
        </p>
      )}

      {detections && (
        <DetectionList
          detections={detections}
          emptyNote="Nothing recognised. It may be something outside the eighty things this model knows — the Seen tab lists them — or the confidence below may be set too high."
        />
      )}

      <DetectSettings idPrefix="detect-picture" locked={busy} />
    </div>
  );
}
