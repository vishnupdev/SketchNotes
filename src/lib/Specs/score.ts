/**
 * Scoring a product from its own specification sheet.
 *
 * What this is: each measure the article states is placed on a fixed scale for
 * that kind of product — a phone battery runs from 3000 mAh (0) to 6000 mAh
 * (100) — and the axes are averaged by weight. Every number shown is one the
 * article stated, every band is written down here, and the result is
 * reproducible by hand.
 *
 * What this is **not**, and what the UI says out loud: a review. It measures
 * what a manufacturer claims, not what the thing is like to own. A phone with
 * an enormous battery and a dreadful screen scores well on battery. Megapixels
 * and refresh rates are proxies, and proxies are exactly where specifications
 * and experience part company.
 *
 * Two deliberate refusals keep it defensible:
 *
 *  - **A measure the article omits scores nothing** — not zero. Zero is a
 *    claim ("this phone has no battery"); absence is the truth ("nobody wrote
 *    it down"). {@link ProductScore.covered} carries that, and the UI leads
 *    with it rather than with the number.
 *  - **Some categories are not scored at all.** There is no defensible scale
 *    that says one refrigerator or one airliner beats another, so the app says
 *    so instead of inventing one. Ambiguous measures are left out of the scored
 *    categories for the same reason: a bigger screen is not a better screen,
 *    and a higher TDP is not a faster chip.
 */

import { lowerIsBetter, measureLabel } from "./measure";
import type { Measure, MeasureId, ProductCategory, ProductScore, ScoreAxis } from "./types";

interface AxisDef {
  id: MeasureId;
  /** Value scoring 0. May be higher than `best` when less is better. */
  worst: number;
  /** Value scoring 100. */
  best: number;
  /** Relative importance within the category. */
  weight: number;
  /** Why this axis is a proxy, when it is one. Shown beside the axis. */
  caveat?: string;
}

/**
 * The bands, per category.
 *
 * The endpoints are the span a buyer actually chooses between today, not the
 * physical limits: a phone below 3000 mAh and one above 6000 mAh both exist,
 * and both sit at the end of the scale rather than off it. Recency
 * (`year`) is included because a specification is a claim made at a date, and
 * a 2016 flagship's numbers deserve to be read as 2016 numbers.
 */
const AXES: Partial<Record<ProductCategory, AxisDef[]>> = {
  phone: [
    { id: "battery", worst: 3000, best: 6000, weight: 1.2 },
    { id: "ram", worst: 3, best: 16, weight: 1 },
    { id: "storage", worst: 32, best: 512, weight: 0.8 },
    { id: "refresh", worst: 60, best: 144, weight: 0.9 },
    { id: "brightness", worst: 500, best: 2500, weight: 0.8 },
    {
      id: "camera",
      worst: 8,
      best: 108,
      weight: 0.9,
      caveat: "Megapixels measure resolution, not picture quality — sensor size and processing matter more.",
    },
    { id: "charge", worst: 10, best: 120, weight: 0.7 },
    { id: "mass", worst: 240, best: 150, weight: 0.4, caveat: "The lightest variant the sheet lists." },
    { id: "year", worst: 2015, best: 2025, weight: 0.8, caveat: "How current the specification is, not how good." },
  ],
  computer: [
    { id: "ram", worst: 4, best: 64, weight: 1.2 },
    { id: "storage", worst: 128, best: 2048, weight: 0.9 },
    { id: "cores", worst: 2, best: 16, weight: 1 },
    { id: "clock", worst: 1.5, best: 4.5, weight: 0.8, caveat: "Clock speed compares within a chip family, not across them." },
    { id: "refresh", worst: 60, best: 144, weight: 0.6 },
    { id: "brightness", worst: 250, best: 1000, weight: 0.6 },
    { id: "batteryLife", worst: 5, best: 20, weight: 0.7, caveat: "The manufacturer's own figure, measured their way." },
    { id: "mass", worst: 3000, best: 1000, weight: 0.5 },
    { id: "year", worst: 2015, best: 2025, weight: 0.8, caveat: "How current the specification is, not how good." },
  ],
  console: [
    { id: "ram", worst: 2, best: 32, weight: 1.2 },
    { id: "storage", worst: 32, best: 1024, weight: 0.9 },
    { id: "cores", worst: 4, best: 16, weight: 0.8 },
    { id: "clock", worst: 1, best: 4, weight: 0.7, caveat: "Consoles are tuned as a whole; clock speed alone predicts little." },
    { id: "year", worst: 2010, best: 2025, weight: 1 },
  ],
  camera: [
    {
      id: "sensor",
      worst: 12,
      best: 60,
      weight: 1.2,
      caveat: "Resolution only. Sensor size, lens and processing decide the picture.",
    },
    { id: "mass", worst: 1200, best: 400, weight: 0.6 },
    { id: "year", worst: 2010, best: 2025, weight: 0.9 },
  ],
  audio: [
    { id: "batteryLife", worst: 4, best: 40, weight: 1.2 },
    { id: "mass", worst: 400, best: 150, weight: 0.5 },
    { id: "charge", worst: 5, best: 30, weight: 0.5 },
    { id: "year", worst: 2015, best: 2025, weight: 0.8 },
  ],
  wearable: [
    { id: "batteryLife", worst: 18, best: 336, weight: 1.2 },
    { id: "battery", worst: 200, best: 600, weight: 0.8 },
    { id: "mass", worst: 80, best: 25, weight: 0.7 },
    { id: "year", worst: 2015, best: 2025, weight: 0.8 },
  ],
  component: [
    { id: "cores", worst: 2, best: 64, weight: 1.2 },
    { id: "clock", worst: 2, best: 5.5, weight: 1 },
    { id: "ram", worst: 2, best: 32, weight: 0.8, caveat: "On-board memory, where the sheet states it." },
    { id: "year", worst: 2012, best: 2025, weight: 0.9 },
  ],
  car: [
    { id: "power", worst: 100, best: 600, weight: 1.1 },
    { id: "range", worst: 200, best: 700, weight: 1, caveat: "The best figure quoted, on whichever test cycle the sheet used." },
    { id: "topSpeed", worst: 150, best: 300, weight: 0.6 },
    { id: "acceleration", worst: 12, best: 3, weight: 0.8 },
    { id: "year", worst: 2005, best: 2025, weight: 0.9, caveat: "How current the specification is, not how good." },
  ],
  motorcycle: [
    { id: "power", worst: 15, best: 200, weight: 1.1 },
    { id: "displacement", worst: 125, best: 1200, weight: 0.8, caveat: "Capacity, not performance — a big engine can be the slower one." },
    { id: "topSpeed", worst: 100, best: 300, weight: 0.7 },
    { id: "mass", worst: 250_000, best: 150_000, weight: 0.7 },
    { id: "year", worst: 2005, best: 2025, weight: 0.8 },
  ],
};

/**
 * Why a category carries no score. Shown in place of the dial, so "unscored" is
 * an answer with a reason rather than an empty panel.
 */
export const UNSCORED_REASON: Partial<Record<ProductCategory, string>> = {
  appliance:
    "There is no honest scale for appliances. A vacuum's wattage says how much electricity it draws, not how well it cleans, and ranking two fridges by the numbers on their plates would be a made-up answer dressed as a measured one.",
  aircraft:
    "Aircraft are built to a role, not to a ranking. A trainer, an airliner and a fighter differ on every axis by design, so a single score across them would measure nothing.",
  other:
    "This app only scores categories it has published bands for. It could not tell what kind of product this is from the article, so it is showing you the specifications and leaving the judgement to you.",
};

/** Plain-language band for a 0–100 figure. */
export function bandFor(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Modest";
  return "Entry level";
}

/** Where one value sits on its axis, 0–100, clamped at both ends. */
function positionOn(axis: AxisDef, value: number): number {
  const span = axis.best - axis.worst;
  if (span === 0) return 50;
  const raw = ((value - axis.worst) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * How one axis reads against its band — the sentence under the bar.
 *
 * It names the band's own endpoint, because "84 — strong" tells a reader
 * nothing about what was compared, and "strong for a phone, where this app's
 * scale runs to 6000 mAh" tells them exactly how to disagree with it.
 */
function verdictFor(axis: AxisDef, value: number, score: number, unit: string): string {
  const lower = lowerIsBetter(axis.id);

  // A year is a number that must not be grouped: "the scale runs to 2,025"
  // reads as a quantity, and makes the app look like it cannot tell a date from
  // a measurement.
  const figure = (n: number): string =>
    `${axis.id === "year" ? String(n) : n.toLocaleString("en")}${unit ? ` ${unit}` : ""}`;

  const target = figure(axis.best);
  const floor = figure(axis.worst);

  if (score >= 90) return `At or past the top of this app's scale (${target}).`;
  if (score <= 5) return `At or below the bottom of this app's scale (${floor}).`;
  return lower
    ? `${bandFor(score)} — the scale runs from ${floor} down to ${target}.`
    : `${bandFor(score)} — the scale runs from ${floor} up to ${target}.`;
}

/**
 * Score a product from the measures its sheet yielded.
 *
 * Only the axes with a measure contribute, and they are re-weighted among
 * themselves — so a phone whose article omits brightness is scored on the rest
 * rather than penalised for its article. The honesty of that trade lives in
 * `covered`/`total`, which the UI shows next to the number.
 */
export function scoreProduct(measures: Measure[], category: ProductCategory): ProductScore {
  const defs = AXES[category] ?? [];
  const byId = new Map(measures.map((m) => [m.id, m]));

  const axes: ScoreAxis[] = defs.map((def) => {
    const measure = byId.get(def.id);
    if (!measure) {
      return {
        id: def.id,
        label: measureLabel(def.id),
        reading: null,
        score: null,
        weight: def.weight,
        verdict: def.caveat ? `Not stated in the source. ${def.caveat}` : "Not stated in the source.",
        from: null,
      };
    }

    const score = positionOn(def, measure.value);
    const verdict = verdictFor(def, measure.value, score, measure.unit);

    return {
      id: def.id,
      label: measureLabel(def.id),
      reading: measure.reading,
      score,
      weight: def.weight,
      verdict: def.caveat ? `${verdict} ${def.caveat}` : verdict,
      from: measure.from,
    };
  });

  const scored = axes.filter((a): a is ScoreAxis & { score: number } => a.score !== null);
  const weight = scored.reduce((sum, a) => sum + a.weight, 0);
  const overall = weight > 0 ? Math.round(scored.reduce((sum, a) => sum + a.score * a.weight, 0) / weight) : null;

  return {
    overall,
    band: overall === null ? "Not scored" : bandFor(overall),
    axes,
    covered: scored.length,
    total: axes.length,
  };
}

/**
 * How much of the score to believe, from how much of it was actually measured.
 *
 * Under half the axes is not a weak score, it is a score that hasn't been
 * established, and the UI says so rather than showing a confident number over a
 * near-empty sheet.
 */
export function confidenceOf(score: ProductScore): { level: "none" | "low" | "fair" | "high"; note: string } {
  if (score.total === 0 || score.covered === 0) {
    return { level: "none", note: "Nothing on this sheet could be scored." };
  }
  const share = score.covered / score.total;
  if (share < 0.5) {
    return {
      level: "low",
      note: `Only ${score.covered} of ${score.total} measures are on this sheet — read the number as a sketch, not a verdict.`,
    };
  }
  if (share < 0.8) {
    return {
      level: "fair",
      note: `${score.covered} of ${score.total} measures are on this sheet; the rest were not stated.`,
    };
  }
  return {
    level: "high",
    note: `${score.covered} of ${score.total} measures are on this sheet.`,
  };
}
