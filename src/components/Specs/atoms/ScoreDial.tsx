"use client";

import { cx } from "@/lib/utils";

/**
 * The spec score, drawn as a ring.
 *
 * The ring is an SVG arc rather than a conic gradient or an animated width,
 * because it has to be legible at 72px on a phone and at 132px on a desktop
 * without a second set of rules, and because a stroked circle costs no layout
 * when the number changes (rule #7).
 *
 * The **track is always drawn full** and the arc is the share of it that was
 * earned. A dial showing only the filled part reads as a complete circle at any
 * value, which would make 41 look like 100 to anyone not reading the number.
 */
export function ScoreDial({
  score,
  band,
  size = 116,
  label,
}: {
  /** 0–100, or null when the sheet carried nothing to score. */
  score: number | null;
  /** Plain-language band shown under the number. */
  band: string;
  size?: number;
  /** Accessible name — says what was scored, since "84" alone means nothing. */
  label: string;
}) {
  const stroke = Math.round(size * 0.085);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = score === null ? 0 : (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div
      className="relative flex-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={score === null ? `${label}: not scored` : `${label}: ${score} out of 100, ${band}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Rotated so the arc starts at twelve o'clock and runs clockwise. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          {score !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
            />
          )}
        </g>
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <div
          className={cx(
            "font-mono font-bold leading-none tabular-nums",
            score === null ? "text-ink-soft" : "text-text",
          )}
          style={{ fontSize: Math.round(size * (score === null ? 0.2 : 0.3)) }}
        >
          {score === null ? "—" : score}
        </div>
        <div
          className="mt-1 font-mono uppercase tracking-[.12em] text-ink-soft"
          style={{ fontSize: Math.max(8, Math.round(size * 0.075)) }}
        >
          {band}
        </div>
      </div>
    </div>
  );
}
