"use client";

import { useRef, useState } from "react";
import { useExifStore } from "@/store/useExifStore";
import { ImportIcon, TagIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * How a picture gets in: pick it, drop it, or paste it.
 *
 * Paste matters more here than in most places — a screenshot on the clipboard
 * is the commonest way people have an image to hand, and it is also the case
 * with the most surprising metadata in it.
 */
export function OpenPicture() {
  const read = useExifStore((s) => s.read);
  const error = useExifStore((s) => s.error);
  const reading = useExifStore((s) => s.reading);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
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
        if (file) void read(file);
      }}
      onPaste={(event) => {
        const file = event.clipboardData.files[0];
        if (file) void read(file);
      }}
      className={cx(
        "flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed p-8 text-center",
        over ? "border-accent bg-accent-soft" : "border-border bg-panel",
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <TagIcon size={26} />
      </span>

      <div>
        <p className="text-[15px] font-extrabold">Open a picture</p>
        <p className="mx-auto mt-1 max-w-[44ch] text-[12.5px] leading-relaxed text-ink-soft">
          A JPEG, PNG or WebP. It is read on this device and never uploaded — which matters here more
          than anywhere, because what this shows you may include exactly where the photo was taken.
        </p>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={reading}
        className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
      >
        <ImportIcon size={15} />
        {reading ? "Reading…" : "Choose a picture"}
      </button>

      <p className="text-[11.5px] text-ink-soft">…or drop one here, or paste one.</p>

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void read(file);
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
