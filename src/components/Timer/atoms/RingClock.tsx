import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface RingClockProps {
  /** Fraction filled, 0 → 1. */
  progress: number;
  /** Center content (usually the formatted time). */
  children: ReactNode;
  /** Tailwind stroke-* utility for the progress arc (theme token). */
  tone?: string;
  /** Diameter in px. */
  size?: number;
  className?: string;
}

/**
 * Circular progress ring with centred content. Pure SVG so it scales crisply
 * and inherits theme colours via `stroke-*` utilities — no hardcoded colours.
 */
export function RingClock({
  progress,
  children,
  tone = "stroke-accent",
  size = 260,
  className,
}: RingClockProps) {
  const stroke = Math.max(6, Math.round(size * 0.035));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className={cx("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className={cx("transition-[stroke-dashoffset] duration-200 ease-linear", tone)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
