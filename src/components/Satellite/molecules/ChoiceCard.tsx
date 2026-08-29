"use client";

import { cx } from "@/lib/utils";

/**
 * One option in a picked-one-of set, drawn as a card rather than a radio dot.
 *
 * A real `radio` input is underneath — the card is its label — so arrow keys
 * move through the group, the browser announces "2 of 3", and the selection has
 * one source of truth. Styling a `div` into a radio is what loses all three.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  blurb,
}: {
  /** Radio group name — shared by every card in the set. */
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  blurb: string;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-2.5 rounded-[14px] border-[1.5px] p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
        checked ? "border-accent bg-accent-soft" : "border-border bg-panel hover:border-accent",
      )}
      style={{ transition: "var(--fx)" }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 flex-none accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{blurb}</span>
      </span>
    </label>
  );
}
