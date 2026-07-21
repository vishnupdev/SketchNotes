/**
 * Workspace-wide theme registry. Each theme is a complete named palette; the
 * actual colour values live in `globals.css` under `[data-theme="<id>"]` so CSS
 * stays the single source of truth (see the "standardise the theme" rule).
 *
 * This module only carries the metadata JS needs: the id (drives the
 * `data-theme` attribute), a display label, and whether the palette is dark
 * (drives the canvas engine's ink/grid + the `data-dark` utility variant).
 * Add a theme here AND add its token block in `globals.css`.
 */
export interface ThemeDef {
  /** Stable id — matches the `[data-theme="<id>"]` block in globals.css. */
  id: string;
  /** Human label shown in the settings picker. */
  label: string;
  /** Whether this palette is dark (canvas ink/grid + `dark:` utilities). */
  dark: boolean;
}

/** Any registered theme id. */
export type ThemeId = string;

/**
 * The available themes. Light + Dark are the neutral base palettes; the rest
 * are colour-accented. Order here is the order shown in the picker.
 */
export const THEMES: ThemeDef[] = [
  { id: "light", label: "Light", dark: false },
  { id: "dark", label: "Dark", dark: true },
  { id: "ocean", label: "Ocean", dark: false },
  { id: "sunset", label: "Sunset", dark: false },
  { id: "grape", label: "Grape", dark: false },
  { id: "rose", label: "Rose", dark: false },
  { id: "forest", label: "Forest", dark: false },
  { id: "midnight", label: "Midnight", dark: true },
];

/** Theme applied before any preference is loaded (and on first SSR paint). */
export const DEFAULT_THEME_ID: ThemeId = "dark";

const DEFAULT_THEME = THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;

/** Resolve a theme id to its definition, falling back to the default. */
export const themeById = (id: string | null | undefined): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;

/** Type-guard: is `v` a known theme id? */
export const isThemeId = (v: unknown): v is ThemeId =>
  typeof v === "string" && THEMES.some((t) => t.id === v);
