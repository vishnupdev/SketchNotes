/**
 * Unit conversion — the arithmetic, with no React in sight.
 *
 * Almost every physical unit is a linear scale of one base unit, so a category
 * is just a base unit plus a factor per member and the conversion is two
 * multiplications. The exceptions earn their own shape:
 *
 *  - **Temperature** has an offset as well as a factor (0 °C is not 0 °F), so it
 *    carries an explicit pair of functions instead of a factor.
 *  - **Fuel economy** is *inverse* — more litres per 100 km is less efficiency —
 *    so L/100km is a reciprocal of the base, not a scale of it.
 *
 * Modelling those two as functions rather than bending a factor around them is
 * what keeps the common case honest: a factor means a factor everywhere else.
 */

export interface Unit {
  id: string;
  /** Symbol shown in the picker, e.g. "km". */
  label: string;
  /** Spoken name, used for the accessible label and the sentence readout. */
  name: string;
  /** Multiples of the category base unit. Omitted when `to`/`from` are given. */
  factor?: number;
  /** Non-linear scales: value to base, and base to value. */
  to?: (value: number) => number;
  from?: (base: number) => number;
}

export interface UnitCategory {
  id: string;
  label: string;
  /** Units in picker order — most-used first, not smallest-first. */
  units: Unit[];
  /** Sensible opening pair, so the app answers something before any input. */
  defaults: [string, string];
}

/** Convert `value` from one unit to another inside a single category. */
export function convertUnit(value: number, from: Unit, to: Unit): number {
  const base = from.to ? from.to(value) : value * (from.factor ?? 1);
  return to.from ? to.from(base) : base / (to.factor ?? 1);
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    label: "Length",
    defaults: ["m", "ft"],
    units: [
      { id: "mm", label: "mm", name: "millimetres", factor: 0.001 },
      { id: "cm", label: "cm", name: "centimetres", factor: 0.01 },
      { id: "m", label: "m", name: "metres", factor: 1 },
      { id: "km", label: "km", name: "kilometres", factor: 1000 },
      { id: "in", label: "in", name: "inches", factor: 0.0254 },
      { id: "ft", label: "ft", name: "feet", factor: 0.3048 },
      { id: "yd", label: "yd", name: "yards", factor: 0.9144 },
      { id: "mi", label: "mi", name: "miles", factor: 1609.344 },
      { id: "nmi", label: "nmi", name: "nautical miles", factor: 1852 },
    ],
  },
  {
    id: "mass",
    label: "Weight",
    defaults: ["kg", "lb"],
    units: [
      { id: "mg", label: "mg", name: "milligrams", factor: 1e-6 },
      { id: "g", label: "g", name: "grams", factor: 0.001 },
      { id: "kg", label: "kg", name: "kilograms", factor: 1 },
      { id: "t", label: "t", name: "tonnes", factor: 1000 },
      { id: "oz", label: "oz", name: "ounces", factor: 0.0283495231 },
      { id: "lb", label: "lb", name: "pounds", factor: 0.45359237 },
      { id: "st", label: "st", name: "stone", factor: 6.35029318 },
    ],
  },
  {
    id: "temp",
    label: "Temperature",
    defaults: ["c", "f"],
    units: [
      { id: "c", label: "°C", name: "Celsius", to: (v) => v, from: (b) => b },
      {
        id: "f",
        label: "°F",
        name: "Fahrenheit",
        to: (v) => (v - 32) / 1.8,
        from: (b) => b * 1.8 + 32,
      },
      { id: "k", label: "K", name: "Kelvin", to: (v) => v - 273.15, from: (b) => b + 273.15 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    defaults: ["l", "gal"],
    units: [
      { id: "ml", label: "ml", name: "millilitres", factor: 0.001 },
      { id: "l", label: "L", name: "litres", factor: 1 },
      { id: "m3", label: "m³", name: "cubic metres", factor: 1000 },
      { id: "tsp", label: "tsp", name: "teaspoons", factor: 0.00492892159 },
      { id: "tbsp", label: "tbsp", name: "tablespoons", factor: 0.0147867648 },
      { id: "cup", label: "cup", name: "US cups", factor: 0.2365882365 },
      { id: "flozus", label: "fl oz", name: "US fluid ounces", factor: 0.0295735296 },
      { id: "pt", label: "pt", name: "US pints", factor: 0.473176473 },
      { id: "gal", label: "gal", name: "US gallons", factor: 3.785411784 },
      { id: "galuk", label: "gal UK", name: "imperial gallons", factor: 4.54609 },
    ],
  },
  {
    id: "area",
    label: "Area",
    defaults: ["m2", "ft2"],
    units: [
      { id: "cm2", label: "cm²", name: "square centimetres", factor: 0.0001 },
      { id: "m2", label: "m²", name: "square metres", factor: 1 },
      { id: "km2", label: "km²", name: "square kilometres", factor: 1e6 },
      { id: "ha", label: "ha", name: "hectares", factor: 10000 },
      { id: "ft2", label: "ft²", name: "square feet", factor: 0.09290304 },
      { id: "yd2", label: "yd²", name: "square yards", factor: 0.83612736 },
      { id: "ac", label: "ac", name: "acres", factor: 4046.8564224 },
      { id: "cent", label: "cent", name: "cents", factor: 40.4685642 },
    ],
  },
  {
    id: "speed",
    label: "Speed",
    defaults: ["kmh", "mph"],
    units: [
      { id: "ms", label: "m/s", name: "metres per second", factor: 1 },
      { id: "kmh", label: "km/h", name: "kilometres per hour", factor: 0.277777778 },
      { id: "mph", label: "mph", name: "miles per hour", factor: 0.44704 },
      { id: "kn", label: "kn", name: "knots", factor: 0.514444444 },
    ],
  },
  {
    id: "data",
    label: "Data",
    defaults: ["mib", "mb"],
    units: [
      { id: "b", label: "B", name: "bytes", factor: 1 },
      { id: "kb", label: "kB", name: "kilobytes", factor: 1e3 },
      { id: "mb", label: "MB", name: "megabytes", factor: 1e6 },
      { id: "gb", label: "GB", name: "gigabytes", factor: 1e9 },
      { id: "tb", label: "TB", name: "terabytes", factor: 1e12 },
      { id: "kib", label: "KiB", name: "kibibytes", factor: 1024 },
      { id: "mib", label: "MiB", name: "mebibytes", factor: 1024 ** 2 },
      { id: "gib", label: "GiB", name: "gibibytes", factor: 1024 ** 3 },
      { id: "tib", label: "TiB", name: "tebibytes", factor: 1024 ** 4 },
      { id: "bit", label: "bit", name: "bits", factor: 0.125 },
    ],
  },
  {
    id: "time",
    label: "Time",
    defaults: ["h", "min"],
    units: [
      { id: "ms", label: "ms", name: "milliseconds", factor: 0.001 },
      { id: "s", label: "s", name: "seconds", factor: 1 },
      { id: "min", label: "min", name: "minutes", factor: 60 },
      { id: "h", label: "h", name: "hours", factor: 3600 },
      { id: "d", label: "d", name: "days", factor: 86400 },
      { id: "wk", label: "wk", name: "weeks", factor: 604800 },
      // Calendar months and years vary; these are the mean lengths, which is
      // what "how many months is 10,000 hours" actually wants.
      { id: "mo", label: "mo", name: "average months", factor: 2629800 },
      { id: "yr", label: "yr", name: "average years", factor: 31557600 },
    ],
  },
  {
    id: "pressure",
    label: "Pressure",
    defaults: ["bar", "psi"],
    units: [
      { id: "pa", label: "Pa", name: "pascals", factor: 1 },
      { id: "kpa", label: "kPa", name: "kilopascals", factor: 1000 },
      { id: "bar", label: "bar", name: "bar", factor: 100000 },
      { id: "psi", label: "psi", name: "pounds per square inch", factor: 6894.757293 },
      { id: "atm", label: "atm", name: "atmospheres", factor: 101325 },
      { id: "mmhg", label: "mmHg", name: "millimetres of mercury", factor: 133.322387 },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    defaults: ["kcal", "kj"],
    units: [
      { id: "j", label: "J", name: "joules", factor: 1 },
      { id: "kj", label: "kJ", name: "kilojoules", factor: 1000 },
      { id: "cal", label: "cal", name: "calories", factor: 4.184 },
      { id: "kcal", label: "kcal", name: "kilocalories", factor: 4184 },
      { id: "wh", label: "Wh", name: "watt-hours", factor: 3600 },
      { id: "kwh", label: "kWh", name: "kilowatt-hours", factor: 3.6e6 },
    ],
  },
  {
    id: "fuel",
    label: "Fuel",
    defaults: ["kmpl", "mpg"],
    units: [
      // Base: kilometres per litre. "Litres per 100 km" is its reciprocal, which
      // is exactly why it cannot be expressed as a factor.
      { id: "kmpl", label: "km/L", name: "kilometres per litre", factor: 1 },
      { id: "mpg", label: "mpg", name: "miles per US gallon", factor: 0.425143707 },
      { id: "mpguk", label: "mpg UK", name: "miles per imperial gallon", factor: 0.354006 },
      {
        id: "l100",
        label: "L/100km",
        name: "litres per 100 km",
        to: (v) => (v === 0 ? 0 : 100 / v),
        from: (b) => (b === 0 ? 0 : 100 / b),
      },
    ],
  },
  {
    id: "angle",
    label: "Angle",
    defaults: ["deg", "rad"],
    units: [
      { id: "deg", label: "°", name: "degrees", factor: 1 },
      { id: "rad", label: "rad", name: "radians", factor: 57.2957795131 },
      { id: "grad", label: "grad", name: "gradians", factor: 0.9 },
      { id: "turn", label: "turn", name: "turns", factor: 360 },
    ],
  },
];

export const CATEGORY_BY_ID: Record<string, UnitCategory> = Object.fromEntries(
  UNIT_CATEGORIES.map((c) => [c.id, c]),
);

export const unitById = (category: UnitCategory, id: string): Unit =>
  category.units.find((u) => u.id === id) ?? category.units[0];

/**
 * Format a converted number for reading.
 *
 * Fixed decimal places are wrong at both ends of this app's range: three places
 * turn a micron in inches into "0.000", and twelve significant digits turn a
 * clean 2.5 into floating-point noise. So: exponential notation once a value
 * leaves the range a person reads comfortably, and significant digits — not
 * decimal places — inside it, with trailing zeroes trimmed by `Number`.
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12 || magnitude < 1e-6) return value.toExponential(4);
  const digits = magnitude >= 1 ? Math.max(0, 8 - Math.floor(Math.log10(magnitude))) : 8;
  return String(Number(value.toFixed(Math.min(12, digits))));
}

/**
 * Parse what someone typed into a number.
 *
 * Accepts the thousands separators and stray spaces that come with a paste, and
 * treats an empty box as 0 rather than NaN so the result field reads "0" instead
 * of a dash while the input is still being cleared.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[,\s_]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
