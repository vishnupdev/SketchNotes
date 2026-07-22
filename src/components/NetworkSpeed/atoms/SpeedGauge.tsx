import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface SpeedGaugeProps {
  /** Fill fraction of the dial, 0 → 1 (use `speedToFraction`). */
  fraction: number;
  /** Centre content (usually the big number + unit). */
  children: ReactNode;
  /** Tailwind stroke-* utility for the value arc (theme token). */
  tone?: string;
  /** Diameter in px. */
  size?: number;
  /** Pulse the arc while a measurement is live. */
  active?: boolean;
  className?: string;
}

// 270° dial: draw 3/4 of the circle, leaving a 90° gap centred at the bottom.
const SWEEP = 0.75;

/**
 * Speedometer-style gauge — a 270° arc with centred content. Pure SVG so it
 * scales crisply and takes all colour from `stroke-*` theme utilities (no
 * hardcoded colours). The arc length maps `fraction` onto the visible sweep.
 */
export function SpeedGauge({
  fraction,
  children,
  tone = "stroke-accent",
  size = 240,
  active = false,
  className,
}: SpeedGaugeProps) {
  const stroke = Math.max(8, Math.round(size * 0.05));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = SWEEP * c;
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <div
      className={cx("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Rotate so the 90° gap sits centred at the bottom. */}
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${c}`}
            className="stroke-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${clamped * arc} ${c}`}
            className={cx(
              "transition-[stroke-dasharray] duration-300 ease-out",
              tone,
              active && "animate-pulse",
            )}
          />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
