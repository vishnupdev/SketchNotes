/**
 * Interface styles and density — the workspace's *shape*, as opposed to its
 * colour (see `@/lib/themes`).
 *
 * A theme changes what colour a panel is. A style changes what a panel *is*:
 * frosted glass over an ambient field, a flat opaque card, a squared-off slab, or
 * an outline with no fill at all — plus how round its corners are, how far it
 * lifts off the page, and how tightly its contents are packed.
 *
 * How it reaches every component without editing any of them: Tailwind v4
 * compiles `rounded-xl` to `border-radius: var(--radius-xl)` and `p-4` to
 * `calc(var(--spacing) * 4)`. Those are ordinary custom properties, so
 * redefining them on <body> — which is what `data-ui` and `data-density` do,
 * exactly like `data-theme` — restyles the whole workspace at once. The material
 * (blur, sheen, bevel, elevation) rides on the glass tokens that
 * `globals.css` already owned.
 *
 * Values live in `globals.css` under `[data-ui="<id>"]` / `[data-density="<id>"]`,
 * so CSS stays the single source of truth. This module carries only the metadata
 * JS needs. Add a style here AND add its block there.
 */

export interface UiStyleDef {
  /** Stable id — matches the `[data-ui="<id>"]` block in globals.css. */
  id: string;
  label: string;
  /** One line on what the style does, shown under the label in Settings. */
  blurb: string;
}

/** The available interface styles, in picker order. */
export const UI_STYLES: UiStyleDef[] = [
  {
    id: "glass",
    label: "Glass",
    blurb: "Frosted, translucent panels over a soft ambient wash. The original look.",
  },
  {
    id: "solid",
    label: "Solid",
    blurb: "Opaque cards with a gentle lift. No blur, no tint — quicker to read.",
  },
  {
    id: "soft",
    label: "Soft",
    blurb: "Generous round corners and a wide, diffuse shadow. Calm and friendly.",
  },
  {
    id: "sharp",
    label: "Sharp",
    blurb: "Square corners and a tight shadow. Precise, dense, technical.",
  },
  {
    id: "outline",
    label: "Outline",
    blurb: "Borders instead of shadows. The least visual noise, the clearest edges.",
  },
];

export const DEFAULT_UI_STYLE = "glass";

export interface DensityDef {
  id: string;
  label: string;
  /** One line on the trade-off, shown as the control's hint. */
  blurb: string;
}

/**
 * How tightly the workspace is packed. Scales Tailwind's whole spacing ramp, so
 * padding, gaps and control sizes move together.
 */
export const DENSITIES: DensityDef[] = [
  { id: "compact", label: "Compact", blurb: "More on screen at once" },
  { id: "cosy", label: "Cosy", blurb: "The balanced default" },
  { id: "roomy", label: "Roomy", blurb: "More breathing room, easier targets" },
];

export const DEFAULT_DENSITY = "cosy";

export const isUiStyleId = (v: unknown): v is string =>
  typeof v === "string" && UI_STYLES.some((s) => s.id === v);

export const isDensityId = (v: unknown): v is string =>
  typeof v === "string" && DENSITIES.some((d) => d.id === v);

/** Resolve a stored value to a usable style id. */
export const uiStyleById = (id: string | null | undefined): UiStyleDef =>
  UI_STYLES.find((s) => s.id === id) ?? UI_STYLES[0];

/** Resolve a stored value to a usable density id. */
export const densityById = (id: string | null | undefined): DensityDef =>
  DENSITIES.find((d) => d.id === id) ?? DENSITIES[1];
