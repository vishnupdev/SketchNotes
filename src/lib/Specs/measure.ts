/**
 * Pulling comparable numbers out of spec text.
 *
 * A spec row is prose: "S24: Li-ion 4000 mAh; S24+: 4900 mAh; S24 Ultra: 5000
 * mAh". To compare two products, or to score one, that has to become a number
 * and a unit. This module is the only place in the app where that conversion
 * happens, and it is deliberately conservative:
 *
 *  - a measure is only looked for in the spec rows that can legitimately hold it
 *    (screen size in `display`, never in `rear_camera`, where 1/1.56" is a
 *    sensor and not a screen);
 *  - a row stating several variants yields several numbers, and the one kept is
 *    chosen by a rule stated per measure — the *largest* battery, the *lightest*
 *    weight — rather than "the first one";
 *  - everything is normalised to one canonical unit per measure, so a car quoted
 *    in miles and one quoted in kilometres are actually comparable;
 *  - a measure nothing matched is absent, never zero. A score built on a zero
 *    that meant "not stated" is worse than no score.
 *
 * {@link Measure.reading} keeps the figure as the article words it, so the UI
 * can show the source's own phrasing rather than this module's rounding.
 */

import type { Measure, MeasureId, ProductCategory, SpecGroup } from "./types";

/** How several candidate numbers from one row become a single measure. */
type Pick = "max" | "min" | "first";

interface Pattern {
  /** Must capture the number in group 1. */
  re: RegExp;
  /** Multiplier onto the canonical unit. */
  factor: number;
}

interface MeasureSpec {
  id: MeasureId;
  label: string;
  /** Canonical unit every pattern converts into. */
  unit: string;
  /** Infobox keys whose value may state this measure. Order is preference. */
  keys: string[];
  patterns: Pattern[];
  pick: Pick;
  /**
   * Decimal places for the canonical reading. Used only when the matched text
   * had to be converted; an unconverted match keeps the article's own wording.
   */
  places?: number;
  /** Rewrites the spec text into a form the patterns can read. */
  prepare?: (value: string) => string;
}

/**
 * Give both halves of a range their unit, so "3552–4048 lb" offers two weights
 * rather than one. Without this the lower bound is invisible to every pattern,
 * which for a `min` measure means the app reports the heaviest variant as the
 * lightest — the one failure mode here that produces a confidently wrong number
 * rather than a missing one.
 */
const spreadRanges = (value: string): string =>
  value.replace(
    /(\d[\d.,]*)\s*[–—-]\s*(\d[\d.,]*)\s*([a-zA-Z][a-zA-Z/]{0,5})\b/g,
    (_, low: string, high: string, unit: string) => `${low} ${unit} – ${high} ${unit}`,
  );

/**
 * Spell out the core counts that articles write as words. "Octa-core ARM
 * Cortex-A78C" states eight cores as plainly as "8-core" does, and a spec sheet
 * that scores one and not the other is arbitrary.
 */
const CORE_WORDS: [word: RegExp, count: number][] = [
  [/\bdual[- ]core\b/gi, 2],
  [/\btri[- ]core\b/gi, 3],
  [/\bquad[- ]core\b/gi, 4],
  [/\bhexa[- ]core\b/gi, 6],
  [/\bocta[- ]core\b/gi, 8],
  [/\bdeca[- ]core\b/gi, 10],
];

const spellCores = (value: string): string =>
  CORE_WORDS.reduce((text, [word, count]) => text.replace(word, `${count}-core`), value);

/** Number in group 1, then the unit — tolerating commas and a space. */
const n = String.raw`(\d+(?:[.,]\d+)?)`;

const SPECS: MeasureSpec[] = [
  {
    id: "battery",
    label: "Battery capacity",
    unit: "mAh",
    keys: ["battery", "power"],
    patterns: [{ re: new RegExp(`${n}\\s*mAh`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "batteryLife",
    label: "Battery life",
    unit: "h",
    keys: ["battery", "power", "battery_life"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:hours?|hrs?|h)\\b`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "ram",
    label: "Memory",
    unit: "GB",
    keys: ["memory", "ram"],
    patterns: [
      { re: new RegExp(`${n}\\s*GB`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*MB`, "gi"), factor: 1 / 1024 },
    ],
    pick: "max",
  },
  {
    id: "storage",
    label: "Storage",
    unit: "GB",
    keys: ["storage", "recording_medium", "internal_storage"],
    patterns: [
      { re: new RegExp(`${n}\\s*TB`, "gi"), factor: 1024 },
      { re: new RegExp(`${n}\\s*GB`, "gi"), factor: 1 },
    ],
    pick: "max",
  },
  {
    id: "screen",
    label: "Screen size",
    unit: "in",
    keys: ["display", "screen", "rearlcd"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:in\\b|inch|″|")`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "refresh",
    label: "Refresh rate",
    unit: "Hz",
    keys: ["display", "screen"],
    patterns: [{ re: new RegExp(`${n}\\s*Hz`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "brightness",
    label: "Peak brightness",
    unit: "nits",
    keys: ["display", "screen"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:nits|cd/m)`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "camera",
    label: "Main camera",
    unit: "MP",
    keys: ["rear_camera", "camera", "sensor_resolution", "res", "resolution"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:MP|megapixels?)`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "sensor",
    label: "Sensor",
    unit: "MP",
    keys: ["sensor_resolution", "res", "sensor", "resolution"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:MP|megapixels?|effective megapixels)`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "mass",
    label: "Weight",
    unit: "g",
    keys: ["weight", "dry_weight", "wet_weight", "mass"],
    patterns: [
      { re: new RegExp(`${n}\\s*kg`, "gi"), factor: 1000 },
      { re: new RegExp(`${n}\\s*lb`, "gi"), factor: 453.59 },
      { re: new RegExp(`${n}\\s*g\\b`, "gi"), factor: 1 },
    ],
    // The lightest variant: a range is "from X", and that is how weight is read.
    pick: "min",
    places: 0,
    prepare: spreadRanges,
  },
  {
    id: "charge",
    label: "Charging speed",
    unit: "W",
    keys: ["charging", "power"],
    patterns: [{ re: new RegExp(`${n}\\s*W\\b`, "gi"), factor: 1 }],
    pick: "max",
  },
  {
    id: "cores",
    label: "CPU cores",
    unit: "cores",
    keys: ["cpu", "soc", "system_on_chip", "cores", "core"],
    patterns: [
      { re: new RegExp(`${n}\\s*[-\\s]?core`, "gi"), factor: 1 },
      { re: new RegExp(`(?:^|[^\\d])${n}\\s*x\\s*\\d`, "gi"), factor: 1 },
    ],
    pick: "max",
    places: 0,
    prepare: spellCores,
  },
  {
    id: "clock",
    label: "Clock speed",
    unit: "GHz",
    keys: ["cpu", "soc", "system_on_chip", "fastest", "boost", "clock"],
    patterns: [
      { re: new RegExp(`${n}\\s*GHz`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*MHz`, "gi"), factor: 1 / 1000 },
    ],
    pick: "max",
  },
  {
    id: "power",
    label: "Power",
    unit: "hp",
    keys: ["power", "powerout", "engine", "motor", "tdp"],
    patterns: [
      { re: new RegExp(`${n}\\s*(?:hp|bhp)\\b`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*PS\\b`, "g"), factor: 0.9863 },
      { re: new RegExp(`${n}\\s*kW\\b`, "g"), factor: 1.341 },
    ],
    pick: "max",
    places: 0,
  },
  {
    id: "range",
    label: "Range",
    unit: "km",
    keys: ["electric_range", "range", "economy"],
    patterns: [
      { re: new RegExp(`${n}\\s*km`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*mi\\b`, "gi"), factor: 1.609 },
    ],
    pick: "max",
    places: 0,
  },
  {
    id: "topSpeed",
    label: "Top speed",
    unit: "km/h",
    keys: ["top_speed", "topspeed", "performance"],
    patterns: [
      { re: new RegExp(`${n}\\s*km/h`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*mph`, "gi"), factor: 1.609 },
    ],
    pick: "max",
    places: 0,
  },
  {
    id: "acceleration",
    label: "0–100 km/h",
    unit: "s",
    keys: ["performance", "acceleration", "engine"],
    patterns: [{ re: new RegExp(`in\\s*${n}\\s*(?:s|sec|seconds)\\b`, "gi"), factor: 1 }],
    pick: "min",
  },
  {
    id: "displacement",
    label: "Displacement",
    unit: "cc",
    keys: ["engine", "displacement"],
    patterns: [
      { re: new RegExp(`${n}\\s*(?:cc|cm3|cu cm)`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*(?:L|litre|liter)\\b`, "g"), factor: 1000 },
    ],
    pick: "max",
    places: 0,
  },
  {
    id: "fuel",
    label: "Fuel capacity",
    unit: "L",
    keys: ["fuel_capacity", "tank"],
    patterns: [
      { re: new RegExp(`${n}\\s*(?:L|litres?|liters?)\\b`, "gi"), factor: 1 },
      { re: new RegExp(`${n}\\s*(?:imp )?gal`, "gi"), factor: 3.785 },
    ],
    pick: "max",
  },
  {
    id: "seats",
    label: "Seats",
    unit: "seats",
    keys: ["doors", "seating", "capacity"],
    patterns: [{ re: new RegExp(`${n}\\s*(?:seats?|passengers?)`, "gi"), factor: 1 }],
    pick: "max",
    places: 0,
  },
  {
    id: "year",
    label: "Released",
    unit: "",
    keys: ["released", "release_date", "introduced", "production", "model_years", "first_flight"],
    patterns: [{ re: /\b(19\d{2}|20\d{2})\b/g, factor: 1 }],
    pick: "first",
    places: 0,
  },
];

/** Which measures are worth reading for each kind of product. */
const BY_CATEGORY: Record<ProductCategory, MeasureId[]> = {
  phone: ["battery", "ram", "storage", "screen", "refresh", "brightness", "camera", "charge", "mass", "year"],
  computer: ["ram", "storage", "screen", "refresh", "brightness", "cores", "clock", "mass", "batteryLife", "year"],
  console: ["ram", "storage", "cores", "clock", "batteryLife", "mass", "year"],
  camera: ["sensor", "screen", "mass", "storage", "year"],
  audio: ["batteryLife", "mass", "charge", "year"],
  wearable: ["battery", "batteryLife", "screen", "storage", "mass", "year"],
  component: ["cores", "clock", "ram", "power", "year"],
  appliance: ["power", "mass", "batteryLife", "year"],
  car: ["power", "range", "topSpeed", "acceleration", "displacement", "fuel", "mass", "seats", "year"],
  motorcycle: ["power", "displacement", "topSpeed", "fuel", "mass", "year"],
  aircraft: ["power", "topSpeed", "range", "mass", "seats", "year"],
  other: ["mass", "power", "storage", "year"],
};

/** Every number a set of patterns finds in one spec value. */
function numbersIn(value: string, patterns: Pattern[]): { value: number; text: string; converted: boolean }[] {
  const found: { value: number; text: string; converted: boolean }[] = [];
  for (const { re, factor } of patterns) {
    // Each pattern carries `g`; reset so a reused RegExp starts from the top.
    re.lastIndex = 0;
    for (const match of value.matchAll(re)) {
      const raw = Number(match[1].replace(/,/g, ""));
      if (!Number.isFinite(raw) || raw <= 0) continue;
      found.push({ value: raw * factor, text: match[0].trim(), converted: factor !== 1 });
    }
  }
  return found;
}

const round = (value: number, places = 1): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

/**
 * How a converted figure is worded.
 *
 * Grams are the canonical mass unit because a phone and a camera are weighed in
 * them, but a car is not: "1,836,132 g" is arithmetically right and unreadable,
 * so anything over a kilogram is stated in kilograms. The stored `value` stays
 * canonical either way — only the words change.
 */
function canonicalReading(spec: MeasureSpec, value: number): string {
  if (spec.id === "mass" && value >= 1000) {
    const kg = value / 1000;
    return `${kg >= 100 ? Math.round(kg).toLocaleString("en") : round(kg, 1)} kg`;
  }
  const shown = value >= 10_000 ? value.toLocaleString("en") : String(value);
  return spec.unit ? `${shown} ${spec.unit}` : shown;
}

/**
 * Every measure the sheet states, for the kind of product it describes.
 *
 * Spec rows are searched in the order the measure lists its keys, and the first
 * row that yields anything wins — `battery` before `power` for a phone's
 * capacity, so a wall-charger wattage in `power` can't stand in for a cell.
 */
export function extractMeasures(groups: SpecGroup[], category: ProductCategory): Measure[] {
  const byKey = new Map<string, { value: string; label: string }>();
  for (const group of groups) {
    for (const field of group.fields) {
      if (!byKey.has(field.key)) byKey.set(field.key, { value: field.value, label: field.label });
    }
  }

  const wanted = BY_CATEGORY[category];
  const out: Measure[] = [];

  for (const spec of SPECS) {
    if (!wanted.includes(spec.id)) continue;

    for (const key of spec.keys) {
      const row = byKey.get(key);
      if (!row) continue;

      const hits = numbersIn(spec.prepare ? spec.prepare(row.value) : row.value, spec.patterns);
      if (!hits.length) continue;

      const chosen =
        spec.pick === "first"
          ? hits[0]
          : hits.reduce((best, hit) =>
              spec.pick === "max" ? (hit.value > best.value ? hit : best) : hit.value < best.value ? hit : best,
            );

      const value = round(chosen.value, spec.places ?? 1);
      out.push({
        id: spec.id,
        value,
        unit: spec.unit,
        // An unconverted match reads better as the article wrote it; a converted
        // one has to be restated, or the number and the unit disagree.
        reading: chosen.converted ? canonicalReading(spec, value) : chosen.text,
        from: row.label,
      });
      break;
    }
  }

  return out;
}

/** The human label for a measure — shared by the score and the comparison. */
export function measureLabel(id: MeasureId): string {
  return SPECS.find((s) => s.id === id)?.label ?? id;
}

/** The canonical unit a measure is normalised to. */
export function measureUnit(id: MeasureId): string {
  return SPECS.find((s) => s.id === id)?.unit ?? "";
}

/** Whether a smaller number is the better one (weight, 0–100 time). */
export const lowerIsBetter = (id: MeasureId): boolean =>
  SPECS.find((s) => s.id === id)?.pick === "min";
