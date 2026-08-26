"use client";

import { cx } from "@/lib/utils";
import type { TourStep } from "@/lib/Walkaround/types";

interface StepListProps {
  steps: readonly TourStep[];
  step: number;
  onGo: (step: number) => void;
}

/**
 * Every stop of the tour as plain text, the current one open.
 *
 * This is the tour without the drawing, and it is not an extra: a tooltip on a
 * schematic is a poor place to be the only copy of anything. The list is what a
 * screen reader walks, what a search on the page finds, and what someone reads
 * straight through instead of stepping — so it carries the direction *and* the
 * suggestion in full, where the tooltip carries only the direction.
 */
export function StepList({ steps, step, onGo }: StepListProps) {
  return (
    <ol role="list" className="flex flex-col gap-1.5">
      {steps.map((s, i) => {
        const open = i === step;
        return (
          <li key={s.title + i}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={open}
              aria-expanded={open}
              className={cx(
                "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                open
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-panel hover:border-accent",
              )}
            >
              <span
                className={cx(
                  "mt-px grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[9.5px] font-bold leading-none",
                  open ? "border-accent bg-accent text-on-accent" : "border-border text-ink-soft",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cx(
                    "block text-[12.5px] font-semibold leading-tight",
                    open ? "text-accent" : "text-text",
                  )}
                >
                  {s.title}
                </span>
                {open ? (
                  <>
                    <span className="mt-1 block text-[12px] leading-[1.5] text-text">
                      {s.direction}
                    </span>
                    <span className="mt-2 block border-l-2 border-accent pl-2.5 text-[12px] leading-[1.5] text-ink-soft">
                      <b className="font-mono text-[9px] uppercase tracking-[.14em] text-accent">
                        Try this
                      </b>
                      <br />
                      {s.suggestion}
                    </span>
                  </>
                ) : (
                  <span className="mt-0.5 line-clamp-1 block text-[11.5px] leading-tight text-ink-soft">
                    {s.direction}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
