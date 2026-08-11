"use client";

import type { BoardActions } from "@/hooks/useBoard";
import { dayInitial, dayKey, dayLabel, recentDays, streak } from "@/lib/Board/days";
import type { BoardSection } from "@/lib/Board/types";
import { cx } from "@/lib/utils";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";

interface BodyProps {
  section: BoardSection;
  actions: BoardActions;
}

/** How many days of history the strip shows. A week reads at a glance and fits
 *  a 360px card without shrinking the touch targets below 40px. */
const WINDOW = 7;

/**
 * A seven-day streak strip. Days are local calendar keys (see `days.ts`), so the
 * boxes line up with the user's own idea of "today" rather than UTC's.
 *
 * Each day is a real toggle button with `aria-pressed` and a spoken date, so the
 * grid is usable by keyboard and screen reader — the weekday initials above it
 * are decoration only.
 */
export function HabitBody({ section, actions }: BodyProps) {
  const days = recentDays(WINDOW);
  const today = dayKey();
  const done = new Set(section.done);
  const run = streak(section.done);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-stretch gap-1">
        {days.map((day) => {
          const on = done.has(day);
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={`${dayLabel(day)}${isToday ? " (today)" : ""}`}
              onClick={() =>
                actions.dispatch({ kind: "tick", id: section.id, itemId: day, done: !on })
              }
              className={cx(
                "hover-pop flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl border py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                on ? "border-accent bg-accent text-on-accent" : "border-border bg-paper text-ink-soft hover:border-accent",
                isToday && !on && "ring-1 ring-accent",
              )}
            >
              <span aria-hidden className="font-mono text-[9.5px] uppercase tracking-[.1em]">
                {dayInitial(day)}
              </span>
              {/* The tick is drawn only on a day that's done — a greyed-out
                  check on every empty day reads as half-ticked. The box keeps
                  its height either way, so the strip never reflows. */}
              <span aria-hidden className="grid size-5 place-items-center">
                {on && <CheckIcon size={14} />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft">
        {run > 0 ? `${run}-day streak` : "No streak yet"}
      </p>
    </div>
  );
}
