/**
 * Shared shapes for Color Lens — the app that reads complete colour details out
 * of a photo. Every value here is plain JSON so picks can be persisted.
 */

/** Channels 0–255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Hue 0–360, saturation/lightness 0–100. */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/** Hue 0–360, saturation/value 0–100. */
export interface HSV {
  h: number;
  s: number;
  v: number;
}

/** Ink percentages 0–100. */
export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

/** CIE XYZ, D65, nominally 0–100. */
export interface XYZ {
  x: number;
  y: number;
  z: number;
}

/** CIE L*a*b*, D65. L 0–100, a/b roughly −128–127. */
export interface LAB {
  l: number;
  a: number;
  b: number;
}

/** Cylindrical L*a*b*. Chroma ≥ 0, hue 0–360. */
export interface LCH {
  l: number;
  c: number;
  h: number;
}

/** The nearest CSS named colour to a sample. */
export interface ColorName {
  name: string;
  hex: string;
  /** True when the sample *is* that colour, not merely closest to it. */
  exact: boolean;
  /** CIE76 ΔE between the sample and the named colour. */
  delta: number;
}

/** WCAG rating of one foreground/background pairing. */
export interface ContrastCheck {
  /** Contrast ratio, 1–21. */
  ratio: number;
  /** Passes AA for body text (≥ 4.5:1). */
  aa: boolean;
  /** Passes AA for large text (≥ 3:1). */
  aaLarge: boolean;
  /** Passes AAA for body text (≥ 7:1). */
  aaa: boolean;
}

/** Everything the app knows about a single colour. */
export interface ColorDetail {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  cmyk: CMYK;
  xyz: XYZ;
  lab: LAB;
  lch: LCH;
  /** WCAG relative luminance, 0–1. */
  luminance: number;
  /** Perceived brightness 0–100 (ITU-R BT.601 weighting). */
  brightness: number;
  name: ColorName;
  /** Contrast against pure white and pure black. */
  onWhite: ContrastCheck;
  onBlack: ContrastCheck;
  /** Which of black/white is the more legible text colour on this background. */
  bestText: "#000000" | "#ffffff";
  /** Rough warm/cool/neutral read, from hue and saturation. */
  temperature: "warm" | "cool" | "neutral";
}

/** One colour in an extracted palette. */
export interface PaletteEntry {
  hex: string;
  rgb: RGB;
  /** Share of sampled pixels this colour represents, 0–1. */
  share: number;
}

/** A recorded pick, kept in the session history strip. */
export interface PickRecord {
  id: string;
  hex: string;
  at: number;
}

/** A named set of related colours derived from one base colour. */
export interface Harmony {
  id: string;
  label: string;
  /** What the relationship is, in plain words. */
  note: string;
  hexes: string[];
}

/** Where the current image came from. */
export type ImageSource = "file" | "camera" | null;
