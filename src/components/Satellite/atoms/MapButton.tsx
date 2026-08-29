"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * One of the small round controls that float over the map.
 *
 * They sit on imagery whose brightness is entirely out of our hands — a snowfield
 * one moment, open ocean the next — so the surface is the opaque paper token
 * rather than a tint of it. Anything translucent reads as a hole over dark tiles
 * and vanishes over pale ones, and the contrast rule (#6) has to hold over both.
 */
export function MapButton({
  label,
  onClick,
  children,
  pressed,
  disabled,
}: {
  /** What the control does — the accessible name, and the tooltip. */
  label: string;
  onClick: () => void;
  children: ReactNode;
  /** Set for a control that toggles, so its state is announced. */
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cx(
        "grid size-9 place-items-center rounded-full border border-border shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
        pressed ? "bg-accent text-on-accent" : "bg-paper text-text hover:text-accent",
      )}
      style={{ transition: "var(--fx)" }}
    >
      {children}
    </button>
  );
}
