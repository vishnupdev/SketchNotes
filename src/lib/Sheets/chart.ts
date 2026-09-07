/**
 * Turning two columns into something plottable.
 *
 * The geometry lives here rather than in the panel so the decisions that make a
 * chart honest are testable:
 *
 *  - **A bar scale always includes zero.** Bar length *is* the value, so a
 *    baseline at 90 makes a 4% difference look like a fivefold one. Only the
 *    line chart is allowed a floating baseline, where position rather than
 *    length carries the reading.
 *  - **One value axis, ever.** Two measures at different scales are two charts.
 *  - **The tail is folded, not cycled.** Past {@link MAX_BARS} categories the
 *    remainder becomes a single "Other" bar, so nothing is silently dropped and
 *    the axis stays readable.
 *
 * There is no colour in this file. A single series takes the app's accent token
 * (rule #6), and one series needs no palette.
 */

import { cellValue, type Column } from "./csv";

export type ChartKind = "bar" | "line";

/** How several rows sharing a label are combined. */
export type Aggregation = "sum" | "mean" | "count" | "min" | "max";

export const AGGREGATIONS: Aggregation[] = ["sum", "mean", "count", "min", "max"];

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  sum: "Total",
  mean: "Average",
  count: "How many",
  min: "Lowest",
  max: "Highest",
};

/** Bars past this are folded into one "Other" — see the note above. */
export const MAX_BARS = 32;

export interface ChartPoint {
  label: string;
  value: number;
  /** Rows behind this point, so a tooltip can say "12 rows averaged". */
  rows: number;
  /** Sort key for a time axis: the parsed timestamp, else the row order. */
  sort: number;
}

export interface ChartSeries {
  points: ChartPoint[];
  /** Set when the tail was folded, for the caption to admit it. */
  folded: number;
  /** True when the label column is dates, which the line chart needs to know. */
  timeAxis: boolean;
}

const combine = (values: number[], aggregation: Aggregation): number => {
  // `count` never reaches here with the raw rows — it counts records, not
  // parsed values, so {@link buildSeries} answers it from the group's row
  // tally. Summing is right for the one case that does arrive: a folded tail,
  // whose points are already counts.
  if (aggregation === "count") return values.reduce((total, value) => total + value, 0);
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "mean":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    default:
      return Math.max(...values);
  }
};

/**
 * Group rows by the label column and combine the value column.
 *
 * `count` is the one aggregation that needs no value column — it counts rows —
 * which is what makes a chart possible for a sheet of nothing but text.
 */
export function buildSeries(
  columns: Column[],
  rows: string[][],
  labelColumn: number,
  valueColumn: number,
  aggregation: Aggregation,
  kind: ChartKind,
): ChartSeries {
  const label = columns[labelColumn];
  if (!label) return { points: [], folded: 0, timeAxis: false };

  const timeAxis = label.type === "date";
  const groups = new Map<string, { values: number[]; rows: number; sort: number }>();

  rows.forEach((row, index) => {
    const raw = (row[labelColumn] ?? "").trim();
    if (raw === "") return;

    const key = raw;
    const sort = timeAxis ? (cellValue(raw, "date") as number | null) ?? index : index;
    const group = groups.get(key) ?? { values: [], rows: 0, sort };
    group.rows += 1;

    if (aggregation !== "count") {
      const value = cellValue(row[valueColumn] ?? "", "number");
      // A row whose value doesn't parse is counted in `rows` but excluded from
      // the maths, and the panel reports the difference rather than hiding it.
      if (typeof value === "number") group.values.push(value);
    }

    groups.set(key, group);
  });

  let points: ChartPoint[] = [...groups.entries()].map(([label, group]) => ({
    label,
    value: aggregation === "count" ? group.rows : combine(group.values, aggregation),
    rows: group.rows,
    sort: group.sort,
  }));

  // A time axis must run in time order; a category axis reads best biggest-first,
  // which is the ordering that makes a bar chart answer "which is largest".
  points.sort((a, b) => (timeAxis || kind === "line" ? a.sort - b.sort : b.value - a.value));

  let folded = 0;
  if (kind === "bar" && points.length > MAX_BARS) {
    const tail = points.slice(MAX_BARS - 1);
    folded = tail.length;
    points = [
      ...points.slice(0, MAX_BARS - 1),
      {
        label: `Other (${tail.length})`,
        // Summing an average would be meaningless, so a folded tail of
        // averages reports the average of the tail instead.
        value:
          aggregation === "mean"
            ? tail.reduce((total, point) => total + point.value, 0) / tail.length
            : combine(
                tail.map((point) => point.value),
                aggregation === "count" ? "sum" : aggregation,
              ),
        rows: tail.reduce((total, point) => total + point.rows, 0),
        sort: Number.MAX_SAFE_INTEGER,
      },
    ];
  }

  return { points, folded, timeAxis };
}

export interface Scale {
  min: number;
  max: number;
  /** Tick values, `min` and `max` included. */
  ticks: number[];
}

/**
 * A scale with round numbers on it.
 *
 * `includeZero` is not a preference — {@link buildSeries}'s caller passes true
 * for bars and false for lines, for the reason at the top of this file.
 */
export function niceScale(values: number[], includeZero: boolean, count = 4): Scale {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return { min: 0, max: 1, ticks: [0, 1] };

  let low = Math.min(...finite);
  let high = Math.max(...finite);
  if (includeZero) {
    low = Math.min(0, low);
    high = Math.max(0, high);
  }

  // A flat series has no range to divide; give it one so the marks have somewhere
  // to sit instead of dividing by zero.
  if (low === high) {
    if (low === 0) return { min: 0, max: 1, ticks: [0, 0.5, 1] };
    const pad = Math.abs(low) * 0.5;
    low = includeZero && low > 0 ? 0 : low - pad;
    high += pad;
  }

  const step = niceStep((high - low) / count);
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;

  const ticks: number[] = [];
  // Accumulating with a counter rather than `+= step` keeps the ticks exactly
  // on multiples of the step instead of drifting by float error.
  for (let i = 0; min + i * step <= max + step / 1e6; i += 1) {
    ticks.push(round(min + i * step, step));
  }

  return { min, max, ticks };
}

/** The nearest 1, 2, 2.5 or 5 × 10^n at or above `rough`. */
function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const factor = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Trim the float noise a tick inherits from its step. */
function round(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(value.toFixed(Math.min(12, decimals)));
}

/** Where a value sits on a scale, 0 at the bottom and 1 at the top. */
export const fraction = (value: number, scale: Scale): number =>
  scale.max === scale.min ? 0 : (value - scale.min) / (scale.max - scale.min);

/** A tick label: compact for large numbers, exact for small ones. */
export function tickLabel(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9) return `${round(value / 1e9, 0.1)}B`;
  if (magnitude >= 1e6) return `${round(value / 1e6, 0.1)}M`;
  if (magnitude >= 1e4) return `${round(value / 1e3, 0.1)}k`;
  return String(round(value, magnitude >= 10 ? 1 : 0.001));
}
