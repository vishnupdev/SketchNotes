import { cx } from "@/lib/utils";

export type BarTone = "accent" | "success" | "warn" | "danger";

const FILL: Record<BarTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warn: "bg-prio-med",
  danger: "bg-danger",
};

/** Hotter as a resource fills up. */
export const toneForFill = (pct: number): BarTone =>
  pct >= 90 ? "danger" : pct >= 70 ? "warn" : "success";

/**
 * A proportion of something finite — heap against its ceiling, storage against
 * the quota.
 *
 * The bar is decorative: the number beside it is the reading, so the track is
 * `aria-hidden` and the width animates rather than the layout, which keeps a
 * meter that updates twice a second from costing a single layout pass.
 */
export function UsageBar({
  pct,
  tone = "accent",
  className,
}: {
  pct: number;
  tone?: BarTone;
  className?: string;
}) {
  return (
    <div aria-hidden className={cx("h-1.5 overflow-hidden rounded-full bg-border", className)}>
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", FILL[tone])}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
