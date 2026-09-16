"use client";

import { StarIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

/**
 * Five stars the reader sets themselves.
 *
 * A radio group rather than five buttons: the choices are mutually exclusive,
 * which is what a radio group *means*, and it is the shape that gives keyboard
 * users arrow keys through the options for free. Each star carries its own
 * label ("3 out of 5"), because "star" repeated five times tells a screen reader
 * nothing about which one is which.
 *
 * Re-picking the current value clears it. Without that there is no way back out
 * of a rating you gave by accident except to pick a different wrong one.
 */
export function StarPicker({
  value,
  onChange,
  label,
}: {
  /** 0 = unrated. */
  value: number;
  onChange: (stars: number) => void;
  /** Names the group, e.g. "Your rating of the iPhone 15 Pro". */
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {STARS.map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} out of 5`}
            onClick={() => onChange(star === value ? 0 : star)}
            className={cx(
              "hover-pop grid size-9 place-items-center rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              filled ? "text-accent" : "text-ink-soft hover:text-accent",
            )}
          >
            <StarIcon size={22} filled={filled} />
          </button>
        );
      })}
    </div>
  );
}

/** The same five stars, read-only — for a rating shown in a list. */
export function StarReadout({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-0.5 text-accent", className)}
      aria-label={`${value} out of 5`}
    >
      {STARS.map((star) => (
        <StarIcon key={star} size={13} filled={star <= value} aria-hidden="true" />
      ))}
    </span>
  );
}
