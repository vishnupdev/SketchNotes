"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * One filter chip — a category, a brand or a year.
 *
 * Three rows of these drive the whole app, so the selected state is carried by
 * `aria-selected` on a real `role="tab"` (or `aria-pressed`, when the chip is a
 * toggle rather than one of a set) and *never by colour alone*: the selected
 * chip is filled, not merely tinted, so the distinction survives a monochrome
 * display and any of the workspace's two dozen themes.
 *
 * `h-8` and `flex-none` together are what stop a long chip row from squashing
 * its members into unreadable slivers on a narrow screen — the row scrolls
 * instead, which is the behaviour a thumb expects.
 */
export function Chip({
  children,
  selected,
  onClick,
  size = "md",
  role = "tab",
  count,
}: {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
  /** `sm` for the secondary row, which sits under a primary one. */
  size?: "sm" | "md";
  /** `tab` when one of a set; `button` when it toggles independently. */
  role?: "tab" | "button";
  /** Optional trailing figure, e.g. how many products a brand has. */
  count?: number;
}) {
  const selectedProps =
    role === "tab" ? { "aria-selected": selected } : { "aria-pressed": selected };

  return (
    <button
      type="button"
      role={role}
      {...selectedProps}
      onClick={onClick}
      className={cx(
        "flex-none rounded-full border",
        size === "md" ? "h-8 px-3.5 text-[12px]" : "h-7 px-3 text-[11.5px]",
        selected
          ? "border-accent bg-accent text-on-accent"
          : "tint border-border text-ink-soft hover:border-accent hover:text-accent",
      )}
      style={{ transition: "var(--fx)" }}
    >
      {children}
      {count !== undefined && (
        <span className={cx("ml-1.5 font-mono text-[10px]", selected ? "opacity-80" : "opacity-70")}>
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * The horizontally scrolling rail a row of {@link Chip}s lives in.
 *
 * The negative margin and matching padding are deliberate: they let the row
 * bleed to the edges of the phone screen so the last chip is not visually
 * trapped behind the panel's gutter, while keeping the first chip aligned with
 * everything above it.
 */
export function ChipRail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
    >
      {children}
    </div>
  );
}
