/**
 * Tonal ramps, and the export formats a ramp is actually used through.
 *
 * A ramp is the 50–950 scale every design system is built on. Generating one by
 * mixing towards white and black in *linear light* — the same reason as in
 * `wcag.ts` — is what makes the steps look evenly spaced; doing it on 8-bit
 * values bunches the light end up and leaves a gap in the middle.
 *
 * Each step carries its contrast against white and black, because that is the
 * number you need when choosing which step to put text on, and looking it up
 * later means going back to a contrast checker one shade at a time.
 */

import { contrastRatio, hexToRgb, type Rgb } from "@/lib/color";
import { bestTextOn } from "./wcag";

/** The step names a tonal scale conventionally uses. */
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export interface RampStep {
  step: number;
  hex: string;
  /** Contrast against pure white and pure black. */
  onWhite: number;
  onBlack: number;
  /** Whether black or white text is readable on this step, and at what ratio. */
  text: { hex: string; ratio: number };
  /** True for the step closest to the colour you gave. */
  base: boolean;
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("")}`;

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (lin: number) =>
  (lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055) * 255;

/** Mix in linear light towards white (`t = 1`) or black (`t = 0`). */
function mix(rgb: Rgb, t: 0 | 1, amount: number): Rgb {
  const ch = (c: number) => fromLinear(toLinear(c) + (t - toLinear(c)) * amount);
  return { r: ch(rgb.r), g: ch(rgb.g), b: ch(rgb.b) };
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Build an 11-step ramp with the given colour anchored at step 500.
 *
 * The mix amounts are not linear in the step number. They tighten towards the
 * ends — 50 is a 95% mix with white, 100 an 88%, and so on — because perceived
 * lightness changes fastest near the extremes, and evenly-spaced mixes would make
 * 50 and 100 nearly the same colour while leaving a visible jump at 300.
 */
export function buildRamp(baseHex: string): RampStep[] {
  const base = hexToRgb(baseHex);

  /** step → [towards, amount]. 500 is the anchor and is mixed with nothing. */
  const recipe: Record<number, [0 | 1, number]> = {
    50: [1, 0.95],
    100: [1, 0.88],
    200: [1, 0.74],
    300: [1, 0.56],
    400: [1, 0.3],
    500: [1, 0],
    600: [0, 0.22],
    700: [0, 0.42],
    800: [0, 0.6],
    900: [0, 0.76],
    950: [0, 0.87],
  };

  return RAMP_STEPS.map((step) => {
    const [towards, amount] = recipe[step];
    const rgb = amount === 0 ? base : mix(base, towards, amount);
    const hex = toHex(rgb);
    return {
      step,
      hex,
      onWhite: contrastRatio(rgb, WHITE),
      onBlack: contrastRatio(rgb, BLACK),
      text: bestTextOn(hex),
      base: step === 500,
    };
  });
}

/* -------------------------------- export ------------------------------- */

export type RampFormat = "css" | "tailwind" | "json" | "scss";

export const RAMP_FORMATS: { id: RampFormat; label: string; hint: string }[] = [
  { id: "css", label: "CSS", hint: "Custom properties, ready for a :root block" },
  { id: "tailwind", label: "Tailwind v4", hint: "@theme entries, the CSS-first config" },
  { id: "scss", label: "SCSS", hint: "A variable per step" },
  { id: "json", label: "JSON", hint: "For design tokens or a config file" },
];

/**
 * Write a ramp out in one of the four forms it gets pasted into.
 *
 * Tailwind's is `@theme`, not a `tailwind.config.js` object, because v4 moved the
 * config into CSS — handing someone a JS config for a v4 project would be a
 * subtly wrong answer that costs them a debugging session.
 */
export function formatRamp(name: string, ramp: RampStep[], format: RampFormat): string {
  // Anything not safe in a CSS identifier becomes a dash, so a name typed with
  // spaces or capitals still produces a valid token.
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";

  switch (format) {
    case "css":
      return [":root {", ...ramp.map((s) => `  --${slug}-${s.step}: ${s.hex};`), "}"].join("\n");

    case "tailwind":
      return [
        "@theme {",
        ...ramp.map((s) => `  --color-${slug}-${s.step}: ${s.hex};`),
        "}",
      ].join("\n");

    case "scss":
      return ramp.map((s) => `$${slug}-${s.step}: ${s.hex};`).join("\n");

    case "json":
      return JSON.stringify(
        { [slug]: Object.fromEntries(ramp.map((s) => [s.step, s.hex])) },
        null,
        2,
      );
  }
}
