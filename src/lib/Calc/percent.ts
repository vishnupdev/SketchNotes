/**
 * The four percentage questions, each phrased as the question rather than as
 * the arithmetic.
 *
 * The tape can already work all of these out — none is more than a multiply and
 * a divide. What it cannot do is tell you *which* multiply and divide, and that
 * is the entire difficulty with percentages. The two that people get wrong are
 * worth naming:
 *
 * - **Reverse** — a price of 118 that includes 18% tax did not have 18% added
 *   *to 118*. Subtracting 18% of 118 gives 96.76 and is wrong; the answer is
 *   118 / 1.18 = 100. This is the single commonest percentage mistake there is,
 *   and having it as its own labelled question is the point of this panel.
 * - **Change** — a fall from 200 to 100 is -50%, but the rise back from 100 to
 *   200 is +100%. The same absolute move is two different percentages depending
 *   which end you start from, which is why the base is stated in the answer
 *   rather than left implied.
 *
 * Every function here is total: it returns null where the question has no
 * answer, rather than Infinity or NaN, so a panel never has to render one.
 */

export type PercentQuestion = "of" | "share" | "change" | "reverse";

export interface QuestionShape {
  id: PercentQuestion;
  /** Tab label — a couple of words. */
  label: string;
  /** The question in words, with the two inputs marked as {a} and {b}. */
  ask: string;
  /** Labels for the two inputs, in order. */
  fields: [string, string];
  /** What the answer is a quantity of, shown beside the figure. */
  unit: "value" | "percent";
}

export const QUESTIONS: QuestionShape[] = [
  {
    id: "of",
    label: "Take a %",
    ask: "What is {a}% of {b}?",
    fields: ["Percent", "Of what"],
    unit: "value",
  },
  {
    id: "share",
    label: "Find the %",
    ask: "{a} is what percent of {b}?",
    fields: ["This much", "Out of"],
    unit: "percent",
  },
  {
    id: "change",
    label: "Change",
    ask: "What is the change from {a} to {b}?",
    fields: ["From", "To"],
    unit: "percent",
  },
  {
    id: "reverse",
    label: "Reverse",
    ask: "{a} already includes {b}% — what was it before?",
    fields: ["Including", "Percent added"],
    unit: "value",
  },
];

export const QUESTION_MAP: Record<PercentQuestion, QuestionShape> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
) as Record<PercentQuestion, QuestionShape>;

export interface PercentAnswer {
  /** The figure itself — a value or a percentage, per the question's `unit`. */
  value: number;
  /** The arithmetic, written out, so the answer can be checked not just read. */
  working: string;
  /** The sentence under it — what the figure means, and what it is relative to. */
  note: string;
}

/** Answer one percentage question, or null when the inputs cannot support one. */
export function answerPercent(
  question: PercentQuestion,
  a: number,
  b: number,
): PercentAnswer | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  switch (question) {
    case "of":
      return {
        value: (a / 100) * b,
        working: `${b} × ${a} ÷ 100`,
        note: `${a}% of ${b}. The rest — the other ${round(100 - a)}% — is ${round(
          b - (a / 100) * b,
        )}.`,
      };

    case "share": {
      if (b === 0) return null;
      const share = (a / b) * 100;
      return {
        value: share,
        working: `${a} ÷ ${b} × 100`,
        note:
          share > 100
            ? `${a} is larger than ${b}, so it is ${round(share - 100)}% more than the whole.`
            : `${a} out of ${b}. The remaining ${round(b - a)} is the other ${round(100 - share)}%.`,
      };
    }

    case "change": {
      if (a === 0) return null;
      const change = ((b - a) / Math.abs(a)) * 100;
      return {
        value: change,
        working: `(${b} − ${a}) ÷ ${Math.abs(a)} × 100`,
        note: `A ${change >= 0 ? "rise" : "fall"} of ${round(Math.abs(b - a))}, measured against ${a}. Going back the other way is ${
          b === 0 ? "not a percentage at all" : `${round(((a - b) / Math.abs(b)) * 100)}%`
        } — the base is what changed.`,
      };
    }

    case "reverse": {
      // -100% would mean the original was scaled to nothing, so there is no
      // figure to recover.
      if (b === -100) return null;
      const before = a / (1 + b / 100);
      return {
        value: before,
        working: `${a} ÷ ${round(1 + b / 100)}`,
        note: `The ${b}% part of ${a} is ${round(a - before)} — not ${round(
          (b / 100) * a,
        )}, which is what taking ${b}% off ${a} would give. That difference is the whole reason this question needs its own answer.`,
      };
    }
  }
}

/** Short, readable rounding for the explanatory sentences only. */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;
