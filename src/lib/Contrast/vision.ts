/**
 * Colour-vision simulation.
 *
 * Roughly 1 in 12 men and 1 in 200 women have some form of colour-vision
 * deficiency, which makes "these two states are red and green" one of the most
 * common accessibility defects there is — and one that is completely invisible to
 * the person who wrote it. Simulating the palette is the only way to see it.
 *
 * The transforms are the Brettel/Viénot-style linear approximations: convert to
 * the LMS cone space, collapse the missing cone's response onto the plane the two
 * remaining cones can still distinguish, and convert back. They are an
 * approximation of a continuum, not a medical model — good enough to show that
 * two colours become the same one, which is the question being asked.
 */

import { hexToRgb, type Rgb } from "@/lib/color";

export type VisionType = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export interface VisionMode {
  id: VisionType;
  label: string;
  /** Who this affects, and roughly how many people. */
  note: string;
}

export const VISION_MODES: VisionMode[] = [
  { id: "normal", label: "Typical vision", note: "The colours as you specified them." },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    note: "Green cone absent — the most common form, around 1 in 16 men.",
  },
  {
    id: "protanopia",
    label: "Protanopia",
    note: "Red cone absent — around 1 in 100 men. Reds darken markedly.",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    note: "Blue cone absent — rare, under 1 in 10,000, and affects all genders equally.",
  },
  {
    id: "achromatopsia",
    label: "Achromatopsia",
    note: "No colour at all. Also a good proxy for a greyscale print or a glare-washed screen.",
  },
];

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (lin: number) =>
  (lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055) * 255;

/**
 * The 3×3 matrices, applied in **linear** RGB.
 *
 * Applying them to gamma-encoded bytes — which plenty of published snippets do —
 * gives visibly wrong results: colours come out too dark and two hues that should
 * collapse together stay distinguishable, which defeats the point of the
 * simulation.
 */
const MATRICES: Record<Exclude<VisionType, "normal" | "achromatopsia">, number[]> = {
  protanopia: [0.1121, 0.8853, -0.0005, 0.1127, 0.8897, -0.0001, 0.0045, 0.0085, 1.0000],
  deuteranopia: [0.292, 0.7054, 0.0003, 0.2934, 0.7089, 0.0001, -0.0195, 0.0333, 1.0000],
  tritanopia: [1.0, 0.1523, -0.1524, 0.0, 0.8672, 0.1327, 0.0, 0.4703, 0.5296],
};

/** Simulate one colour under one kind of vision. */
export function simulate(rgb: Rgb, type: VisionType): Rgb {
  if (type === "normal") return rgb;

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  if (type === "achromatopsia") {
    // Rec. 709 luminance — the same weights as `luminance()`, which is what makes
    // this view agree with the contrast numbers shown elsewhere in the app.
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = clamp(fromLinear(y));
    return { r: v, g: v, b: v };
  }

  const m = MATRICES[type];
  return {
    r: clamp(fromLinear(m[0] * r + m[1] * g + m[2] * b)),
    g: clamp(fromLinear(m[3] * r + m[4] * g + m[5] * b)),
    b: clamp(fromLinear(m[6] * r + m[7] * g + m[8] * b)),
  };
}

/** Simulate a hex colour, returning hex — the form the UI works in. */
export function simulateHex(hex: string, type: VisionType): string {
  const { r, g, b } = simulate(hexToRgb(hex), type);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * How far apart two colours are once simulated, 0–1.
 *
 * Euclidean distance in linear RGB, normalised. Crude next to a proper perceptual
 * metric, but it answers the only question asked of it — "do these two become the
 * same colour" — and stays explainable, which a Delta-E figure would not be to
 * someone who just wants to know if their chart is readable.
 */
export function separation(a: string, b: string, type: VisionType): number {
  const sa = simulate(hexToRgb(a), type);
  const sb = simulate(hexToRgb(b), type);
  const d =
    (toLinear(sa.r) - toLinear(sb.r)) ** 2 +
    (toLinear(sa.g) - toLinear(sb.g)) ** 2 +
    (toLinear(sa.b) - toLinear(sb.b)) ** 2;
  return Math.min(1, Math.sqrt(d / 3));
}

/** Below this, two simulated colours are close enough to be confusable. */
export const CONFUSABLE = 0.09;
