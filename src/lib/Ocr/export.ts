/**
 * Getting the text out — four shapes, because the right one depends entirely on
 * what the picture was.
 *
 * A page of prose wants its paragraphs rejoined. A receipt or a table wants its
 * line breaks left exactly where they were, because the layout *is* the
 * information. A proofreading pass wants the uncertain words marked. And a
 * spreadsheet wants one row per word with the confidence and the position, so
 * the doubt is data rather than a colour on a screen.
 *
 * All four are pure functions of an {@link OcrResult}.
 */

import { flagged, LOW_CONFIDENCE, reflow, type OcrResult } from "./blocks";

export type ExportShape = "paragraphs" | "lines" | "review" | "tsv";

export interface ShapeInfo {
  id: ExportShape;
  label: string;
  /** What this shape is for — shown beside the choice, not in a tooltip. */
  hint: string;
  extension: string;
  mime: string;
}

export const SHAPES: ShapeInfo[] = [
  {
    id: "paragraphs",
    label: "Paragraphs",
    hint: "Line breaks rejoined, hyphens healed — for pasting into a document",
    extension: "txt",
    mime: "text/plain",
  },
  {
    id: "lines",
    label: "Lines",
    hint: "Exactly as laid out — for receipts, tables and code",
    extension: "txt",
    mime: "text/plain",
  },
  {
    id: "review",
    label: "For checking",
    hint: "Uncertain words marked so you can proofread against the picture",
    extension: "txt",
    mime: "text/plain",
  },
  {
    id: "tsv",
    label: "Spreadsheet",
    hint: "One row per word, with confidence and position",
    extension: "tsv",
    mime: "text/tab-separated-values",
  },
];

/** Prose: paragraphs rebuilt, one blank line between them. */
export const asParagraphs = (result: OcrResult): string => reflow(result);

/** The layout preserved — one output line per recognised line. */
export const asLines = (result: OcrResult): string =>
  result.lines.map((line) => line.text).join("\n");

/**
 * The layout preserved, with every uncertain word wrapped in guillemets.
 *
 * Marked inline rather than listed at the end, because the point is to read the
 * text against the picture and stop at each mark. A separate list of suspect
 * words loses the context that tells you what the word must have been.
 */
export function asReview(result: OcrResult): string {
  const body = result.lines
    .map((line) =>
      line.words
        .map((word) => (word.confidence < LOW_CONFIDENCE ? `»${word.text}«` : word.text))
        .join(" "),
    )
    .join("\n");

  const low = flagged(result).length;
  const header =
    low === 0
      ? `# No uncertain words — every word scored above ${LOW_CONFIDENCE}%.`
      : `# ${low} uncertain word${low === 1 ? "" : "s"} marked »like this«, scoring under ${LOW_CONFIDENCE}%.`;

  return `${header}\n\n${body}`;
}

/**
 * One row per word. Tab-separated rather than comma-separated because the text
 * being exported is arbitrary and frequently contains commas; a tab in
 * recognised text is impossible, since the engine never emits one.
 */
export function asTsv(result: OcrResult): string {
  const rows = [["line", "word", "confidence", "x", "y", "width", "height"].join("\t")];
  for (const word of result.words) {
    rows.push(
      [
        word.line + 1,
        word.text,
        word.confidence.toFixed(1),
        Math.round(word.box.x),
        Math.round(word.box.y),
        Math.round(word.box.w),
        Math.round(word.box.h),
      ].join("\t"),
    );
  }
  return rows.join("\n");
}

/** Render a result in the requested shape. */
export function render(result: OcrResult, shape: ExportShape): string {
  switch (shape) {
    case "paragraphs":
      return asParagraphs(result);
    case "lines":
      return asLines(result);
    case "review":
      return asReview(result);
    case "tsv":
      return asTsv(result);
  }
}

/**
 * A filename for the export: the source name with its extension swapped, so a
 * folder of exports sorts alongside the pictures they came from.
 */
export function exportName(source: string, shape: ExportShape): string {
  const info = SHAPES.find((candidate) => candidate.id === shape) ?? SHAPES[0];
  const stem = source.replace(/\.[^.]+$/, "") || "text";
  const suffix = shape === "paragraphs" ? "" : `-${shape}`;
  return `${stem}${suffix}.${info.extension}`;
}
