"use client";

import { useRef, useState } from "react";
import { useOcrStore } from "@/store/useOcrStore";
import { ImportIcon, ScanTextIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * How a picture gets in: pick it, drop it, or paste it.
 *
 * Paste earns its place here more than anywhere else in the workspace — a
 * screenshot on the clipboard is the single commonest thing anyone wants text
 * out of, and every alternative route (save it, find it, upload it) is three
 * steps longer.
 */
export function OpenPicture() {
  const open = useOcrStore((s) => s.open);
  const error = useOcrStore((s) => s.error);
  const busy = useOcrStore((s) => s.busy);
  const warm = useOcrStore((s) => s.engineWarm);
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
        if (file) void open(file);
      }}
      onPaste={(event) => {
        const file = event.clipboardData.files[0];
        if (file) void open(file);
      }}
      className={cx(
        "flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed p-8 text-center",
        over ? "border-accent bg-accent-soft" : "border-border bg-panel",
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ScanTextIcon size={26} />
      </span>

      <div>
        <p className="text-[15px] font-extrabold">Open a picture with text in it</p>
        <p className="mx-auto mt-1 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-soft">
          A photo of a page, a screenshot, a receipt, a sign. It is read on this device and never
          uploaded — the recognition engine is downloaded to the picture, not the other way round.
        </p>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
      >
        <ImportIcon size={15} />
        {busy ? "Opening…" : "Choose a picture"}
      </button>

      <p className="text-[11.5px] text-ink-soft">…or drop one here, or paste one.</p>

      {!warm && (
        <p className="mx-auto max-w-[46ch] rounded-[12px] border border-border bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
          The first read downloads the engine and the English model — about 7 MB, once per device.
          It is stored here afterwards, so every later read works with no connection at all.
        </p>
      )}

      {error && (
        <p role="alert" className="max-w-[46ch] text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void open(file);
          event.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
