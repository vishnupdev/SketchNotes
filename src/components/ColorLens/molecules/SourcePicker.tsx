"use client";

import { useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { CameraIcon, EyedropperIcon, ImportIcon } from "@/components/SketchNotes/atoms/icons";

interface SourcePickerProps {
  onFile: (file: File) => void;
  /** Open the in-app viewfinder. Absent when this browser has no camera API. */
  onCamera: (() => void) | null;
}

/**
 * The empty state: attach an image, take a photo, or drop a file. (Pasting is
 * handled a level up, so it works whether or not an image is already loaded.)
 */
export function SourcePicker({ onFile, onCamera }: SourcePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function takeFirstImage(list: FileList | null) {
    const file = Array.from(list ?? []).find((f) => f.type.startsWith("image/"));
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        takeFirstImage(e.dataTransfer.files);
      }}
      className={cx(
        "flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-14",
        dragOver ? "border-accent bg-accent-soft" : "border-border bg-panel",
      )}
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent">
        <EyedropperIcon size={30} />
      </span>

      <div className="max-w-[440px]">
        <h2 className="text-[18px] font-bold tracking-[.1px]">Start with a picture</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
          Attach a photo or take one, then tap anywhere on it to read that colour — hex, RGB,
          HSL, CMYK, LAB and more, plus the palette of the whole image. Everything runs on this
          device; the picture is never uploaded.
        </p>
      </div>

      <div className="flex w-full max-w-[420px] flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <ImportIcon size={17} />
          Attach an image
        </button>

        <button
          type="button"
          onClick={() => (onCamera ? onCamera() : captureRef.current?.click())}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-paper px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CameraIcon size={17} />
          Take a photo
        </button>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
        or drop a file here · or paste one
      </p>

      {/* `hidden`, not `sr-only`: these are implementation details behind the
          two labelled buttons above. Left in the accessibility tree they'd be
          announced as a second, unexplained pair of file controls. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          takeFirstImage(e.target.files);
          // Reset so re-picking the same file fires change again.
          e.target.value = "";
        }}
      />
      {/* Fallback path for browsers without getUserMedia: hands off to the
          device's own camera app, which returns a photo as a file. */}
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          takeFirstImage(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
