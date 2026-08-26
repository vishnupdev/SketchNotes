/**
 * WCAG contrast grading, and the part tools usually leave out: what to do about a
 * failure.
 *
 * Reporting "3.9:1 — fails AA" is easy and not very useful; the question is
 * always "so what colour *would* pass". {@link nearestPassing} answers it by
 * walking the failing colour's lightness towards whichever end of the scale
 * increases contrast, and stopping at the first shade that clears the bar — which
 * keeps the hue and saturation the design chose and changes only the one property
 * that contrast actually depends on.
 *
 * Built on the workspace's shared sRGB primitives (`lib/color.ts`) rather than a
 * private copy, so a grade here and a grade in the theme picker can never differ.
 */

import { contrastRatio, hexToRgb, luminance, type Rgb } from "@/lib/color";

/** The thresholds WCAG 2.2 sets, and what each one covers. */
export interface Requirement {
  id: string;
  label: string;
  /** Minimum ratio to pass. */
  min: number;
  /** What this level applies to, in plain terms. */
  applies: string;
}

export const REQUIREMENTS: Requirement[] = [
  {
    id: "aa-normal",
    label: "AA · body text",
    min: 4.5,
    applies: "Text below 18pt (24px), or below 14pt (18.66px) bold. The level almost everything is held to.",
  },
  {
    id: "aa-large",
    label: "AA · large text",
    min: 3,
    applies: "Headings from 18pt (24px), or 14pt (18.66px) bold.",
  },
  {
    id: "aa-ui",
    label: "AA · UI and graphics",
    min: 3,
    applies: "Borders of inputs, icon shapes, focus rings, chart lines — anything you must see to use.",
  },
  {
    id: "aaa-normal",
    label: "AAA · body text",
    min: 7,
    applies: "The enhanced level. Required for some public-sector work.",
  },
  {
    id: "aaa-large",
    label: "AAA · large text",
    min: 4.5,
    applies: "Enhanced level for headings.",
  },
];

export interface Grade {
  requirement: Requirement;
  passes: boolean;
}

/** Grade one ratio against every level. */
export const gradeAll = (ratio: number): Grade[] =>
  REQUIREMENTS.map((requirement) => ({ requirement, passes: ratio >= requirement.min }));

/** The headline verdict: the best level this ratio clears for body text. */
export function headlineGrade(ratio: number): { label: string; tone: "pass" | "mixed" | "fail" } {
  if (ratio >= 7) return { label: "Passes AAA", tone: "pass" };
  if (ratio >= 4.5) return { label: "Passes AA", tone: "pass" };
  if (ratio >= 3) return { label: "Large text only", tone: "mixed" };
  return { label: "Fails", tone: "fail" };
}

/** Round a ratio the way every contrast tool reports it. */
export const formatRatio = (ratio: number): string => `${ratio.toFixed(2)}:1`;

/* --------------------------- fixing a failure -------------------------- */

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("")}`;

/**
 * Mix a colour towards black or white by `amount` (0–1).
 *
 * Done in linear-light space rather than on the 8-bit values, because a 50% mix
 * of sRGB bytes is not a 50% mix of light — it lands noticeably dark. Since
 * contrast is defined on luminance, moving in the space luminance lives in is
 * what makes each step of the search change the ratio by a predictable amount.
 */
function mixTowards(rgb: Rgb, target: 0 | 255, amount: number): Rgb {
  const t = target === 0 ? 0 : 1;
  const channel = (c: number) => {
    const s = c / 255;
    const lin = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    const mixed = lin + (t - lin) * amount;
    const out = mixed <= 0.0031308 ? mixed * 12.92 : 1.055 * mixed ** (1 / 2.4) - 0.055;
    return out * 255;
  };
  return { r: channel(rgb.r), g: channel(rgb.g), b: channel(rgb.b) };
}

export interface Suggestion {
  hex: string;
  ratio: number;
  /** Which way it moved, so the UI can say "darker" rather than just show a swatch. */
  direction: "darker" | "lighter";
}

/**
 * The closest shade of `adjust` that reaches `target` contrast against `against`.
 *
 * Searched in 2% steps towards whichever end helps: away from the fixed colour's
 * own luminance. A linear scan rather than a binary search because contrast is
 * *not* monotonic in the mix amount when the two colours start close together —
 * pushing a mid grey towards white first lowers the ratio against a light
 * background before raising it — and a bisection would happily land in the dip.
 * Fifty steps is nothing to compute and always finds the nearest passing shade.
 *
 * Returns null when neither direction reaches the target, which happens only when
 * the fixed colour is itself mid-grey and the target is high.
 */
export function nearestPassing(adjust: string, against: string, target: number): Suggestion | null {
  const base = hexToRgb(adjust);
  const fixed = hexToRgb(against);

  // Move away from the background: if it is light, go darker, and the reverse.
  const primary: 0 | 255 = luminance(fixed) > 0.18 ? 0 : 255;

  for (const direction of [primary, primary === 0 ? 255 : 0] as const) {
    for (let step = 1; step <= 50; step++) {
      const candidate = mixTowards(base, direction, step / 50);
      const ratio = contrastRatio(candidate, fixed);
      if (ratio >= target) {
        return {
          hex: toHex(candidate),
          ratio,
          direction: direction === 0 ? "darker" : "lighter",
        };
      }
    }
  }

  return null;
}

/**
 * Whether black or white text sits better on a colour — the decision every
 * button, chip and badge needs, and the one people most often get wrong by eye.
 */
export function bestTextOn(background: string): { hex: "#000000" | "#ffffff"; ratio: number } {
  const bg = hexToRgb(background);
  const onBlack = contrastRatio({ r: 0, g: 0, b: 0 }, bg);
  const onWhite = contrastRatio({ r: 255, g: 255, b: 255 }, bg);
  return onBlack >= onWhite
    ? { hex: "#000000", ratio: onBlack }
    : { hex: "#ffffff", ratio: onWhite };
}
