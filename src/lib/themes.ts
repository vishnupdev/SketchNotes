/**
 * Workspace-wide theme registry. Each preset theme is a complete named palette;
 * the actual colour values live in `globals.css` under `[data-theme="<id>"]` so
 * CSS stays the single source of truth (see the "standardise the theme" rule).
 *
 * This module only carries the metadata JS needs: the id (drives the
 * `data-theme` attribute), a display label, and whether the palette is dark
 * (drives the canvas engine's ink/grid and the `data-dark` utility variant).
 * Add a preset here AND add its token block in `globals.css`.
 *
 * Custom themes work differently, because a palette the user mixed cannot live
 * in a static stylesheet. They reuse two shared token blocks
 * (`[data-theme="custom-light"]` / `[data-theme="custom-dark"]`) that derive the
 * whole palette from just two inputs — `--custom-accent` and `--custom-paper` —
 * which are set as inline custom properties. So even a user-made theme keeps its
 * colour maths in CSS; JS only carries the two colours the user chose.
 */

import { hexToRgb, isHex, luminance } from "@/lib/color";

export interface ThemeDef {
  /** Stable id — matches the `[data-theme="<id>"]` block in globals.css. */
  id: string;
  /** Human label shown in the settings picker. */
  label: string;
  /** Whether this palette is dark (canvas ink/grid + `dark:` utilities). */
  dark: boolean;
}

/** Any theme id — a preset's id, or `custom:<key>` for a user-made palette. */
export type ThemeId = string;

/**
 * The built-in themes, in picker order: the neutral base first, then the
 * colour-accented palettes. Light and dark are grouped separately in the UI, so
 * the two runs are kept contiguous here.
 */
export const THEMES: ThemeDef[] = [
  // ---- light ----
  { id: "light", label: "Light", dark: false },
  { id: "ocean", label: "Ocean", dark: false },
  { id: "sky", label: "Sky", dark: false },
  { id: "mint", label: "Mint", dark: false },
  { id: "forest", label: "Forest", dark: false },
  { id: "sunset", label: "Sunset", dark: false },
  { id: "clay", label: "Clay", dark: false },
  { id: "sand", label: "Sand", dark: false },
  { id: "olive", label: "Olive", dark: false },
  { id: "rose", label: "Rose", dark: false },
  { id: "grape", label: "Grape", dark: false },
  { id: "lavender", label: "Lavender", dark: false },
  { id: "slate", label: "Slate", dark: false },
  // ---- dark ----
  { id: "dark", label: "Dark", dark: true },
  { id: "midnight", label: "Midnight", dark: true },
  { id: "carbon", label: "Carbon", dark: true },
  { id: "abyss", label: "Abyss", dark: true },
  { id: "matrix", label: "Matrix", dark: true },
  { id: "nebula", label: "Nebula", dark: true },
  { id: "ember", label: "Ember", dark: true },
  { id: "wine", label: "Wine", dark: true },
  { id: "mocha", label: "Mocha", dark: true },
  { id: "arctic", label: "Arctic", dark: true },
  { id: "noir", label: "Noir", dark: true },
];

/** Theme applied before any preference is loaded (and on first SSR paint). */
export const DEFAULT_THEME_ID: ThemeId = "dark";

const DEFAULT_THEME = THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;

/** Preset themes with a light paper, in picker order. */
export const LIGHT_THEMES = THEMES.filter((t) => !t.dark);
/** Preset themes with a dark paper, in picker order. */
export const DARK_THEMES = THEMES.filter((t) => t.dark);

/** Resolve a preset id to its definition, falling back to the default. */
export const themeById = (id: string | null | undefined): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;

/** Type-guard: is `v` a known preset theme id? */
export const isPresetThemeId = (v: unknown): v is ThemeId =>
  typeof v === "string" && THEMES.some((t) => t.id === v);

/* ---------------------------- custom themes ---------------------------- */

/** A palette the user mixed themselves. */
export interface CustomTheme {
  /** `custom:<key>` — unique for the lifetime of the saved theme. */
  id: string;
  /** User-supplied name, shown in the picker. */
  label: string;
  /** Whether this is built on the dark base. */
  dark: boolean;
  /** Accent colour, `#rrggbb`. */
  accent: string;
  /** Page/paper colour, `#rrggbb`. */
  paper: string;
}

const CUSTOM_PREFIX = "custom:";

/** How many custom themes a user can keep, so the picker stays navigable. */
export const MAX_CUSTOM_THEMES = 12;

/** Is this id a custom theme rather than a preset? */
export const isCustomThemeId = (id: string | null | undefined): boolean =>
  typeof id === "string" && id.startsWith(CUSTOM_PREFIX);

/** Any id the app is willing to load from storage. */
export const isThemeId = (v: unknown): v is ThemeId =>
  isPresetThemeId(v) || (typeof v === "string" && isCustomThemeId(v));

/** A fresh custom-theme id. `key` only needs to be unique among saved themes. */
export const customThemeId = (key: string): string => `${CUSTOM_PREFIX}${key}`;

/** Starting point for a new custom theme: the current palette's own footing. */
export const NEW_CUSTOM_THEME: Omit<CustomTheme, "id" | "label"> = {
  dark: true,
  accent: "#1ba38e",
  paper: "#141a21",
};

/**
 * Foreground for text and glyphs sitting *on* the accent colour.
 *
 * The one value that cannot be derived in CSS: picking white or near-black is a
 * luminance decision, and `contrast-color()` is not yet broadly supported. Both
 * candidates are measured and the better one wins, so a custom accent of any
 * lightness keeps its label readable (rule #7's WCAG AA requirement).
 */
export function onAccentFor(accent: string): string {
  const light = "#ffffff";
  const dark = "#0d1319";
  const l = luminance(hexToRgb(accent));
  const contrastWithLight = 1.05 / (l + 0.05);
  const contrastWithDark = (l + 0.05) / (luminance(hexToRgb(dark)) + 0.05);
  return contrastWithLight >= contrastWithDark ? light : dark;
}

/** Normalise user input to `#rrggbb`, or null when it isn't a colour. */
export function normalizeHex(value: string): string | null {
  if (!isHex(value)) return null;
  const { r, g, b } = hexToRgb(value);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/* ------------------------------ resolution ----------------------------- */

/** Everything the DOM needs to display a theme, preset or custom. */
export interface ResolvedTheme {
  /** Value for the `data-theme` attribute. */
  attr: string;
  /** Whether to set `data-dark`. */
  dark: boolean;
  label: string;
  /**
   * Inline custom properties to set alongside the attribute. Empty for presets,
   * whose values come from their `globals.css` block.
   */
  vars: Record<string, string>;
}

/** The inline properties a custom theme sets; also the list to clear on switch. */
export const CUSTOM_THEME_VARS = ["--custom-accent", "--custom-paper", "--on-accent"] as const;

/**
 * Resolve any theme id — preset or custom — to its DOM representation.
 *
 * A custom id whose theme has since been deleted falls back to the default,
 * which is what stops a stale stored preference from rendering an unstyled
 * workspace.
 */
export function resolveTheme(
  id: string | null | undefined,
  customThemes: CustomTheme[] = [],
): ResolvedTheme {
  if (isCustomThemeId(id)) {
    const custom = customThemes.find((t) => t.id === id);
    if (custom) return resolveCustomTheme(custom);
  }
  const preset = themeById(id);
  return { attr: preset.id, dark: preset.dark, label: preset.label, vars: {} };
}

/** The DOM representation of one custom theme. */
export function resolveCustomTheme(theme: CustomTheme): ResolvedTheme {
  return {
    attr: theme.dark ? "custom-dark" : "custom-light",
    dark: theme.dark,
    label: theme.label,
    vars: {
      "--custom-accent": theme.accent,
      "--custom-paper": theme.paper,
      "--on-accent": onAccentFor(theme.accent),
    },
  };
}
