/**
 * Workspace-wide mouse-pointer registry.
 *
 * Each preset is a tiny SVG drawn at runtime from the *resolved* theme tokens
 * (`--text`, `--accent`, `--paper`) rather than from baked-in colour values, so
 * a pointer follows whatever palette is active — the same "CSS is the single
 * source of truth" rule the theme registry follows (see `@/lib/themes`).
 *
 * Two variants are produced per preset: `arrow` (the resting pointer) and
 * `hand` (over anything clickable). `globals.css` wires them up through the
 * `--cursor-arrow` / `--cursor-hand` custom properties written onto <body>.
 *
 * On top of the presets a person can bring their own pointer — any image or
 * emoji, rendered to a bitmap by `@/lib/cursor-image`.
 */

/** Which of the two states a bitmap is being painted for. */
export type CursorVariant = "arrow" | "hand";

/** Theme colours a pointer is painted with, read back from the CSS tokens. */
export interface CursorColors {
  /** Main foreground ink (`--text`). */
  ink: string;
  /** Theme accent (`--accent`). */
  accent: string;
  /** Page background (`--paper`) — used as the contrast outline. */
  paper: string;
}

export interface CursorDef {
  /** Stable id — also the `data-cursor` value on <body>. */
  id: string;
  /** Human label shown in the settings picker. */
  label: string;
  /** One-line description, used as the tile's accessible name. */
  hint: string;
  /**
   * Inner SVG markup, on a 24×24 grid. `ink` is the body colour; `paper` is
   * the outline that keeps the pointer visible on same-coloured surfaces.
   * `null` for the two presets with no art of their own: "system" and "custom".
   */
  art: ((ink: string, paper: string) => string) | null;
  /** Bitmap size in CSS pixels at the Medium size setting. */
  size: number;
  /** The pixel that actually points, in 24-grid units. */
  hot: [number, number];
}

/** Any registered pointer id. */
export type CursorId = string;

/* ------------------------------- the art -------------------------------- */
/* All drawn on a 24×24 grid, tip (or centre) placed on the declared hotspot.
   Every shape carries a `paper` outline so it survives on a same-coloured
   background — a pointer that vanishes on one surface is a broken pointer. */

const arrow = (ink: string, paper: string) =>
  `<path d="M4 2.2 L4 18.9 L8.4 14.8 L11.2 21 L14.3 19.6 L11.5 13.6 L17.4 13.6 Z" fill="${ink}" stroke="${paper}" stroke-width="1.5" stroke-linejoin="round"/>`;

const chevron = (ink: string, paper: string) =>
  `<path d="M4 2.4 L18.8 12.3 L11.9 13.3 L8.9 19.9 Z" fill="${ink}" stroke="${paper}" stroke-width="1.4" stroke-linejoin="round"/>`;

const hand = (ink: string, paper: string) =>
  `<path d="M9.2 2.4 a1.7 1.7 0 0 1 1.7 1.7 v6.2 h.9 V6.9 a1.6 1.6 0 0 1 3.2 0 v3.4 h.9 V8.2 a1.6 1.6 0 0 1 3.2 0 v6.2 c0 3.2-2.1 5.2-5.2 5.2 h-1.9 c-1.6 0-3-.7-4-1.9 L4.2 13.4 a1.6 1.6 0 0 1 2.3-2.2 l1.2 1.2 V4.1 a1.7 1.7 0 0 1 1.5-1.7 z" fill="${ink}" stroke="${paper}" stroke-width="1.3" stroke-linejoin="round"/>`;

const CROSS = "M12 2.8V9.2M12 14.8V21.2M2.8 12H9.2M14.8 12H21.2";
const crosshair = (ink: string, paper: string) =>
  `<path d="${CROSS}" fill="none" stroke="${paper}" stroke-width="3.6" stroke-linecap="round"/>` +
  `<path d="${CROSS}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>` +
  `<circle cx="12" cy="12" r="1.1" fill="${ink}"/>`;

const dot = (ink: string, paper: string) =>
  `<circle cx="12" cy="12" r="6.4" fill="none" stroke="${paper}" stroke-width="1.6" opacity=".85"/>` +
  `<circle cx="12" cy="12" r="5" fill="${ink}"/>`;

const ring = (ink: string, paper: string) =>
  `<circle cx="12" cy="12" r="8.6" fill="none" stroke="${paper}" stroke-width="1.3" opacity=".7"/>` +
  `<circle cx="12" cy="12" r="7.4" fill="none" stroke="${ink}" stroke-width="2.1"/>` +
  `<circle cx="12" cy="12" r="1.5" fill="${ink}"/>`;

const pen = (ink: string, paper: string) =>
  `<path d="M2.6 2.6 L10.4 6 L20.3 15.9 A2.2 2.2 0 0 1 17.1 19.1 L7.2 9.2 Z" fill="${ink}" stroke="${paper}" stroke-width="1.4" stroke-linejoin="round"/>` +
  `<path d="M4.6 4.6 L9.6 9.6" stroke="${paper}" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>`;

const pencil = (ink: string, paper: string) =>
  // graphite tip, barrel, then the ferrule/eraser end
  `<path d="M2.4 2.4 L7.6 4.3 L4.3 7.6 Z" fill="${ink}" stroke="${paper}" stroke-width="1.1" stroke-linejoin="round"/>` +
  `<path d="M5.2 8.6 L8.6 5.2 L16.4 13 L13 16.4 Z" fill="${ink}" stroke="${paper}" stroke-width="1.1" stroke-linejoin="round"/>` +
  `<path d="M13.8 17.2 L17.2 13.8 L19.4 16 a2.4 2.4 0 0 1 -3.4 3.4 Z" fill="${ink}" stroke="${paper}" stroke-width="1.1" stroke-linejoin="round" opacity=".85"/>`;

const brush = (ink: string, paper: string) =>
  // splayed bristles at the tip, round handle trailing behind
  `<path d="M2.4 2.4 C4.4 6.2 5.8 8 8.4 9.8 L10.6 7.6 C8.8 5 6.2 3.4 2.4 2.4 Z" fill="${ink}" stroke="${paper}" stroke-width="1.1" stroke-linejoin="round"/>` +
  `<path d="M9.8 11.2 L11.4 9.6 L19.9 18.1 a1.7 1.7 0 0 1 -2.4 2.4 Z" fill="${ink}" stroke="${paper}" stroke-width="1.2" stroke-linejoin="round" opacity=".9"/>`;

const sparkle = (ink: string, paper: string) =>
  `<path d="M12 2.2 C13.1 8.2 15.8 10.9 21.8 12 C15.8 13.1 13.1 15.8 12 21.8 C10.9 15.8 8.2 13.1 2.2 12 C8.2 10.9 10.9 8.2 12 2.2 Z" fill="${ink}" stroke="${paper}" stroke-width="1.2" stroke-linejoin="round"/>`;

const star = (ink: string, paper: string) =>
  `<path d="M12 2.6 L14.35 8.76 L20.94 9.09 L15.8 13.24 L17.53 19.6 L12 16 L6.47 19.6 L8.2 13.24 L3.06 9.09 L9.65 8.76 Z" fill="${ink}" stroke="${paper}" stroke-width="1.2" stroke-linejoin="round"/>`;

const heart = (ink: string, paper: string) =>
  `<path d="M12 21 C11.2 21 3 15.3 3 9.3 C3 6.4 5.2 4.2 8 4.2 C9.7 4.2 11.2 5.1 12 6.5 C12.8 5.1 14.3 4.2 16 4.2 C18.8 4.2 21 6.4 21 9.3 C21 15.3 12.8 21 12 21 Z" fill="${ink}" stroke="${paper}" stroke-width="1.2" stroke-linejoin="round"/>`;

/** Retro 8-bit pointer: whole cells only, each with a hairline so it reads as pixels. */
const pixel = (ink: string, paper: string) => {
  const cells: [number, number, number][] = [
    // [x, y, width] — every row is 2 units tall, on a 2-unit grid
    [5, 2, 2],
    [5, 4, 4],
    [5, 6, 6],
    [5, 8, 8],
    [5, 10, 10],
    [5, 12, 12],
    [5, 14, 6],
    [5, 16, 2],
    [11, 16, 4],
    [13, 18, 4],
  ];
  return (
    `<g fill="${ink}" stroke="${paper}" stroke-width="0.9" shape-rendering="crispEdges">` +
    cells.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="2"/>`).join("") +
    `</g>`
  );
};

/**
 * The available pointers. "System" is first and is the default: it leaves the
 * browser/OS cursor completely alone. "Custom" is last and only selectable
 * once an image or emoji has been supplied. Order here is the picker's order:
 * everyday shapes, then the drawing tools, then the playful ones.
 */
export const CURSORS: CursorDef[] = [
  { id: "system", label: "System", hint: "Your device's own pointer", art: null, size: 24, hot: [4, 2] },
  { id: "arrow", label: "Arrow", hint: "The classic pointer", art: arrow, size: 24, hot: [4, 2] },
  { id: "chevron", label: "Chevron", hint: "Slim, modern arrow", art: chevron, size: 24, hot: [4, 2] },
  { id: "hand", label: "Hand", hint: "A pointing finger", art: hand, size: 26, hot: [9, 2] },
  { id: "crosshair", label: "Crosshair", hint: "Precise cross with an open centre", art: crosshair, size: 26, hot: [12, 12] },
  { id: "dot", label: "Dot", hint: "Small and out of the way", art: dot, size: 20, hot: [12, 12] },
  { id: "ring", label: "Ring", hint: "See-through, precise centre", art: ring, size: 28, hot: [12, 12] },
  { id: "pen", label: "Pen", hint: "A nib, matching the sketch tools", art: pen, size: 26, hot: [3, 3] },
  { id: "pencil", label: "Pencil", hint: "Sharpened pencil", art: pencil, size: 26, hot: [3, 3] },
  { id: "brush", label: "Brush", hint: "Splayed paintbrush", art: brush, size: 26, hot: [3, 3] },
  { id: "sparkle", label: "Sparkle", hint: "Four-point sparkle", art: sparkle, size: 26, hot: [12, 12] },
  { id: "star", label: "Star", hint: "Five-point star", art: star, size: 26, hot: [12, 12] },
  { id: "heart", label: "Heart", hint: "A heart", art: heart, size: 26, hot: [12, 12] },
  { id: "pixel", label: "Pixel", hint: "Retro 8-bit pointer", art: pixel, size: 24, hot: [5, 2] },
  { id: "custom", label: "Custom", hint: "Your own image or emoji", art: null, size: 32, hot: [0, 0] },
];

/** The id of the bring-your-own pointer, which is painted from a bitmap. */
export const CUSTOM_CURSOR_ID = "custom";

/** Pointer used before any preference is loaded: whatever the device provides. */
export const DEFAULT_CURSOR_ID: CursorId = "system";

const DEFAULT_CURSOR = CURSORS.find((c) => c.id === DEFAULT_CURSOR_ID)!;

/** Resolve a pointer id to its definition, falling back to the default. */
export const cursorById = (id: string | null | undefined): CursorDef =>
  CURSORS.find((c) => c.id === id) ?? DEFAULT_CURSOR;

/** Type-guard: is `v` a known pointer id? */
export const isCursorId = (v: unknown): v is CursorId =>
  typeof v === "string" && CURSORS.some((c) => c.id === v);

/* ------------------------------ sizing ---------------------------------- */

export interface CursorScaleDef {
  id: string;
  label: string;
  /** Multiplier on each preset's base size. */
  scale: number;
}

/** Pointer sizes. Medium is each preset's natural size. */
export const CURSOR_SCALES: CursorScaleDef[] = [
  { id: "s", label: "Small", scale: 0.8 },
  { id: "m", label: "Medium", scale: 1 },
  { id: "l", label: "Large", scale: 1.35 },
  { id: "xl", label: "Huge", scale: 1.8 },
];

export type CursorScaleId = string;

export const DEFAULT_SCALE_ID: CursorScaleId = "m";

export const isCursorScaleId = (v: unknown): v is CursorScaleId =>
  typeof v === "string" && CURSOR_SCALES.some((s) => s.id === v);

const scaleFor = (id: CursorScaleId) =>
  CURSOR_SCALES.find((s) => s.id === id)?.scale ?? 1;

/**
 * Final bitmap size for a preset at a given size setting. Capped at 96px:
 * browsers ignore cursor images beyond ~128px, and a pointer that silently
 * disappears is worse than one that stops growing.
 */
export const cursorPx = (def: CursorDef, scaleId: CursorScaleId): number =>
  Math.min(96, Math.max(14, Math.round(def.size * scaleFor(scaleId))));

/* ------------------------------- colour --------------------------------- */

export interface CursorInkDef {
  id: string;
  label: string;
}

/**
 * How a pointer is coloured. "Theme" is the two-tone default — the text colour
 * at rest, the accent over anything clickable — so the pointer itself tells you
 * what is interactive.
 */
export const CURSOR_INKS: CursorInkDef[] = [
  { id: "theme", label: "Theme" },
  { id: "accent", label: "Accent" },
  { id: "custom", label: "Pick a colour" },
];

export type CursorInkId = string;

export const DEFAULT_INK_ID: CursorInkId = "theme";

export const isCursorInkId = (v: unknown): v is CursorInkId =>
  typeof v === "string" && CURSOR_INKS.some((i) => i.id === v);

/* ---------------------------- the settings ------------------------------ */

/** A pointer supplied by the person using the app. */
export interface CustomCursor {
  /** Square PNG data URL at {@link CUSTOM_MASTER_PX}, ready to be resized. */
  src: string;
  /** Which pixel points: the top-left corner, or the middle of the image. */
  hot: "tip" | "center";
  /** What it was made from, shown in the UI (a file name or the emoji). */
  name: string;
}

/** Everything the pointer picker holds, persisted as one blob. */
export interface CursorSettings {
  id: CursorId;
  scale: CursorScaleId;
  ink: CursorInkId;
  /** Used when `ink` is "custom". */
  color: string;
  custom: CustomCursor | null;
}

export const DEFAULT_CURSOR_SETTINGS: CursorSettings = {
  id: DEFAULT_CURSOR_ID,
  scale: DEFAULT_SCALE_ID,
  ink: DEFAULT_INK_ID,
  color: "#7c8896",
  custom: null,
};

/**
 * Coerce an untrusted stored value into usable settings. Accepts the plain
 * id string written by the first version of this feature, and maps its
 * retired "large" preset onto the size control that replaced it.
 */
export function normalizeCursorSettings(raw: unknown): CursorSettings {
  const d = DEFAULT_CURSOR_SETTINGS;
  if (typeof raw === "string") {
    if (raw === "large") return { ...d, id: "arrow", scale: "l" };
    return { ...d, id: isCursorId(raw) ? raw : d.id };
  }
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<CursorSettings>;
  const custom =
    o.custom &&
    typeof o.custom.src === "string" &&
    o.custom.src.startsWith("data:image/")
      ? {
          src: o.custom.src,
          hot: o.custom.hot === "center" ? ("center" as const) : ("tip" as const),
          name: typeof o.custom.name === "string" ? o.custom.name : "Custom",
        }
      : null;
  const id = isCursorId(o.id) ? o.id : d.id;
  return {
    // A custom pointer with no image left would show nothing at all.
    id: id === CUSTOM_CURSOR_ID && !custom ? d.id : id,
    scale: isCursorScaleId(o.scale) ? o.scale : d.scale,
    ink: isCursorInkId(o.ink) ? o.ink : d.ink,
    color: typeof o.color === "string" && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : d.color,
    custom,
  };
}

/** Resolve the body colour for each variant from the settings and the theme. */
export function cursorInk(
  settings: CursorSettings,
  colors: CursorColors,
): Record<CursorVariant, string> {
  switch (settings.ink) {
    case "accent":
      return { arrow: colors.accent, hand: colors.accent };
    case "custom":
      return { arrow: settings.color, hand: settings.color };
    default:
      return { arrow: colors.ink, hand: colors.accent };
  }
}

/* ----------------------------- rendering -------------------------------- */

/** Everything needed to paint one pointer bitmap. */
export interface CursorPaint {
  /** Body colour. */
  ink: string;
  /** Outline colour. */
  paper: string;
  /** Rendered bitmap size in CSS px. */
  px: number;
}

/**
 * The pointer bitmap on its own, as a CSS `url()` — usable anywhere an image
 * is (the settings preview draws it as a background). `null` for presets with
 * no art of their own ("system" and "custom").
 */
export function cursorImage(def: CursorDef, paint: CursorPaint): string | null {
  if (!def.art) return null;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paint.px}" height="${paint.px}" viewBox="0 0 24 24">` +
    def.art(paint.ink, paint.paper) +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Build the full `cursor` value for one variant: the image, its hotspot, and a
 * native keyword fallback for browsers that reject the bitmap. `null` for
 * presets with no art of their own.
 */
export function cursorCss(
  def: CursorDef,
  paint: CursorPaint,
  variant: CursorVariant,
): string | null {
  const image = cursorImage(def, paint);
  if (!image) return null;
  // Hotspots are authored on the 24-grid, so scale them to the bitmap size.
  const k = paint.px / 24;
  const x = Math.round(def.hot[0] * k);
  const y = Math.round(def.hot[1] * k);
  return `${image} ${x} ${y}, ${variant === "hand" ? "pointer" : "default"}`;
}

/** The same, for a bring-your-own bitmap already rendered at `px` square. */
export function customCursorCss(
  src: string,
  px: number,
  hot: CustomCursor["hot"],
  variant: CursorVariant,
): string {
  const offset = hot === "center" ? Math.round(px / 2) : 0;
  return `url("${src}") ${offset} ${offset}, ${variant === "hand" ? "pointer" : "default"}`;
}

/** Bitmap size a custom pointer is stored at, before being resized to fit. */
export const CUSTOM_MASTER_PX = 96;

/** Size a custom pointer is shown at, for a given size setting. */
export const customCursorPx = (scaleId: CursorScaleId): number =>
  Math.min(96, Math.max(16, Math.round(32 * scaleFor(scaleId))));
