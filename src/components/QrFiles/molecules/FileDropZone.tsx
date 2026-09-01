"use client";

import { useRef, useState, type DragEvent } from "react";
import { cx, formatBytes } from "@/lib/utils";
import { MAX_FILE_BYTES } from "@/lib/QrFiles/files";
import { ImportIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The way a file gets in: a button that is also a drop target.
 *
 * Every route on purpose — a tap opens the picker (which on a phone is also the
 * camera roll and the "Files" app), a drag lands on the same surface, and both
 * end in the same handler. There is no "choose a type first" step because the
 * app does not care what the file is: pictures, documents, audio and video all
 * become the same bytes.
 */
export function FileDropZone({
  onFile,
  busy,
  label = "Choose a file",
}: {
  onFile: (file: File) => void;
  busy?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (!busy) take(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx(
        "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
        over ? "border-accent bg-accent-soft" : "border-border bg-panel",
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ImportIcon size={22} />
      </span>

      <div>
        <p className="text-[13.5px] font-semibold">{label}</p>
        <p className="mt-1 max-w-[42ch] text-[12.5px] leading-relaxed text-ink-soft">
          A picture, a document, a song, a clip — anything up to {formatBytes(MAX_FILE_BYTES)}. Drop
          it here, or pick one. It is read on this device and never uploaded.
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
      >
        {busy ? "Reading…" : "Browse files"}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          take(e.target.files);
          // Cleared so picking the same file twice in a row still fires.
          e.target.value = "";
        }}
      />
    </div>
  );
}
