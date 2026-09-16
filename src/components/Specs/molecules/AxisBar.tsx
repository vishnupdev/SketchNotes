"use client";

import type { ScoreAxis } from "@/lib/Specs/types";

/**
 * One dimension of the spec score: what the sheet said, where that sits on the
 * scale, and what the scale was.
 *
 * An axis the sheet didn't answer draws no bar at all. It could be drawn empty,
 * and that is exactly the problem — an empty bar is indistinguishable from a
 * bar at zero, so a phone whose article omits brightness would look like a phone
 * with no brightness. The row stays, greyed, saying "not stated": present enough
 * to show what was looked for, silent about what wasn't found.
 *
 * The bar is a `<div>` with a width, not a `<progress>`: progress elements
 * cannot be themed to the workspace's tokens across browsers (rule #6), and the
 * value is already announced on the row's own text.
 */
export function AxisBar({ axis }: { axis: ScoreAxis }) {
  const stated = axis.score !== null;

  return (
    <li className="border-b border-border py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-mono text-[10px] uppercase tracking-[.13em] text-ink-soft">
          {axis.label}
        </span>
        <span className="font-mono text-[12.5px] tabular-nums text-text">
          {stated ? axis.reading : <span className="text-ink-soft">not stated</span>}
        </span>
      </div>

      {stated && (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border"
          role="img"
          aria-label={`${axis.label}: ${axis.score} out of 100`}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${axis.score}%`, transition: "var(--fx)" }}
          />
        </div>
      )}

      <p className="mt-1 text-[11px] leading-snug text-ink-soft">
        {axis.verdict}
        {axis.from && stated && (
          <span className="opacity-80"> Read from “{axis.from}”.</span>
        )}
      </p>
    </li>
  );
}
