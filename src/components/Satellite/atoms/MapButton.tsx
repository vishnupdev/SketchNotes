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
 *
 * Given an `href` it renders as a real link rather than a button, so the one
 * control that leaves the app (Street View) can be middle-clicked, opened in a
 * background tab, and read as a link by a screen reader — none of which a
 * `<button>` calling `window.open` can offer.
 */
export function MapButton({
  label,
  onClick,
  href,
  children,
  pressed,
  active,
  disabled,
}: {
  /** What the control does — the accessible name, and the tooltip. */
  label: string;
  onClick?: () => void;
  /** Renders an external link instead of a button. */
  href?: string;
  children: ReactNode;
  /** Set for a control that toggles, so its state is announced. */
  pressed?: boolean;
  /** Fill the control without claiming a toggle state — e.g. "working on it". */
  active?: boolean;
  disabled?: boolean;
}) {
  const className = cx(
    "grid size-9 place-items-center rounded-full border border-border shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
    pressed || active ? "bg-accent text-on-accent" : "bg-paper text-text hover:text-accent",
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={label}
        className={className}
        style={{ transition: "var(--fx)" }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={className}
      style={{ transition: "var(--fx)" }}
    >
      {children}
    </button>
  );
}
