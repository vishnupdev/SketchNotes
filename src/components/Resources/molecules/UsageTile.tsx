import type { ReactNode } from "react";
import { UsageBar, type BarTone } from "@/components/Resources/atoms/UsageBar";

interface UsageTileProps {
  icon: ReactNode;
  label: string;
  /** The headline reading. Kept short — this is the number people scan for. */
  value: string;
  /** The qualifier under it: the ceiling, the source, or why it's missing. */
  detail?: string;
  /** 0–100. Omit for a reading with no meaningful ceiling. */
  pct?: number;
  tone?: BarTone;
}

/**
 * One live reading: what is being consumed, how much, and out of what.
 *
 * `tabular-nums` on the value is load-bearing — without it a figure that ticks
 * twice a second reflows its own tile, which is both distracting and a layout
 * cost on every sample (rule 7).
 */
export function UsageTile({ icon, label, value, detail, pct, tone = "accent" }: UsageTileProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-panel p-3.5 shadow-panel">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-accent-soft text-accent">
          {icon}
        </span>
        <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
          {label}
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[19px] font-bold leading-tight tabular-nums" title={value}>
          {value}
        </div>
        {detail && <div className="mt-0.5 truncate text-[11.5px] text-ink-soft">{detail}</div>}
      </div>

      {pct != null && <UsageBar pct={pct} tone={tone} />}
    </div>
  );
}
