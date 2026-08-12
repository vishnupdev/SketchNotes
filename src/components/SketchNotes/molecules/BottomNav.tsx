"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface BottomNavItem<T extends string> {
  id: T;
  /** Short label under the icon — keep it to one word where possible. */
  label: string;
  icon: ReactNode;
  /** Longer description, shown as a tooltip. */
  hint?: string;
  /** Id of the panel this tab controls, for `aria-controls`. */
  controls?: string;
}

interface BottomNavProps<T extends string> {
  /** Names the tab strip for assistive tech, e.g. "Morse tools". */
  label: string;
  items: BottomNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Widest the floating bar grows on desktop. */
  maxWidth?: number;
}

/**
 * The floating bottom tab bar an app switches its main views with: a glass pill
 * lifted off the bottom of the screen, the active tab raised out of it as an
 * accent-filled circle with a halo beneath.
 *
 * Fixed to the viewport and offset above the sticky {@link AppFooter} by
 * `--footer-h`, so it never covers the credit line. Give the app's scroll
 * container the `bottom-nav-clear` utility so content scrolls out from under it.
 *
 * The lift is a `transform`, never a size or margin change: the bar's height is
 * constant, so switching tabs costs no layout and shifts nothing (rule #7). The
 * global reduced-motion rule drops the transition while keeping the raised
 * state, which is what marks the tab as current.
 *
 * On top of the lift, the icon of the tab that just became current gives a
 * small pop, so the bar acknowledges the tap on the same frame the panel behind
 * it animates in. It rides on a span of its own rather than on the raised
 * circle, because that one is already carrying the lift and a keyframed
 * transform would replace it outright.
 */
export function BottomNav<T extends string>({
  label,
  items,
  value,
  onChange,
  maxWidth = 420,
}: BottomNavProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      /* bg-paper, not bg-panel: app content scrolls underneath this bar, and the
         translucent panel glass let high-contrast content show through far
         enough to fight the labels. Paper is opaque and still picks up the
         ambient field, so the bar reads as one surface at any scroll position. */
      className="fixed left-1/2 z-30 flex -translate-x-1/2 items-stretch gap-1 rounded-[26px] border border-border bg-paper px-2 shadow-panel"
      style={{
        width: `min(calc(100% - 20px), ${maxWidth}px)`,
        height: "var(--bottom-nav-h)",
        bottom: "calc(var(--footer-h) + 0.625rem)",
      }}
    >
      {items.map(({ id, label: itemLabel, icon, hint, controls }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={controls}
            title={hint ?? itemLabel}
            onClick={() => onChange(id)}
            className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              className={cx(
                "grid size-11 flex-none place-items-center rounded-full",
                active
                  ? "-translate-y-5 bg-accent text-on-accent shadow-(--nav-glow) ring-4 ring-paper"
                  : "text-ink-soft group-hover:text-accent",
              )}
              style={{ transition: "var(--fx)" }}
            >
              {/* The attribute exists only while this tab is selected, so
                  selecting it is itself what starts the pop — no JS involved. */}
              <span data-nav-tab={active ? "on" : undefined} className="grid place-items-center">
                {icon}
              </span>
            </span>
            <span
              className={cx(
                "max-w-full truncate text-[10.5px] font-semibold leading-none",
                active ? "text-accent" : "text-ink-soft group-hover:text-accent",
              )}
              style={{ transition: "var(--fx)" }}
            >
              {itemLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
