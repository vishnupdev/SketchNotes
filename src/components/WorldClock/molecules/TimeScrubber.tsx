"use client";

import { RotateIcon, SlidersIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

interface TimeScrubberProps {
  /** Minutes offset from now, negative for earlier. */
  value: number;
  onChange: (minutes: number) => void;
  onReset: () => void;
}

/** How far the slider reaches either side of now, and its granularity. */
const RANGE_MINUTES = 12 * 60;
const STEP_MINUTES = 15;

/** "now", "in 3h 30m", "5h 15m ago" — what the slider position means. */
function shiftLabel(minutes: number): string {
  if (minutes === 0) return "Now";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
  return minutes > 0 ? `in ${span}` : `${span} ago`;
}

/**
 * Shifts every clock on the board forward or back by up to twelve hours.
 *
 * This is what turns a world clock from a display into a planning tool: drag to
 * 3pm your time and read straight off the board whether that lands in the
 * middle of someone's night. The board keeps showing real dates and
 * "Tomorrow" badges as it moves, which is the part that's genuinely hard to do
 * in your head across a date line.
 *
 * The slider is a real `<input type="range">`, so it is keyboard-operable with
 * arrow keys for free and announces its position as a time shift rather than a
 * raw minute count.
 */
export function TimeScrubber({ value, onChange, onReset }: TimeScrubberProps) {
  const active = value !== 0;

  return (
    <section
      aria-label="Shift all clocks"
      className="rounded-2xl border border-border bg-panel p-4"
    >
      <div className="flex items-center gap-2.5">
        <SlidersIcon size={16} aria-hidden className="flex-none text-accent" />
        <label
          htmlFor="worldclock-scrub"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Time shift
        </label>
        <span
          className={cx(
            "ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums",
            active ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          {shiftLabel(value)}
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={!active}
          title="Back to the current time"
          aria-label="Reset all clocks to the current time"
          className="hover-pop grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-accent disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RotateIcon size={15} />
        </button>
      </div>

      <input
        id="worldclock-scrub"
        type="range"
        min={-RANGE_MINUTES}
        max={RANGE_MINUTES}
        step={STEP_MINUTES}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={shiftLabel(value)}
        className="mt-3 h-6 w-full cursor-pointer accent-[var(--accent)]"
      />

      <div
        aria-hidden
        className="flex justify-between font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft"
      >
        <span>−12h</span>
        <span>Now</span>
        <span>+12h</span>
      </div>
    </section>
  );
}
