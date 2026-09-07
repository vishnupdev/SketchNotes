"use client";

import { useRef, useState } from "react";
import { useExifStore } from "@/store/useExifStore";
import { batchTotals, MAX_BATCH, zipName, type BatchItem } from "@/lib/Exif/batch";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import {
  BroomIcon,
  CheckIcon,
  DownloadIcon,
  ImportIcon,
  LocationIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const OUTCOME_LABELS: Record<BatchItem["outcome"], string> = {
  cleaned: "cleaned",
  "already-clean": "nothing to remove",
  unsupported: "not editable",
  failed: "unreadable",
};

/**
 * Clean a folder's worth at once.
 *
 * This is the way the app is actually used — thirty photos going somewhere, and
 * the locations have to come out of all of them — so the flow is one drop, one
 * button, one zip.
 *
 * The report is deliberately per-file rather than a single "done": a batch that
 * silently skipped four files is worse than one that refused, so every row says
 * what became of it, and the header says **how many carried a location**. That
 * last number is the one worth seeing, and it is the reason someone opened this.
 */
export function BatchPanel() {
  const batch = useExifStore((s) => s.batch);
  const done = useExifStore((s) => s.batchDone);
  const running = useExifStore((s) => s.batchRunning);
  const error = useExifStore((s) => s.batchError);
  const runBatch = useExifStore((s) => s.runBatch);
  const clearBatch = useExifStore((s) => s.clearBatch);
  const zipBatch = useExifStore((s) => s.zipBatch);

  const [over, setOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const totals = batchTotals(batch);

  const save = async () => {
    setSaving(true);
    const blob = await zipBatch();
    if (blob) saveBlob(blob, zipName());
    setSaving(false);
  };

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
          void runBatch([...event.dataTransfer.files]);
        }}
        className={cx(
          "flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed p-6 text-center",
          over ? "border-accent bg-accent-soft" : "border-border bg-panel",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <BroomIcon size={24} />
        </span>

        <div>
          <p className="text-[15px] font-extrabold">Clean a whole batch</p>
          <p className="mx-auto mt-1 max-w-[44ch] text-[12.5px] leading-relaxed text-ink-soft">
            Drop up to {MAX_BATCH} pictures, or choose them. Each is stripped the same lossless way
            as a single file — the image data is copied through untouched — and they come back as
            one zip. Nothing is uploaded and nothing is kept.
          </p>
        </div>

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={running}
          className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
        >
          <ImportIcon size={15} />
          {running ? `Cleaning ${done}…` : "Choose pictures"}
        </button>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(event) => {
            void runBatch([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {error && (
        <p role="status" className="rounded-xl border border-border bg-panel px-3 py-2 text-[12.5px]">
          {error}
        </p>
      )}

      {batch.length > 0 && (
        <>
          <div className="rounded-[14px] border border-border bg-panel p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-extrabold">
                {totals.cleaned} of {totals.files} cleaned
              </h2>
              <span className="font-mono text-[11px] tabular-nums text-ink-soft">
                {formatBytes(totals.saved)} removed
              </span>
            </div>

            {/* The figure this app exists for. */}
            {totals.located > 0 && (
              <p className="mt-2 inline-flex items-start gap-2 text-[12.5px] leading-relaxed">
                <LocationIcon size={15} />
                <span>
                  <strong className="font-bold">
                    {totals.located} of these carried a location.
                  </strong>{" "}
                  <span className="text-ink-soft">
                    Accurate to a few metres, and it would have travelled with every copy you sent.
                  </span>
                </span>
              </p>
            )}

            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              {totals.alreadyClean > 0 && `${totals.alreadyClean} had nothing to remove. `}
              {totals.unsupported > 0 &&
                (totals.unsupported === 1
                  ? "One was a format this cannot edit, and was left alone. "
                  : `${totals.unsupported} were a format this cannot edit, and were left alone. `)}
              {totals.failed > 0 &&
                (totals.failed === 1
                  ? "One could not be read. "
                  : `${totals.failed} could not be read. `)}
              {totals.cleaned === 0 && totals.files > 0 && "Nothing here needed cleaning."}
            </p>

            {running && (
              <div className="mt-3">
                <span className="block h-1.5 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${(done / Math.max(1, batch.length + 1)) * 100}%` }}
                  />
                </span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={!totals.hasOutput || running || saving}
                className="tint inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
              >
                <DownloadIcon size={15} />
                {saving ? "Building the zip…" : `Save ${totals.cleaned} cleaned`}
              </button>
              <button
                type="button"
                onClick={clearBatch}
                disabled={running}
                className="rounded-full border border-border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-45"
              >
                Clear the queue
              </button>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-border/60 rounded-[14px] border border-border bg-panel px-4">
            {batch.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-2.5 text-[12.5px]">
                <span
                  className={cx(
                    "mt-0.5 flex-none",
                    item.outcome === "cleaned" ? "text-accent" : "text-ink-soft",
                  )}
                >
                  {item.outcome === "cleaned" ? <CheckIcon size={15} /> : <span className="block size-[15px]" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold" title={item.name}>
                    {item.name}
                  </span>
                  <span className="block text-[11.5px] text-ink-soft">
                    {item.format !== "unknown" && `${item.format.toUpperCase()} · `}
                    {OUTCOME_LABELS[item.outcome]}
                    {item.removed.length > 0 && ` — ${item.removed.join(", ")}`}
                    {item.hadLocation && " · had a location"}
                  </span>
                </span>

                <span className="flex-none tabular-nums text-ink-soft">
                  {item.saved > 0 ? `−${formatBytes(item.saved)}` : "—"}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-[11.5px] leading-snug text-ink-soft">
            Files this cannot edit are left in the queue as a record and are not put in the zip —
            they were never altered, so the originals you have are still the originals.
          </p>
        </>
      )}
    </div>
  );
}
