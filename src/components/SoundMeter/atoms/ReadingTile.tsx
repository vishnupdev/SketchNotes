import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface ReadingTileProps {
  icon: ReactNode;
  label: string;
  /** Main figure, already formatted. */
  value: string;
  unit?: string;
  /** Small caption under the figure (context, not a second measurement). */
  caption?: string;
  /** Tailwind text-color utility for the icon and caption. */
  tone?: string;
  /** Dim the figure when the reading isn't trustworthy (too quiet, unpitched). */
  muted?: boolean;
}

/**
 * One measured figure — the Sound Meter's unit of readout. Figures are
 * tabular-nums so a value flickering between digits doesn't shift the layout
 * twenty times a second.
 */
export function ReadingTile({
  icon,
  label,
  value,
  unit,
  caption,
  tone = "text-accent",
  muted = false,
}: ReadingTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-panel p-3.5">
      <div className="flex items-center gap-2 text-ink-soft">
        <span className={cx("grid size-7 flex-none place-items-center rounded-lg bg-accent-soft", tone)}>
          {icon}
        </span>
        <span className="truncate text-[10.5px] font-semibold uppercase tracking-[.12em]">{label}</span>
      </div>
      <div className={cx("flex items-baseline gap-1", muted && "opacity-45")}>
        <span className="truncate text-[22px] font-extrabold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[11.5px] font-semibold text-ink-soft">{unit}</span>}
      </div>
      <div className={cx("truncate text-[10.5px] font-semibold", caption ? tone : "text-transparent")}>
        {caption || "—"}
      </div>
    </div>
  );
}
