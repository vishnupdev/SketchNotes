import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  /** Main figure (already formatted). */
  value: string;
  unit?: string;
  /** Small qualitative caption (e.g. a grade). */
  caption?: string;
  /** Tailwind text-color utility for the icon/caption accent. */
  tone?: string;
  /** Dim + subtle highlight while this metric is the active phase. */
  active?: boolean;
}

/** Compact labelled figure used in the results row (download/upload/ping/jitter). */
export function MetricTile({
  icon,
  label,
  value,
  unit,
  caption,
  tone = "text-accent",
  active = false,
}: MetricTileProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-1.5 rounded-2xl border bg-panel p-4 transition-colors",
        active ? "border-accent ring-1 ring-accent" : "border-border",
      )}
    >
      <div className="flex items-center gap-2 text-ink-soft">
        <span className={cx("grid size-7 flex-none place-items-center rounded-lg bg-accent-soft", tone)}>
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[.12em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[12px] font-semibold text-ink-soft">{unit}</span>}
      </div>
      <div className={cx("text-[11px] font-semibold", caption ? tone : "text-transparent")}>
        {caption || "—"}
      </div>
    </div>
  );
}
