"use client";

import { cx } from "@/lib/utils";

export interface ChipItem<T extends string> {
  id: T;
  /** Chip text - one or two words, so the row stays scannable on a phone. */
  label: string;
  /** Longer description, shown as a tooltip. */
  hint?: string;
}

interface ChipBarProps<T extends string> {
  /** Names the row for assistive tech, e.g. "News categories". */
  label: string;
  items: readonly ChipItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Extra classes on the scroller - usually the negative gutter to bleed it. */
  className?: string;
}

/**
 * A horizontal, swipeable row of filter chips - the pattern an app uses to pick
 * one of a handful of peer views (a news category, a music station).
 *
 * Scrolls sideways rather than wrapping, so a long set stays reachable on a
 * narrow screen without ever growing the page's own horizontal scroll (rule #3).
 * The default `-mx-5 px-5` bleeds the row to the edges of a 20px-padded column
 * so the last chip scrolls flush rather than stopping short; pass `className` to
 * match a different gutter.
 *
 * Shared because more than one app shows one of these, and a filter row should
 * read and behave identically wherever it appears.
 */
export function ChipBar<T extends string>({
  label,
  items,
  value,
  onChange,
  className = "-mx-5 px-5",
}: ChipBarProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx("scroll-slim flex gap-2 overflow-x-auto pb-1", className)}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={item.hint ?? item.label}
            onClick={() => onChange(item.id)}
            className={cx(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              selected
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-panel text-ink-soft hover:border-accent hover:text-text",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
