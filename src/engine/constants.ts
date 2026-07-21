import type { Theme, Tool } from "./types";

/** Hand-drawn font stack used for text elements and export. */
export const FONT =
  "'Segoe Print','Bradley Hand','Comic Sans MS','Chalkboard SE',cursive";

/**
 * Selectable text-element font families, keyed by the value stored on the
 * element. Stacks lean on fonts commonly installed on Windows/macOS so text
 * renders correctly fully offline (no web fonts are loaded).
 */
export type FontKey =
  | "hand"
  | "marker"
  | "script"
  | "sans"
  | "soft"
  | "serif"
  | "slab"
  | "condensed"
  | "display"
  | "mono";
export const FONTS: Record<FontKey, { label: string; stack: string }> = {
  hand: { label: "Hand", stack: FONT },
  marker: { label: "Marker", stack: "'Ink Free','Marker Felt','Comic Sans MS','Chalkboard SE',cursive" },
  script: { label: "Script", stack: "'Segoe Script','Brush Script MT','Snell Roundhand','Apple Chancery',cursive" },
  sans: { label: "Sans", stack: "ui-sans-serif,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  soft: { label: "Soft", stack: "'Trebuchet MS',Verdana,'Segoe UI',sans-serif" },
  serif: { label: "Serif", stack: "Georgia,'Times New Roman',Times,serif" },
  slab: { label: "Slab", stack: "Rockwell,'Roboto Slab','Courier New',Georgia,serif" },
  condensed: { label: "Narrow", stack: "'Arial Narrow','Roboto Condensed','Segoe UI',sans-serif" },
  display: { label: "Display", stack: "Impact,Haettenschweiler,'Arial Black','Franklin Gothic Bold',sans-serif" },
  mono: { label: "Mono", stack: "ui-monospace,'SF Mono',Menlo,Consolas,'Courier New',monospace" },
};
export const FONT_KEYS = Object.keys(FONTS) as FontKey[];
/** Default font family for new text. */
export const DEFAULT_FONT: FontKey = "hand";
/** Resolve an element's font key to a CSS font stack (falls back to Hand). */
export const fontStack = (f?: string): string =>
  (f && FONTS[f as FontKey] ? FONTS[f as FontKey] : FONTS[DEFAULT_FONT]).stack;

/** Text-size presets (world px) offered in the text-style picker. */
export const TEXT_SIZES = [14, 18, 24, 32, 48, 64] as const;
/** Default text size (world px) for new text. */
export const DEFAULT_TEXT_SIZE = 21;
/** Bounds for the text size, guarding manual/edge values. */
export const MIN_TEXT_SIZE = 8;
export const MAX_TEXT_SIZE = 160;

/** The colour palette shown in the colour popover. `auto` = theme ink. */
export const COLORS: readonly string[] = [
  "auto",
  "#e23b2e",
  "#f06400",
  "#f5a300",
  "#e8c400",
  "#7bb800",
  "#1e9e6a",
  "#12b0a8",
  "#2d7ff0",
  "#3b4cc4",
  "#8b5cf6",
  "#c94db0",
  "#e0567f",
  "#8a5a3c",
  "#6b7684",
  "#ffffff",
];

/** Stroke widths, indexed by the width picker. */
export const WIDTHS = [2, 4, 7] as const;

/** Default emoji glyph size in world units. */
export const EMOJI_SIZE = 44;

/** CSS cursor per tool while hovering the canvas. */
export const CURSORS: Record<string, string> = {
  select: "default",
  pen: "crosshair",
  eraser: "crosshair",
  line: "crosshair",
  arrow: "crosshair",
  rect: "crosshair",
  ellipse: "crosshair",
  text: "text",
  emoji: "copy",
};

/** Resolved ink colours for the `auto` sentinel, per theme. */
export const AUTO_LIGHT = "#1f2a33";
export const AUTO_DARK = "#e8eef2";

/** Theme-dependent canvas colours. */
export const gridColor = (dark: boolean) => (dark ? "#2b3541" : "#d5dbe3");
export const accentColor = (dark: boolean) => (dark ? "#1ba38e" : "#0f7b6c");
export const themeBg = (dark: boolean) => (dark ? "#141a21" : "#ffffff");

/** Resolves the special `auto` colour to the theme default ink. */
export const mapColor = (c: string, dark: boolean): string =>
  c === "auto" ? (dark ? AUTO_DARK : AUTO_LIGHT) : c;

/** Zoom bounds. */
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5;

/** Max number of undo snapshots retained. */
export const HISTORY_LIMIT = 60;

/** The non-shape tools that draw two-corner geometry. */
export const CORNER_TOOLS: Tool[] = ["line", "arrow", "rect", "ellipse"];

export const DEFAULT_THEME: Theme = "dark";
