"use client";

import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/utils";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";
import type { ResolvedTheme } from "@/lib/themes";

/**
 * One selectable palette in the theme picker.
 *
 * The tile scopes the palette to itself — its own `data-theme`, `data-dark` and
 * (for custom themes) the inline colour variables, exactly as they are applied
 * to <body>. So the swatches and the label are painted by the real tokens of the
 * theme on offer rather than by colour values duplicated in JS, and a light
 * palette previews correctly inside a dark workspace and vice versa.
 */
export function ThemeTile({
  theme,
  active,
  onSelect,
  action,
}: {
  theme: ResolvedTheme;
  active: boolean;
  onSelect: () => void;
  /** Optional corner control, e.g. edit/delete for a custom palette. */
  action?: ReactNode;
}) {
  return (
    <div
      data-theme={theme.attr}
      data-dark={theme.dark ? "" : undefined}
      style={theme.vars as CSSProperties}
      className={cx(
        "relative rounded-xl border bg-paper transition-all",
        active
          ? "border-accent ring-2 ring-accent"
          : "border-border hover:-translate-y-0.5 hover:shadow-panel",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={theme.label}
        onClick={onSelect}
        className="flex w-full flex-col gap-2.5 overflow-hidden rounded-xl p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* mini palette preview: accent, panel and grid, straight from tokens */}
        <span className="flex items-center gap-1.5">
          <span className="size-6 flex-none rounded-full bg-accent" />
          <span className="size-6 flex-none rounded-lg border border-border bg-panel" />
          <span className="h-1.5 flex-1 rounded-full bg-grid" />
        </span>
        <span className="flex items-center justify-between gap-1">
          <span className="truncate text-[12.5px] font-bold text-text">{theme.label}</span>
          {active && (
            <span className="grid size-4 flex-none place-items-center rounded-full bg-accent text-on-accent">
              <CheckIcon size={11} />
            </span>
          )}
        </span>
      </button>
      {action}
    </div>
  );
}
