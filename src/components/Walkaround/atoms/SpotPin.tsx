"use client";

import { cx } from "@/lib/utils";

interface SpotPinProps {
  /** The stop's number as the reader counts them, from 1. */
  n: number;
  /** Where the pin sits, in percentages of the stage. */
  x: number;
  y: number;
  active: boolean;
  /** What this stop is called — the pin's accessible name. */
  title: string;
  onSelect: () => void;
}

/**
 * One numbered stop on the stage.
 *
 * A real `<button>` rather than a decorated dot: the pins are how you skip
 * around a tour, so they have to be tabbable, have a name, and say which one is
 * current (rule #7 Accessibility). The number is the same one the step list
 * uses, which is what ties the drawing to the text underneath it.
 */
export function SpotPin({ n, x, y, active, title, onSelect }: SpotPinProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      aria-label={`Stop ${n}: ${title}`}
      title={title}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={cx(
        // Above the regions it sits on, below the tooltip it opens — and below
        // the app's sticky header, which the pin can scroll under.
        "hover-pop absolute z-[2] grid size-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center",
        "rounded-full border font-mono text-[10px] font-bold leading-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "border-accent bg-accent text-on-accent shadow-(--nav-glow)"
          : "border-border bg-paper text-ink-soft hover:border-accent hover:text-accent",
      )}
    >
      {n}
    </button>
  );
}
