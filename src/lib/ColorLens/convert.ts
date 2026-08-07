/**
 * Colour-space maths for Color Lens. Pure functions, no DOM — so the same code
 * runs for a pixel picked off a photo, a swatch in an extracted palette and a
 * generated harmony.
 *
 * Everything is sRGB-based: hex/RGB in, and HSL, HSV, CMYK, XYZ, L*a*b* and LCH
 * out. Conversions use the D65 white point, matching what browsers and design
 * tools assume.
 */

import type { CMYK, HSL, HSV, LAB, LCH, RGB, XYZ } from "./types";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Round to `places` decimals without float dust ("0.30000000000000004"). */
const round = (v: number, places = 0) => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

/* ------------------------------- hex ↔ rgb ------------------------------- */

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

/** `{r,g,b}` → lowercase `#rrggbb`. */
export function rgbToHex({ r, g, b }: RGB): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/**
 * Parse `#rgb`, `#rrggbb` (with or without the hash) into channels. Anything
 * unparseable comes back black rather than throwing — callers are parsing user
 * input and a picked pixel is never invalid.
 */
export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Whether a string is a colour this app can read. */
export const isHex = (value: string): boolean =>
  /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

/** The 3-digit form when it round-trips exactly, else null. */
export function shortHex(hex: string): string | null {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return null;
  const short = h[0] === h[1] && h[2] === h[3] && h[4] === h[5];
  return short ? `#${h[0]}${h[2]}${h[4]}` : null;
}

/* ------------------------------- rgb ↔ hsl ------------------------------- */

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: round(h), s: round(s * 100), l: round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

/* ------------------------------- rgb ↔ hsv ------------------------------- */

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: round(h), s: round((max === 0 ? 0 : d / max) * 100), v: round(max * 100) };
}

/* ------------------------------ rgb → cmyk ------------------------------- */

/** Naive (device-independent) CMYK — what design tools show before profiling. */
export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  // Pure black: the other inks are undefined (0/0), so report no ink.
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: round(((1 - rn - k) / (1 - k)) * 100),
    m: round(((1 - gn - k) / (1 - k)) * 100),
    y: round(((1 - bn - k) / (1 - k)) * 100),
    k: round(k * 100),
  };
}

/* -------------------------- rgb → xyz → lab/lch -------------------------- */

/** Undo the sRGB transfer function, giving linear-light 0–1. */
const linearize = (c: number): number => {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
};

export function rgbToXyz(rgb: RGB): XYZ {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);
  return {
    x: round((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100, 2),
    y: round((r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100, 2),
    z: round((r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100, 2),
  };
}

// D65 reference white, 2° observer.
const WHITE: XYZ = { x: 95.047, y: 100, z: 108.883 };

export function rgbToLab(rgb: RGB): LAB {
  const xyz = rgbToXyz(rgb);
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(xyz.x / WHITE.x);
  const fy = f(xyz.y / WHITE.y);
  const fz = f(xyz.z / WHITE.z);
  return {
    l: round(116 * fy - 16, 2),
    a: round(500 * (fx - fy), 2),
    b: round(200 * (fy - fz), 2),
  };
}

export function labToLch({ l, a, b }: LAB): LCH {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: round(l, 2), c: round(c, 2), h: round(h, 2) };
}

/* ------------------------------ perception ------------------------------- */

/** WCAG 2.x relative luminance, 0 (black) – 1 (white). */
export function luminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two colours, 1–21. Order doesn't matter. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Perceived brightness 0–100 (ITU-R BT.601), the classic "is it light?" test. */
export function brightness({ r, g, b }: RGB): number {
  return round(((r * 299 + g * 587 + b * 114) / 1000 / 255) * 100);
}

/* -------------------------------- strings -------------------------------- */

export const rgbCss = ({ r, g, b }: RGB): string => `rgb(${r}, ${g}, ${b})`;
export const hslCss = ({ h, s, l }: HSL): string => `hsl(${h}, ${s}%, ${l}%)`;
export const hsvText = ({ h, s, v }: HSV): string => `${h}°, ${s}%, ${v}%`;
export const cmykText = ({ c, m, y, k }: CMYK): string => `${c}%, ${m}%, ${y}%, ${k}%`;
export const labText = ({ l, a, b }: LAB): string => `${l}, ${a}, ${b}`;
export const lchText = ({ l, c, h }: LCH): string => `${l}, ${c}, ${h}°`;
export const xyzText = ({ x, y, z }: XYZ): string => `${x}, ${y}, ${z}`;

/* ------------------------------ adjustments ------------------------------ */

/** Shift hue by `deg`, keeping saturation and lightness. */
export function rotateHue(rgb: RGB, deg: number): RGB {
  const hsl = rgbToHsl(rgb);
  return hslToRgb({ ...hsl, h: (hsl.h + deg + 360) % 360 });
}

/** Mix toward white (`amount` > 0) — a tint. */
export function tint(rgb: RGB, amount: number): RGB {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * amount),
    g: Math.round(rgb.g + (255 - rgb.g) * amount),
    b: Math.round(rgb.b + (255 - rgb.b) * amount),
  };
}

/** Mix toward black — a shade. */
export function shade(rgb: RGB, amount: number): RGB {
  return {
    r: Math.round(rgb.r * (1 - amount)),
    g: Math.round(rgb.g * (1 - amount)),
    b: Math.round(rgb.b * (1 - amount)),
  };
}
