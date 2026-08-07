/**
 * Colour schemes derived from one picked colour, plus the tint/shade ramp.
 *
 * All of these are hue rotations in HSL — the classic colour-wheel
 * relationships a designer would reach for once they know the colour in a photo.
 */

import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, rotateHue, shade, tint } from "./convert";
import type { Harmony } from "./types";

/** Rotate the base hue by each offset and return the resulting hexes. */
function wheel(hex: string, offsets: number[]): string[] {
  const rgb = hexToRgb(hex);
  return offsets.map((deg) => rgbToHex(rotateHue(rgb, deg)));
}

/** Every scheme for a base colour, base swatch first in each. */
export function harmonies(hex: string): Harmony[] {
  const rgb = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(rgb);

  return [
    {
      id: "complementary",
      label: "Complementary",
      note: "Opposite on the wheel — maximum contrast.",
      hexes: wheel(hex, [0, 180]),
    },
    {
      id: "analogous",
      label: "Analogous",
      note: "Neighbouring hues — calm and cohesive.",
      hexes: wheel(hex, [-30, 0, 30]),
    },
    {
      id: "triadic",
      label: "Triadic",
      note: "Three hues evenly spaced — vivid but balanced.",
      hexes: wheel(hex, [0, 120, 240]),
    },
    {
      id: "split",
      label: "Split complementary",
      note: "Softer than a straight complement.",
      hexes: wheel(hex, [0, 150, 210]),
    },
    {
      id: "tetradic",
      label: "Tetradic",
      note: "Two complementary pairs — rich, needs one dominant.",
      hexes: wheel(hex, [0, 90, 180, 270]),
    },
    {
      id: "monochrome",
      label: "Monochromatic",
      note: "One hue at five lightnesses.",
      // Built from lightness rather than mixing, so the hue stays exact.
      hexes: [12, 30, l, 68, 86]
        .map((lightness) => rgbToHex(hslToRgb({ h, s, l: lightness })))
        // A base that is already very light or dark can collide with a step.
        .filter((value, i, all) => all.indexOf(value) === i),
    },
  ];
}

/** Nine steps from near-white to near-black through the base colour. */
export function ramp(hex: string): string[] {
  const rgb = hexToRgb(hex);
  return [
    ...[0.8, 0.6, 0.4, 0.2].map((amount) => rgbToHex(tint(rgb, amount))),
    rgbToHex(rgb),
    ...[0.2, 0.4, 0.6, 0.8].map((amount) => rgbToHex(shade(rgb, amount))),
  ];
}
