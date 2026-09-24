/**
 * Watch Party's control styles, written once. They match the pill buttons and
 * fields every pairing screen in the workspace uses (File Drop's panels), so a
 * guest moving between the two apps meets the same controls.
 */

/*
 * Every state is a *whole* class string, never a base plus an override: two
 * utilities for the same property (`border-border` and `border-accent`) are
 * both in the stylesheet, and which one wins is decided by the order Tailwind
 * emits them — not by the order they are written in `className`.
 */

const BTN_SHAPE =
  "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40";

/** A pill button. `on` for a pressed toggle; `small` for a compact row action. */
export const btn = (on = false, small = false): string =>
  [
    BTN_SHAPE,
    small ? "min-h-8 px-3 py-1 text-[12px]" : "min-h-10 px-3.5 py-2 text-[12.5px]",
    on
      ? "border-accent bg-accent-soft text-accent"
      : "border-border bg-panel text-text hover:border-accent hover:text-accent",
  ].join(" ");

export const BTN = btn();

export const BTN_ACCENT =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40";

export const BTN_DANGER =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-danger px-3.5 py-2 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-danger";

/** A round icon-only button. Always given an aria-label where used. */
export const ICON_BTN =
  "grid size-10 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40";

export const FIELD =
  "w-full min-w-0 rounded-[10px] border-[1.5px] border-border bg-panel px-3 py-2.5 text-[13.5px] text-text outline-none placeholder:text-ink-soft focus:border-accent focus:ring-2 focus:ring-accent/25";

export const CODE_FIELD =
  "w-full resize-y rounded-[9px] border-[1.5px] border-border bg-panel px-2.5 py-2 font-mono text-[11.5px] wrap-anywhere text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

export const LABEL = "font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft";

/** A panel. `on` draws it in the accent — the one card a screen wants you to use. */
export const card = (on = false): string =>
  `flex flex-col gap-3 rounded-2xl border bg-panel p-4 ${on ? "border-accent" : "border-border"}`;

export const CARD = card();

export const SECTION_TITLE = "text-[14px] font-bold text-text";
