"use client";

import type { FileMeta, FileResult, TransferProgress } from "@/lib/FileDrop/types";
import { cx, formatBytes } from "@/lib/utils";
import { CheckIcon, CloseIcon } from "@/components/SketchNotes/atoms/icons";

/** "2.4 MB/s", or nothing at all until there's a real figure. */
const rateLabel = (rate: number): string => (rate > 1024 ? `${formatBytes(rate)}/s` : "");

/** Seconds remaining as "about 3 min" / "12s"; blank when it can't be known. */
function etaLabel(remaining: number, rate: number): string {
  if (rate < 1024 || remaining <= 0) return "";
  const seconds = Math.round(remaining / rate);
  if (seconds < 60) return `${seconds}s left`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `about ${minutes} min left` : `about ${Math.round(minutes / 60)} h left`;
}

/**
 * A transfer in flight, and what it left behind.
 *
 * Rate and time-remaining are shown because this is the one app in the workspace
 * where an operation can legitimately run for minutes: without them, a large file
 * is indistinguishable from a stuck one. Both are blanked rather than guessed at
 * until there is enough throughput history to mean anything.
 */
export function TransferView({
  files,
  total,
  progress,
  results,
  onCancel,
}: {
  files: FileMeta[];
  total: number;
  progress: TransferProgress | null;
  results: FileResult[];
  onCancel?: () => void;
}) {
  const done = progress?.totalBytes ?? 0;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  const rate = progress?.rate ?? 0;
  const eta = etaLabel(total - done, rate);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold">
            {formatBytes(done)} of {formatBytes(total)}
            <span className="ml-1.5 font-normal text-ink-soft">({Math.round(fraction * 100)}%)</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft">
            {[rateLabel(rate), eta].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Transfer progress"
          aria-valuenow={Math.round(fraction * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>

      <ul role="list" className="flex flex-col gap-1.5">
        {files.map((file, index) => {
          const result = results[index];
          const active = progress?.index === index && !result;
          const fileFraction = result
            ? 1
            : active && file.size > 0
              ? Math.min(1, (progress?.fileBytes ?? 0) / file.size)
              : 0;
          return (
            <li
              key={`${file.name}-${index}`}
              className={cx(
                "flex items-center gap-3 rounded-xl border p-2.5",
                active ? "border-accent bg-accent-soft" : "border-border bg-panel",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{file.name}</span>
                <span className="block text-[11.5px] text-ink-soft">
                  {formatBytes(file.size)}
                  {active && ` · ${Math.round(fileFraction * 100)}%`}
                  {result && !result.verified && " · checksum failed, not saved"}
                </span>
              </span>
              {result && (
                <span
                  className={cx(
                    "grid size-7 flex-none place-items-center rounded-full",
                    result.verified ? "bg-accent-soft text-accent" : "bg-panel text-danger",
                  )}
                  aria-label={result.verified ? "Complete" : "Failed"}
                >
                  {result.verified ? <CheckIcon size={15} /> : <CloseIcon size={15} />}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="self-start rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          Stop transfer
        </button>
      )}
    </div>
  );
}
