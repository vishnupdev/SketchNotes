/**
 * Builds the full report for one colour — every code, its nearest name, and how
 * readable it is. Kept apart from `convert.ts` so the maths stays dependency-free
 * and the name table (which itself needs the maths) can't create an import cycle.
 */

import {
  brightness,
  contrastRatio,
  hexToRgb,
  labToLch,
  luminance,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  rgbToXyz,
} from "./convert";
import { nearestName } from "./names";
import type { ColorDetail, ContrastCheck, RGB } from "./types";

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

/** Grade one pairing against the WCAG 2.2 thresholds. */
function check(a: RGB, b: RGB): ContrastCheck {
  const ratio = contrastRatio(a, b);
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
  };
}

/**
 * Warm/cool from hue, but only once there's enough saturation for hue to mean
 * anything — a desaturated pixel reads as neutral no matter where its hue lands.
 */
function temperature(h: number, s: number): ColorDetail["temperature"] {
  if (s < 10) return "neutral";
  return h < 90 || h >= 300 ? "warm" : "cool";
}

/** Everything the app can say about a colour, from its channels. */
export function describeRgb(rgb: RGB): ColorDetail {
  const hsl = rgbToHsl(rgb);
  const lab = rgbToLab(rgb);
  const onWhite = check(rgb, WHITE);
  const onBlack = check(rgb, BLACK);
  return {
    hex: rgbToHex(rgb),
    rgb,
    hsl,
    hsv: rgbToHsv(rgb),
    cmyk: rgbToCmyk(rgb),
    xyz: rgbToXyz(rgb),
    lab,
    lch: labToLch(lab),
    luminance: Math.round(luminance(rgb) * 1000) / 1000,
    brightness: brightness(rgb),
    name: nearestName(rgb),
    onWhite,
    onBlack,
    // Whichever of the two is easier to read *on* this colour.
    bestText: onBlack.ratio >= onWhite.ratio ? "#000000" : "#ffffff",
    temperature: temperature(hsl.h, hsl.s),
  };
}

/** Same, from a hex string. */
export const describeHex = (hex: string): ColorDetail => describeRgb(hexToRgb(hex));
