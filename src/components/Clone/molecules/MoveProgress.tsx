"use client";

import { formatBytes } from "@/lib/utils";
import type { CloneStage } from "@/lib/Clone/types";

const STAGE_LABEL: Record<CloneStage, string> = {
  idle: "",
  preparing: "Packing this device up…",
  pairing: "Waiting for the two devices to be introduced…",
  connecting: "Connecting…",
  moving: "Moving the clone across…",
  arrived: "Arrived, and verified.",
  applied: "Done.",
  failed: "Stopped.",
};

/**
 * How far the clone has got.
 *
 * A real fraction, not a spinner: the size is announced before the first byte
 * (see the header in `lib/Clone/link.ts`), which is what lets this bar mean
 * something. A device clone over a cable is over in seconds and a bar that
 * merely spins would be worse than nothing — it would make a finished transfer
 * indistinguishable from a stalled one.
 *
 * The stage line is `role="status"`, so a screen reader hears the transfer
 * progress without the percentage being announced on every repaint.
 */
export function MoveProgress({
  stage,
  moved,
  total,
  note,
}: {
  stage: CloneStage;
  moved: number;
  total: number;
  /** Anything more specific than the stage — a device name, a byte count. */
  note?: string;
}) {
  if (stage === "idle") return null;

  const fraction = total > 0 ? Math.min(1, moved / total) : 0;
  const percent = Math.round(fraction * 100);
  const showBar = stage === "moving" && total > 0;

  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
        {STAGE_LABEL[stage]}
        {note ? ` ${note}` : ""}
      </p>

      {showBar && (
        <>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Clone transferred"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-ink-soft">
            {formatBytes(moved)} of {formatBytes(total)} · {percent}%
          </p>
        </>
      )}
    </div>
  );
}
