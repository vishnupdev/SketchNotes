import { cx } from "@/lib/utils";

export type MeterTone = "accent" | "success" | "warn" | "danger";

const BAR: Record<MeterTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warn: "bg-prio-med",
  danger: "bg-danger",
};

/** Pick a tone from a 0–100 utilisation percentage (higher = hotter). */
export function toneForUsage(pct: number): MeterTone {
  if (pct >= 90) return "danger";
  if (pct >= 70) return "warn";
  return "success";
}

/** Labeled horizontal meter: caption, value read-out, and a filled bar. */
export function Meter({
  label,
  value,
  pct,
  tone = "accent",
}: {
  label: string;
  value: string;
  /** 0–100; omit for a value-only row (no bar). */
  pct?: number;
  tone?: MeterTone;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-soft">{label}</span>
        <span className="text-[12.5px] font-semibold tabular-nums">{value}</span>
      </div>
      {pct != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={cx("h-full rounded-full transition-[width] duration-500", BAR[tone])}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      )}
    </div>
  );
}
