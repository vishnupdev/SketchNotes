"use client";

import type { Accent } from "@/lib/Metronome/rhythm";
import { cx } from "@/lib/utils";

/** How much of the button each accent fills — loudness drawn as height. */
const FILL: Record<Accent, string> = {
  strong: "h-full",
  medium: "h-2/3",
  soft: "h-1/3",
  mute: "h-0",
};

const NAME: Record<Accent, string> = {
  strong: "strong accent",
  medium: "medium accent",
  soft: "soft",
  mute: "muted",
};

interface BeatButtonProps {
  index: number;
  accent: Accent;
  /** This beat is the one sounding now. */
  current: boolean;
  onCycle: () => void;
}

/**
 * One beat of the bar: its accent drawn as a column that fills with loudness,
 * lit while that beat is heard, and pressed to move it to the next accent.
 *
 * The highlight is a colour change, never a pulse or a scale — at 240 BPM a
 * moving indicator is a flicker, and it has to be readable under
 * `prefers-reduced-motion` anyway.
 */
export function BeatButton({ index, accent, current, onCycle }: BeatButtonProps) {
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`Beat ${index + 1}: ${NAME[accent]}. Press to change.`}
      title={`Beat ${index + 1} — ${NAME[accent]}`}
      className={cx(
        "flex h-[72px] min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border px-1 pb-1 transition-colors duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        accent === "mute" ? "border-dashed" : "",
        current ? "border-accent bg-accent-soft" : "border-border bg-paper hover:border-accent",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "py-1 text-center font-mono text-[10px] font-bold tabular-nums",
          current ? "text-accent" : "text-ink-soft",
        )}
      >
        {index + 1}
      </span>
      <span aria-hidden className="flex min-h-0 flex-1 flex-col justify-end">
        <span
          className={cx(
            "block w-full rounded-[5px] transition-colors duration-75",
            FILL[accent],
            current ? "bg-accent" : "bg-ink-soft/35",
          )}
        />
      </span>
    </button>
  );
}
