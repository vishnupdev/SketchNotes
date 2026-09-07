/**
 * What a column contains, summarised.
 *
 * The point of this panel is the question a table cannot answer by being looked
 * at: is this column what I think it is. So the summary leads with the things
 * that reveal a data problem — how many values are blank, how many are
 * distinct, whether the mean and the median disagree — rather than only the
 * figures a spreadsheet's status bar shows.
 *
 * Everything here ignores blanks rather than treating them as zero. A mean that
 * counts missing values as nothing is wrong in a way that looks right.
 */

import { cellValue, type Column } from "./csv";

export interface NumericSummary {
  kind: "number";
  /** Values that parsed. */
  count: number;
  blanks: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  /** Population standard deviation. */
  stdDev: number;
  p25: number;
  p75: number;
}

export interface CategorySummary {
  kind: "category";
  count: number;
  blanks: number;
  distinct: number;
  /** The commonest values, most frequent first. */
  top: { value: string; count: number; share: number }[];
  /** Shortest and longest value, which is how a stray field shows up. */
  shortest: string;
  longest: string;
}

export interface DateSummary {
  kind: "date";
  count: number;
  blanks: number;
  earliest: number;
  latest: number;
  /** Distinct days covered. */
  days: number;
}

export type Summary = NumericSummary | CategorySummary | DateSummary;

const quantile = (sorted: number[], q: number): number => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  // Linear interpolation between the two neighbouring order statistics — the
  // same definition spreadsheets use, so a median here matches one there.
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper
    ? sorted[lower]
    : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

/** Summarise one column of a sheet. */
export function summarize(column: Column, rows: string[][], index: number): Summary {
  const raw = rows.map((row) => row[index] ?? "");
  const blanks = raw.filter((value) => value.trim() === "").length;

  if (column.type === "number") {
    const values = raw
      .map((value) => cellValue(value, "number"))
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);

    const count = values.length;
    const sum = values.reduce((total, value) => total + value, 0);
    const mean = count > 0 ? sum / count : 0;
    const variance =
      count > 0 ? values.reduce((total, value) => total + (value - mean) ** 2, 0) / count : 0;

    return {
      kind: "number",
      count,
      blanks,
      sum,
      mean,
      median: quantile(values, 0.5),
      min: count > 0 ? values[0] : 0,
      max: count > 0 ? values[count - 1] : 0,
      stdDev: Math.sqrt(variance),
      p25: quantile(values, 0.25),
      p75: quantile(values, 0.75),
    };
  }

  if (column.type === "date") {
    const times = raw
      .map((value) => cellValue(value, "date"))
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);

    const days = new Set(times.map((time) => Math.floor(time / 86_400_000)));
    return {
      kind: "date",
      count: times.length,
      blanks,
      earliest: times[0] ?? 0,
      latest: times[times.length - 1] ?? 0,
      days: days.size,
    };
  }

  const filled = raw.filter((value) => value.trim() !== "").map((value) => value.trim());
  const counts = new Map<string, number>();
  for (const value of filled) counts.set(value, (counts.get(value) ?? 0) + 1);

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([value, count]) => ({ value, count, share: count / filled.length }));

  const byLength = [...filled].sort((a, b) => a.length - b.length);

  return {
    kind: "category",
    count: filled.length,
    blanks,
    distinct: counts.size,
    top,
    shortest: byLength[0] ?? "",
    longest: byLength[byLength.length - 1] ?? "",
  };
}

/** A number formatted for a summary row: readable, and never in exponent form. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  const decimals = magnitude >= 1000 || Number.isInteger(value) ? 0 : magnitude >= 1 ? 2 : 4;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
