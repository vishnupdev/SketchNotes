/**
 * sRGB primitives shared across the workspace.
 *
 * These four started out inside Color Lens, but they are not that app's
 * business: the theme system needs the same maths to decide whether a custom
 * accent takes white or near-black text on top of it, and to grade the contrast
 * of a palette the user mixed. Rather than copy them into a second place (or
 * have shared settings code reach into an app's internals, which rule #5
 * forbids), they live here and `lib/ColorLens/convert.ts` re-exports them, so
 * every existing Color Lens import keeps working unchanged.
 *
 * Pure functions, no DOM.
 */

/** 8-bit sRGB channels, 0–255. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Whether a string is a colour this workspace can read. */
export const isHex = (value: string): boolean =>
  /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

/**
 * Parse `#rgb`, `#rrggbb` (with or without the hash) into channels. Anything
 * unparseable comes back black rather than throwing — callers are parsing user
 * input and a picked pixel is never invalid.
 */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Undo the sRGB transfer function for one channel — the basis of luminance. */
export const linearize = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance, 0 (black) – 1 (white). */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two colours, 1–21. Order doesn't matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Contrast ratio between two hex colours — the common case for callers. */
export const hexContrast = (a: string, b: string): number =>
  contrastRatio(hexToRgb(a), hexToRgb(b));
