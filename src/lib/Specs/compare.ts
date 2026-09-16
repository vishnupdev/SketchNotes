/**
 * Putting two or more sheets next to each other.
 *
 * Two jobs, both pure, both here rather than inside a component so they can be
 * tested: the **table** several products are laid out in, and the **diff**
 * between one product and the one it replaced.
 *
 * The diff is the more opinionated of the two. "Is it worth upgrading" is the
 * question almost every product lookup is really asking, and the honest answer
 * is a short list of what actually moved — not a table of forty rows that are
 * mostly identical, and not a single verdict this app has no business giving.
 */

import { lowerIsBetter, measureLabel } from "./measure";
import type { Measure, MeasureId, ProductRecord } from "./types";

/* -------------------------------- the table ------------------------------- */

/** One row of a comparison: a measure, and each product's answer for it. */
export interface CompareRow {
  id: MeasureId;
  label: string;
  cells: { reading: string | null; best: boolean }[];
  /** Whether the products actually differ here — what "differences only" keeps. */
  differs: boolean;
}

/**
 * Build the comparison table.
 *
 * A measure only earns a row if *some* product states it, and a leader is only
 * marked when **two or more** of them do — one product's number is not a
 * comparison, and a lone mark beside the only stated figure reads as "this one
 * won" when nothing was raced. That restraint is the whole correctness of this
 * table.
 */
export function buildRows(products: ProductRecord[]): CompareRow[] {
  const ids: MeasureId[] = [];
  for (const product of products) {
    for (const measure of product.measures) if (!ids.includes(measure.id)) ids.push(measure.id);
  }

  return ids.map((id) => {
    const values = products.map((p) => p.measures.find((m) => m.id === id) ?? null);
    const stated = values.filter((v): v is Measure => v !== null);

    let winner: number | null = null;
    if (stated.length > 1) {
      const lower = lowerIsBetter(id);
      let bestValue = lower ? Infinity : -Infinity;
      for (const [i, measure] of values.entries()) {
        if (!measure) continue;
        if (lower ? measure.value < bestValue : measure.value > bestValue) {
          bestValue = measure.value;
          winner = i;
        }
      }
      // A tie has no winner: marking the first of two identical figures as the
      // better one is simply false.
      if (values.filter((v) => v && v.value === bestValue).length > 1) winner = null;
    }

    // "Different" means the *numbers* differ, not the wording. Two sheets
    // saying "5000 mAh" and "5,000 mAh" are agreeing, and a filter that treats
    // them as a difference would bury the real ones. A measure only one product
    // states is a difference too — it is the sharpest kind.
    const numbers = new Set(stated.map((m) => m.value));
    const differs = numbers.size > 1 || stated.length !== values.length;

    return {
      id,
      label: measureLabel(id),
      differs,
      cells: values.map((measure, i) => ({
        reading: measure?.reading ?? null,
        best: winner === i,
      })),
    };
  });
}

/* --------------------------------- the diff ------------------------------- */

/** What happened to one measure between a product and its predecessor. */
export type ChangeKind = "improved" | "reduced" | "same" | "added" | "dropped";

export interface MeasureChange {
  id: MeasureId;
  label: string;
  /** The predecessor's reading, or null where it stated none. */
  from: string | null;
  /** This product's reading, or null where it states none. */
  to: string | null;
  /**
   * Signed percentage change, where both sheets state the measure. Always
   * "how much bigger is the number", never "how much better" — the direction
   * of *better* is carried by {@link MeasureChange.kind}, because for weight
   * and 0–100 time a smaller number is the improvement.
   */
  percent: number | null;
  kind: ChangeKind;
}

/**
 * Release year is excluded from a diff.
 *
 * A successor is newer by definition, so "+1 year" appears in every generation
 * comparison ever made and tells a reader nothing. It earns its place on the
 * *score* — where it says how current a specification is — and is noise here.
 */
const NOT_A_CHANGE: MeasureId[] = ["year"];

/** Below this, a figure has moved by less than the sources' own rounding. */
const NOISE_PERCENT = 0.5;

/**
 * What changed between a product and the one it replaced.
 *
 * Ordered by how much moved, largest first, so the headline is the top row.
 * Measures both sheets state identically come last and are marked `same` rather
 * than dropped: "the battery did not change" is an answer someone is looking
 * for, and its absence would read as "not stated".
 */
export function diffMeasures(now: Measure[], before: Measure[]): MeasureChange[] {
  const ids: MeasureId[] = [];
  for (const measure of [...now, ...before]) {
    if (!ids.includes(measure.id) && !NOT_A_CHANGE.includes(measure.id)) ids.push(measure.id);
  }

  const changes = ids.map((id): MeasureChange => {
    const current = now.find((m) => m.id === id) ?? null;
    const previous = before.find((m) => m.id === id) ?? null;
    const label = measureLabel(id);

    if (current && !previous) {
      return { id, label, from: null, to: current.reading, percent: null, kind: "added" };
    }
    if (!current && previous) {
      return { id, label, from: previous.reading, to: null, percent: null, kind: "dropped" };
    }
    if (!current || !previous) {
      // Unreachable: an id only exists because one of the two stated it.
      return { id, label, from: null, to: null, percent: null, kind: "same" };
    }

    const percent = previous.value === 0 ? null : ((current.value - previous.value) / previous.value) * 100;
    const moved = percent !== null && Math.abs(percent) >= NOISE_PERCENT;

    if (!moved) {
      return { id, label, from: previous.reading, to: current.reading, percent, kind: "same" };
    }

    const bigger = current.value > previous.value;
    const kind: ChangeKind = bigger === !lowerIsBetter(id) ? "improved" : "reduced";
    return { id, label, from: previous.reading, to: current.reading, percent, kind };
  });

  const weight = (kind: ChangeKind): number => (kind === "same" ? 1 : 0);

  return changes.sort((a, b) => {
    const byKind = weight(a.kind) - weight(b.kind);
    if (byKind !== 0) return byKind;
    return Math.abs(b.percent ?? 0) - Math.abs(a.percent ?? 0);
  });
}

/** How a diff reads in one line: "4 of 9 measures changed". */
export function summariseDiff(changes: MeasureChange[]): string {
  const moved = changes.filter((c) => c.kind !== "same").length;
  if (changes.length === 0) return "Neither sheet states a measure this app can compare.";
  if (moved === 0) return `Nothing measurable changed across ${changes.length} comparable specifications.`;
  return `${moved} of ${changes.length} comparable specifications changed.`;
}
