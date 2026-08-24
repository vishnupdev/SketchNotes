"use client";

import { useRef, useState } from "react";
import { cx, formatBytes } from "@/lib/utils";
import { CloseIcon, ImportIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The files waiting to be sent.
 *
 * Deliberately never reads them. A `File` is a handle on something already on
 * disk, so queueing ten gigabytes costs nothing and the bytes are only touched
 * once a transfer is running — which is what makes "any size" true rather than
 * aspirational.
 */
export function FileQueue({
  files,
  onAdd,
  onRemove,
  onClear,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const total = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = [...(e.dataTransfer.files ?? [])];
          if (dropped.length) onAdd(dropped);
        }}
        className={cx(
          "cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          over
            ? "border-accent bg-accent-soft"
            : "border-ink-soft/50 hover:border-accent hover:bg-accent-soft/60",
        )}
      >
        <span className="mx-auto mb-2 grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
          <ImportIcon size={20} />
        </span>
        <b className="mb-1 block text-[13.5px]">Drop files here</b>
        <span className="text-[12px] text-ink-soft">or tap to choose — any type, any size</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          aria-label="Choose files to send"
          onChange={(e) => {
            const chosen = [...(e.target.files ?? [])];
            e.target.value = "";
            if (chosen.length) onAdd(chosen);
          }}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(total)}
            </p>
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-border bg-panel px-3 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-text"
            >
              Clear
            </button>
          </div>
          <ul role="list" className="flex flex-col gap-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-panel p-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{file.name}</span>
                  <span className="block text-[11.5px] text-ink-soft">
                    {formatBytes(file.size)}
                    {file.type ? ` · ${file.type}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${file.name}`}
                  className="tint grid size-8 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-danger"
                >
                  <CloseIcon size={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
