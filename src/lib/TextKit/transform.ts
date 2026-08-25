/**
 * Text transformations.
 *
 * The everyday operations that otherwise send someone to a random website with
 * ads and an upload box: change the case, sort the lines, strip the duplicates,
 * count the words. All of it is a pure function of a string, which means it runs
 * with no network, no permission and no server — and is exactly testable.
 */

export type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab";

export const CASES: Array<{ id: CaseId; label: string }> = [
  { id: "upper", label: "UPPER CASE" },
  { id: "lower", label: "lower case" },
  { id: "title", label: "Title Case" },
  { id: "sentence", label: "Sentence case" },
  { id: "camel", label: "camelCase" },
  { id: "pascal", label: "PascalCase" },
  { id: "snake", label: "snake_case" },
  { id: "kebab", label: "kebab-case" },
];

/** Split on anything that isn't a letter or digit, for the identifier cases. */
const words = (text: string): string[] =>
  text
    // A boundary inside runs like "parseHTMLDoc" as well as at separators, so
    // "parseHTMLDoc" becomes parse / HTML / Doc rather than one word.
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

export function changeCase(text: string, id: CaseId): string {
  switch (id) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      // Every word capitalised, punctuation and spacing left exactly as it was.
      return text.replace(/\p{L}[\p{L}\p{N}']*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    case "sentence":
      return text
        .toLowerCase()
        .replace(/(^\s*|[.!?]\s+)(\p{Ll})/gu, (_, lead: string, ch: string) => lead + ch.toUpperCase());
    case "camel": {
      const parts = words(text).map((w) => w.toLowerCase());
      return parts.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
    }
    case "pascal":
      return words(text)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join("");
    case "snake":
      return words(text)
        .map((w) => w.toLowerCase())
        .join("_");
    case "kebab":
      return words(text)
        .map((w) => w.toLowerCase())
        .join("-");
  }
}

export type LineOp =
  | "sort"
  | "sortDesc"
  | "sortNatural"
  | "dedupe"
  | "reverse"
  | "shuffleless"
  | "trim"
  | "dropBlank"
  | "number";

export const LINE_OPS: Array<{ id: LineOp; label: string; hint: string }> = [
  { id: "sort", label: "Sort A→Z", hint: "Alphabetical, case-insensitive" },
  { id: "sortDesc", label: "Sort Z→A", hint: "Reverse alphabetical" },
  { id: "sortNatural", label: "Sort naturally", hint: "file2 before file10" },
  { id: "dedupe", label: "Remove duplicates", hint: "Keeps the first of each" },
  { id: "reverse", label: "Reverse order", hint: "Last line first" },
  { id: "trim", label: "Trim each line", hint: "Strip leading and trailing space" },
  { id: "dropBlank", label: "Drop blank lines", hint: "Including whitespace-only" },
  { id: "number", label: "Number the lines", hint: "1. 2. 3. …" },
];

/** Preserve the document's own line ending rather than imposing one. */
const newlineOf = (text: string): string => (text.includes("\r\n") ? "\r\n" : "\n");

const collator = new Intl.Collator(undefined, { sensitivity: "base" });
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function transformLines(text: string, op: LineOp): string {
  const nl = newlineOf(text);
  const lines = text.split(/\r?\n/);

  switch (op) {
    case "sort":
      return [...lines].sort((a, b) => collator.compare(a, b)).join(nl);
    case "sortDesc":
      return [...lines].sort((a, b) => collator.compare(b, a)).join(nl);
    case "sortNatural":
      return [...lines].sort((a, b) => naturalCollator.compare(a, b)).join(nl);
    case "dedupe": {
      const seen = new Set<string>();
      return lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true))).join(nl);
    }
    case "reverse":
      return [...lines].reverse().join(nl);
    case "trim":
      return lines.map((l) => l.trim()).join(nl);
    case "dropBlank":
      return lines.filter((l) => l.trim() !== "").join(nl);
    case "number": {
      const width = String(lines.length).length;
      return lines.map((l, i) => `${String(i + 1).padStart(width, " ")}. ${l}`).join(nl);
    }
    default:
      return text;
  }
}

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
  bytes: number;
  /** Rough reading time at 200 words a minute, in minutes. */
  readingMinutes: number;
}

/** Counts, measured the way people expect rather than the way code does. */
export function measure(text: string): TextStats {
  // Grapheme-ish: count code points, so an emoji is one character rather than two.
  const characters = [...text].length;
  const wordList = text.trim() ? text.trim().split(/\s+/) : [];
  return {
    characters,
    charactersNoSpaces: [...text.replace(/\s/g, "")].length,
    words: wordList.length,
    // An empty document has no lines; otherwise the last line counts even
    // without a trailing newline.
    lines: text === "" ? 0 : text.split(/\r?\n/).length,
    paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
    bytes: typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length,
    readingMinutes: Math.max(wordList.length ? 1 : 0, Math.round(wordList.length / 200)),
  };
}
