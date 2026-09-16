/**
 * Getting a sheet, or a comparison, out of the app.
 *
 * Three formats because they answer three different questions, and one of them
 * would not do for the others: **Markdown** to paste into a document or a
 * message, **CSV** to open in a spreadsheet and sort, **JSON** to feed to
 * something else. A PDF is deliberately absent — a spec sheet is a table of
 * text, and a picture of a table is the one shape none of those three uses can
 * work with.
 *
 * Every export carries its **provenance**: the source article's address and the
 * time the sheet was read. That is not decoration. These figures are quoted
 * from somewhere, and an export that drops the citation turns a checkable claim
 * into an anonymous one the moment it leaves the app.
 *
 * Pure string functions — no DOM, no download, nothing but text in and text
 * out — so the formats are covered by `specs.test.ts`.
 */

import { measureLabel } from "./measure";
import { bandFor, scoreProduct } from "./score";
import { PART_SEP } from "./wikitext";
import type { MeasureId, ProductRecord } from "./types";

/** Formats an export can be written in. */
export type ExportFormat = "md" | "csv" | "json";

export const FORMAT_LABEL: Record<ExportFormat, string> = {
  md: "Markdown",
  csv: "CSV",
  json: "JSON",
};

export const FORMAT_MIME: Record<ExportFormat, string> = {
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

/**
 * A filename that will not fight the filesystem.
 *
 * Anything that is not a letter, digit or dash becomes a dash, which loses a
 * little fidelity ("Sony α7 IV" → "sony-7-iv") and is the right trade: a name
 * the operating system silently rewrites, or refuses, is worse than a plain one.
 */
export function exportFilename(name: string, format: ExportFormat, suffix = ""): string {
  const stem = `${name}${suffix ? ` ${suffix}` : ""}`
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
  return `${stem || "spec-sheet"}.${format}`;
}

/** A CSV field: quoted when it holds a comma, a quote or a line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const csvRows = (rows: string[][]): string =>
  rows.map((row) => row.map(csvField).join(",")).join("\r\n");

/**
 * A Markdown table cell. The pipe is the column separator, so a value holding
 * one has to be escaped or the row silently grows a column; a newline would end
 * the row outright, and these values legitimately contain both.
 */
const mdCell = (value: string): string => value.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

/** The line every export ends with, naming where the figures came from. */
const provenance = (product: ProductRecord): string =>
  `Specifications quoted from ${product.sourceUrl}, read ${new Date(product.readAt).toISOString()}. ` +
  `Exported from OneApp Spec Analyser.`;

/* ------------------------------- one sheet -------------------------------- */

/** One product's whole sheet, as a document. */
function sheetMarkdown(product: ProductRecord): string {
  const score = scoreProduct(product.measures, product.category);
  const lines: string[] = [`# ${product.name}`, ""];

  if (product.description) lines.push(`*${product.description}*`, "");
  if (product.summary) lines.push(product.summary, "");

  const facts = [
    product.maker && `**Made by** ${product.maker}`,
    product.released && `**Released** ${product.released}`,
    `**Kind** ${product.categoryLabel}`,
    score.overall !== null &&
      `**Spec score** ${score.overall}/100 (${score.band}), from ${score.covered} of ${score.total} measures`,
  ].filter(Boolean);
  if (facts.length) lines.push(facts.join(" · "), "");

  for (const group of product.groups) {
    lines.push(`## ${group.title}`, "", "| Specification | Value |", "| --- | --- |");
    for (const field of group.fields) {
      lines.push(`| ${mdCell(field.label)} | ${mdCell(field.value.split(PART_SEP).join("; "))} |`);
    }
    lines.push("");
  }

  lines.push("---", "", provenance(product));
  return lines.join("\n");
}

/** One product's sheet as rows a spreadsheet can sort. */
function sheetCsv(product: ProductRecord): string {
  const rows: string[][] = [["Group", "Specification", "Value"]];
  for (const group of product.groups) {
    for (const field of group.fields) {
      rows.push([group.title, field.label, field.value.split(PART_SEP).join("; ")]);
    }
  }
  return csvRows(rows);
}

/**
 * One product's sheet as data.
 *
 * The whole record apart from the pictures, which are URLs into someone else's
 * media store and would be the only part of this file that rots.
 */
function sheetJson(product: ProductRecord): string {
  const score = scoreProduct(product.measures, product.category);
  return JSON.stringify(
    {
      name: product.name,
      description: product.description,
      category: product.category,
      categoryLabel: product.categoryLabel,
      maker: product.maker,
      released: product.released,
      summary: product.summary,
      groups: product.groups,
      measures: product.measures,
      score: { overall: score.overall, band: score.band, covered: score.covered, total: score.total, axes: score.axes },
      relatives: product.relatives,
      source: { url: product.sourceUrl, readAt: product.readAt, entityId: product.entityId },
    },
    null,
    2,
  );
}

/** One product's sheet in the chosen format. */
export function exportSheet(product: ProductRecord, format: ExportFormat): string {
  if (format === "csv") return sheetCsv(product);
  if (format === "json") return sheetJson(product);
  return sheetMarkdown(product);
}

/* ------------------------------ a comparison ------------------------------ */

/**
 * The measures every product in a comparison is lined up on — the same union,
 * in the same order, the on-screen table uses.
 */
function comparedIds(products: ProductRecord[]): MeasureId[] {
  const ids: MeasureId[] = [];
  for (const product of products) {
    for (const measure of product.measures) if (!ids.includes(measure.id)) ids.push(measure.id);
  }
  return ids;
}

/** A measure's reading for one product, or an em dash where it is unstated. */
const readingOf = (product: ProductRecord, id: MeasureId): string =>
  product.measures.find((m) => m.id === id)?.reading ?? "—";

/** Several products side by side, in the chosen format. */
export function exportComparison(products: ProductRecord[], format: ExportFormat): string {
  const ids = comparedIds(products);

  if (format === "json") {
    return JSON.stringify(
      {
        comparedAt: new Date().toISOString(),
        products: products.map((product) => {
          const score = scoreProduct(product.measures, product.category);
          return {
            name: product.name,
            category: product.category,
            maker: product.maker,
            released: product.released,
            score: { overall: score.overall, band: score.band, covered: score.covered, total: score.total },
            measures: Object.fromEntries(
              product.measures.map((m) => [m.id, { value: m.value, unit: m.unit, reading: m.reading, from: m.from }]),
            ),
            source: { url: product.sourceUrl, readAt: product.readAt },
          };
        }),
      },
      null,
      2,
    );
  }

  const header = ["Measure", ...products.map((p) => p.name)];
  const body = ids.map((id) => [measureLabel(id), ...products.map((p) => readingOf(p, id))]);

  const scores = products.map((p) => {
    const score = scoreProduct(p.measures, p.category);
    return score.overall === null ? "not scored" : `${score.overall}/100 (${bandFor(score.overall)})`;
  });
  body.push(["Spec score", ...scores]);

  if (format === "csv") return csvRows([header, ...body]);

  const lines = [
    `# ${products.map((p) => p.name).join(" vs ")}`,
    "",
    `| ${header.map(mdCell).join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.map(mdCell).join(" | ")} |`),
    "",
    "A dash means that sheet does not state the measure — not that the product lacks it.",
    "",
    ...products.map((p) => `- ${p.name}: ${provenance(p)}`),
  ];
  return lines.join("\n");
}
