"use client";

import { cx } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";

interface StepControlsProps {
  step: number;
  count: number;
  onGo: (step: number) => void;
  /** Titles, so a dot can say which stop it jumps to. */
  titles: readonly string[];
}

/**
 * Back, next, and a dot per stop.
 *
 * The dots are buttons rather than a progress bar because a tour is worth
 * skipping around in — someone who came for one thing should be able to get to
 * it. Back and next stop at the ends instead of wrapping: a tour has a first
 * and last stop, and looping round from the end reads as a bug.
 */
export function StepControls({ step, count, onGo, titles }: StepControlsProps) {
  const first = step === 0;
  const last = step === count - 1;

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onGo(step - 1)}
        disabled={first}
        className={cx(
          "hover-pop inline-flex items-center gap-1.5 rounded-full border border-border bg-panel py-2 pl-2.5 pr-3.5",
          "font-mono text-[10.5px] uppercase tracking-[.1em] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          first ? "cursor-not-allowed opacity-45" : "hover:border-accent hover:text-accent",
        )}
      >
        <ChevronLeftIcon size={14} />
        Back
      </button>

      <ol role="list" className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
        {titles.map((title, i) => (
          <li key={title + i}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={i === step}
              aria-label={`Stop ${i + 1} of ${count}: ${title}`}
              title={title}
              className={cx(
                "block size-2.5 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                i === step
                  ? "border-accent bg-accent"
                  : i < step
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-panel hover:border-accent",
              )}
              style={{ transition: "var(--fx)" }}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onGo(step + 1)}
        disabled={last}
        className={cx(
          "hover-glow inline-flex items-center gap-1.5 rounded-full border py-2 pl-3.5 pr-2.5",
          "font-mono text-[10.5px] uppercase tracking-[.1em] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          last
            ? "cursor-not-allowed border-border bg-panel opacity-45"
            : "border-accent bg-accent text-on-accent",
        )}
      >
        Next
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}
