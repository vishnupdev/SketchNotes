"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { useColorLensStore } from "@/store/useColorLensStore";
import { cameraSupported } from "@/lib/ColorLens/camera";
import { pickFromScreen, screenPickerSupported } from "@/lib/ColorLens/eyedropper";
import { SourcePicker } from "@/components/ColorLens/molecules/SourcePicker";
import { CameraView } from "@/components/ColorLens/molecules/CameraView";
import { PickSurface } from "@/components/ColorLens/molecules/PickSurface";
import {
  CameraIcon,
  EyedropperIcon,
  ImportIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

/** Sample sizes offered, as the radius of the averaged square. */
const SAMPLE_SIZES = [
  { radius: 0, label: "1 px", hint: "Read the exact pixel" },
  { radius: 1, label: "3 × 3", hint: "Average a 3 by 3 block" },
  { radius: 2, label: "5 × 5", hint: "Average a 5 by 5 block" },
] as const;

/**
 * The image half of the app: choose a source, then pick colours off it.
 *
 * Which controls are shown depends on what the browser can actually do — the
 * in-app viewfinder only when getUserMedia exists (otherwise "Take a photo"
 * hands off to the device camera app), and the screen eyedropper only where the
 * EyeDropper API is implemented. Nothing is offered that would then fail.
 */
export function ImageStage() {
  const imageUrl = useColorLensStore((s) => s.imageUrl);
  const imageSource = useColorLensStore((s) => s.imageSource);
  const imageName = useColorLensStore((s) => s.imageName);
  const imageSize = useColorLensStore((s) => s.imageSize);
  const error = useColorLensStore((s) => s.error);
  const setImage = useColorLensStore((s) => s.setImage);
  const clearImage = useColorLensStore((s) => s.clearImage);
  const analyze = useColorLensStore((s) => s.analyze);
  const pick = useColorLensStore((s) => s.pick);
  const setError = useColorLensStore((s) => s.setError);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [sampleRadius, setSampleRadius] = useState(0);
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [canPickScreen, setCanPickScreen] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  // Capability checks touch `window`, so they run after mount — rendering the
  // same markup on the server and the first client pass.
  useEffect(() => {
    setCanUseCamera(cameraSupported());
    setCanPickScreen(screenPickerSupported());
  }, []);

  const onFile = useCallback(
    (file: File) => {
      setCameraOpen(false);
      setImage(URL.createObjectURL(file), "file", file.name);
    },
    [setImage],
  );

  // Paste is bound to the document rather than a field: someone who has just
  // copied a screenshot expects Ctrl/⌘+V to work without first finding
  // somewhere to put the caret. Bound here, not in the empty state, so it also
  // replaces an image that's already loaded. The app is unmounted when another
  // app is on screen, so this never listens for anyone else.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) onFile(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onFile]);

  const onCapture = useCallback(
    (dataUrl: string) => {
      setCameraOpen(false);
      setImage(dataUrl, "camera", null);
    },
    [setImage],
  );

  async function onScreenPick() {
    const hex = await pickFromScreen();
    if (hex) pick(hex);
  }

  if (cameraOpen) {
    return <CameraView onCapture={onCapture} onCancel={() => setCameraOpen(false)} />;
  }

  if (!imageUrl) {
    return (
      <div className="flex flex-col gap-3">
        <SourcePicker onFile={onFile} onCamera={canUseCamera ? () => setCameraOpen(true) : null} />
        {canPickScreen && (
          <button
            type="button"
            onClick={onScreenPick}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2 text-[13px] font-semibold text-text hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <EyedropperIcon size={15} />
            Or pick a colour from anywhere on screen
          </button>
        )}
        {error && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PickSurface
        imageUrl={imageUrl}
        sampleRadius={sampleRadius}
        onAnalyzed={analyze}
        onPick={pick}
        onError={setError}
      />

      {error && (
        <p role="alert" className="text-center text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-panel px-3.5 py-3">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Sample size</legend>
          <span aria-hidden className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Sample
          </span>
          <div className="flex gap-1">
            {SAMPLE_SIZES.map((size) => (
              <button
                key={size.radius}
                type="button"
                onClick={() => setSampleRadius(size.radius)}
                aria-pressed={sampleRadius === size.radius}
                title={size.hint}
                className={cx(
                  "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  sampleRadius === size.radius
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-paper text-ink-soft hover:border-accent hover:text-text",
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {canPickScreen && (
            <button
              type="button"
              onClick={onScreenPick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <EyedropperIcon size={14} />
              From screen
            </button>
          )}
          {canUseCamera && (
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CameraIcon size={14} />
              {imageSource === "camera" ? "Retake" : "Camera"}
            </button>
          )}
          <button
            type="button"
            onClick={() => replaceRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ImportIcon size={14} />
            Replace
          </button>
          <button
            type="button"
            onClick={clearImage}
            aria-label="Remove the image"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <TrashSmallIcon size={14} />
            Remove
          </button>
        </div>
      </div>

      <p className="text-center font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        {imageName ?? (imageSource === "camera" ? "Camera capture" : "Image")}
        {imageSize && ` · ${imageSize.w} × ${imageSize.h}`} · never uploaded
      </p>

      {/* Hidden rather than sr-only — the "Replace" button is the labelled
          control; exposing the input too would duplicate it for screen readers. */}
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = Array.from(e.target.files ?? []).find((f) => f.type.startsWith("image/"));
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
