/**
 * The tape: a whole document of expressions, evaluated top to bottom.
 *
 * This is the shape of calculator that suits a real question. "What does this
 * cost me a month" is never one expression — it is a rate, a count, a discount
 * and a total, and on a single-line calculator each intermediate answer has to
 * be held in your head or written down. Here every line stays on screen, keeps
 * its own answer, and can be named and used by the lines below it.
 *
 * The design rule throughout: **one bad line must never cost you the others.**
 * A half-typed line in the middle of a document reports its own error and the
 * lines after it carry on, because you are always mid-edit somewhere, and a tape
 * that blanked itself on every keystroke would be unusable.
 *
 * One boundary worth knowing: a name holds a *number*, so a percent that goes
 * into one comes out as its fraction. `cut = 12%` then `500 - cut` is 499.88,
 * not 440 — the contextual percent rule (see `expression.ts`) only applies to a
 * `%` written on the line doing the arithmetic. Keeping it that way is what
 * makes a name mean exactly one thing wherever it appears.
 */

import { evaluate, type Angle } from "./expression";

export type LineKind = "blank" | "comment" | "assign" | "value" | "error";

export interface TapeLine {
  /** 0-based position in the source, so a result can sit beside its line. */
  index: number;
  kind: LineKind;
  /** The variable an assignment line defines. */
  name?: string;
  value?: number;
  error?: string;
}

export interface TapeResult {
  lines: TapeLine[];
  /**
   * The running total of every plain value line — what the paper tape this is
   * named after adds up. Assignments are excluded: naming an intermediate is
   * not the same as adding it to a column of figures.
   */
  total: number;
  /** How many lines the total covers, so the label can be honest. */
  counted: number;
  /** Every name in scope at the end, for the variables list. */
  vars: Record<string, number>;
  /** The last successful answer — also what `ans` holds on the next line. */
  last: number | null;
}

/** `name = …`, where the name is not part of a comparison or a keyword. */
const ASSIGN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)([\s\S]*)$/;

/**
 * Strip a trailing comment.
 *
 * `//` is the marker rather than `#`, which is reserved for a whole-line
 * comment: `#` reads as a label above a group of figures, and `//` as a note
 * about the figure on that line.
 */
const withoutComment = (line: string): string => line.split("//")[0];

/**
 * Evaluate a tape.
 *
 * `ans` refers to the previous line's answer, and any assigned name to its
 * value — both resolved as the tape is walked, so a line can only ever use what
 * is above it. That restriction is the point: it makes the document readable in
 * the order it is written, and makes a circular reference impossible rather than
 * something to detect.
 */
export function evaluateTape(src: string, angle: Angle = "deg"): TapeResult {
  const vars: Record<string, number> = {};
  const lines: TapeLine[] = [];
  let total = 0;
  let counted = 0;
  let last: number | null = null;

  src.split("\n").forEach((raw, index) => {
    const trimmed = raw.trim();

    if (trimmed === "") {
      lines.push({ index, kind: "blank" });
      return;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      lines.push({ index, kind: "comment" });
      return;
    }

    const body = withoutComment(trimmed).trim();
    if (body === "") {
      lines.push({ index, kind: "comment" });
      return;
    }

    const scope = last === null ? vars : { ...vars, ans: last };
    const assign = body.match(ASSIGN);
    const result = evaluate(assign ? assign[2] : body, scope, angle);

    if (!result.ok) {
      lines.push({ index, kind: "error", error: result.error, name: assign?.[1] });
      return;
    }

    last = result.value;

    if (assign) {
      const name = assign[1].toLowerCase();
      vars[name] = result.value;
      lines.push({ index, kind: "assign", name, value: result.value });
      return;
    }

    total += result.value;
    counted += 1;
    lines.push({ index, kind: "value", value: result.value });
  });

  return { lines, total, counted, vars, last };
}

/**
 * The example tape a first visit opens on, rather than an empty box.
 *
 * It is a column of figures on purpose — that is the shape the total is for,
 * and a chain of `ans` lines would total to something meaningless. The naming
 * and `ans` are offered as insertable examples in the panel instead.
 */
export const SAMPLE_TAPE = [
  "# Plain lines are added up. The total is below.",
  "1250 - 12%     // keyboard, less the discount",
  "4780 - 12%     // monitor",
  "890 * 2        // two chairs",
].join("\n");
