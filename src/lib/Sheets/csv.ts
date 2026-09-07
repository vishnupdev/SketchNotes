/**
 * Reading and writing delimited text.
 *
 * A CSV parser is one of those jobs that looks like `split(",")` and is not.
 * The cases that break the naive version are all common in real exports: a
 * quoted field containing the delimiter, a quoted field containing a *newline*,
 * an escaped quote inside a quoted field, a UTF-8 BOM from Excel, CRLF line
 * endings, a semicolon delimiter from a European locale, and a final row with
 * no terminator. Each of those turns a table silently wrong rather than
 * failing — you get a column shifted by one and a chart of nonsense — so this
 * is a proper character-at-a-time scanner (RFC 4180, plus the tab/semicolon
 * delimiters everyone actually emits).
 *
 * The parser never throws on a malformed file. A spreadsheet you cannot open at
 * all is less useful than one opened with its problems listed, so ragged rows
 * are padded to the header width and reported in {@link ParsedSheet.warnings}.
 */

/** Delimiters worth sniffing for. Comma first, so it wins a tie. */
export const DELIMITERS = [",", ";", "\t", "|"] as const;
export type Delimiter = (typeof DELIMITERS)[number];

export const DELIMITER_NAMES: Record<Delimiter, string> = {
  ",": "Comma",
  ";": "Semicolon",
  "\t": "Tab",
  "|": "Pipe",
};

/** What a column holds, inferred from its values. */
export type ColumnType = "number" | "date" | "boolean" | "text";

export interface Column {
  name: string;
  type: ColumnType;
  /** Values that don't fit the inferred type — usually blanks. */
  blanks: number;
}

export interface ParsedSheet {
  columns: Column[];
  /** Body rows, every one padded to `columns.length`. */
  rows: string[][];
  delimiter: Delimiter;
  /** Problems worth telling the user about, in the order they were found. */
  warnings: string[];
}

/**
 * Guess the delimiter.
 *
 * Counted only on the **first line**, and outside quotes: a comma inside a
 * quoted address field is not evidence of a comma-separated file, and counting
 * the whole document lets one chatty text column outvote the real delimiter.
 * The winner is the candidate appearing most often; a file with none of them
 * is a single-column file, which comma handles correctly.
 */
export function sniffDelimiter(text: string): Delimiter {
  const line = firstLineOutsideQuotes(text);
  let best: Delimiter = ",";
  let bestCount = 0;

  for (const delimiter of DELIMITERS) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === delimiter) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

/** The header line, respecting a quoted field that spans lines. */
function firstLineOutsideQuotes(text: string): string {
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) return text.slice(0, i);
  }
  return text;
}

/**
 * Scan delimited text into rows of fields.
 *
 * Exported separately from {@link parseSheet} because it is the part with no
 * opinions: no header, no type inference, no padding — just the fields exactly
 * as written.
 */
export function parseRows(text: string, delimiter: Delimiter): string[][] {
  // Excel prefixes a BOM; left in place it becomes part of the first column's
  // name and every lookup of that column misses.
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let started = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    started = false;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote is a literal quote; a lone one closes the field.
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"' && !started) {
      quoted = true;
      started = true;
    } else if (char === delimiter) {
      endField();
      started = false;
    } else if (char === "\r") {
      // Swallow the LF of a CRLF pair rather than emitting an empty row.
      if (source[i + 1] === "\n") i += 1;
      endRow();
    } else if (char === "\n") {
      endRow();
    } else {
      field += char;
      started = true;
    }
  }

  // A file with no trailing newline still has a last row; one *with* a trailing
  // newline must not gain an empty one.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/** Whether a string reads as a number, allowing the shapes exports contain. */
export function parseNumber(raw: string): number | null {
  const value = raw.trim();
  if (value === "") return null;

  // Currency symbols, thousands separators, a trailing percent, and accounting
  // parentheses for negatives — all of which appear in exported spreadsheets.
  const negative = /^\(.*\)$/.test(value);
  const percent = /%$/.test(value);
  const cleaned = value
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[£$€¥₹]/g, "")
    .replace(/%$/, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  if (cleaned === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) return null;

  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  // A percentage is kept as the number written, not divided: a "23%" column
  // charts and sums as 23, which is what the person who typed it means.
  return negative ? -number : percent ? number : number;
}

const TRUE_WORDS = new Set(["true", "yes", "y", "1"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0"]);

export function parseBoolean(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (TRUE_WORDS.has(value)) return true;
  if (FALSE_WORDS.has(value)) return false;
  return null;
}

/**
 * Whether a string reads as a date.
 *
 * Restricted to unambiguous shapes on purpose. `Date.parse` accepts a great
 * deal — including bare numbers and `03/04/2024`, which is two different days
 * depending on where you live — and a column wrongly typed as dates sorts
 * wrongly and charts wrongly. ISO dates and `12 Mar 2024` are recognised;
 * anything ambiguous stays text, where sorting it alphabetically at least
 * matches what the user can see.
 */
export function parseDate(raw: string): number | null {
  const value = raw.trim();
  if (value === "") return null;
  const iso = /^\d{4}-\d{2}(-\d{2})?([ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  const named = /^\d{1,2}[ -](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ -]\d{4}$/i;
  if (!iso.test(value) && !named.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** The value of a cell, read as its column's type. */
export function cellValue(raw: string, type: ColumnType): number | boolean | string | null {
  switch (type) {
    case "number":
      return parseNumber(raw);
    case "date":
      return parseDate(raw);
    case "boolean":
      return parseBoolean(raw);
    default:
      return raw.trim() === "" ? null : raw;
  }
}

/**
 * Infer a column's type from its values.
 *
 * A column is a type only if **every** non-blank value fits it, in the order
 * number → date → boolean → text. One stray "n/a" in a column of numbers makes
 * it text, which is the conservative answer: charting a column whose values
 * mostly parse would silently drop the rows that don't.
 */
export function inferType(values: string[]): ColumnType {
  const filled = values.filter((value) => value.trim() !== "");
  if (filled.length === 0) return "text";

  if (filled.every((value) => parseNumber(value) !== null)) return "number";
  if (filled.every((value) => parseDate(value) !== null)) return "date";
  // Requires two distinct values, or a column of "1"s becomes booleans.
  if (filled.every((value) => parseBoolean(value) !== null) && new Set(filled).size > 1) {
    return "boolean";
  }
  return "text";
}

export const MAX_ROWS = 50_000;

/**
 * Parse delimited text into a sheet: named, typed columns and padded rows.
 *
 * The first row is taken as the header. A header cell that is empty gets a
 * positional name (`Column 3`) rather than being left blank, and duplicate
 * names are suffixed, because two columns with one name make every lookup
 * ambiguous.
 */
export function parseSheet(text: string, forced?: Delimiter): ParsedSheet {
  const delimiter = forced ?? sniffDelimiter(text);
  const warnings: string[] = [];
  const raw = parseRows(text, delimiter).filter(
    // A row of nothing but empty fields is a blank line, not a record.
    (row) => row.some((field) => field.trim() !== ""),
  );

  if (raw.length === 0) {
    return { columns: [], rows: [], delimiter, warnings: ["There was nothing to read."] };
  }

  const seen = new Map<string, number>();
  const names = raw[0].map((cell, index) => {
    const base = cell.trim() === "" ? `Column ${index + 1}` : cell.trim();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });

  if (seen.size !== names.length) {
    warnings.push("Two columns had the same heading; the later ones were numbered.");
  }

  let body = raw.slice(1);
  if (body.length > MAX_ROWS) {
    warnings.push(`Only the first ${MAX_ROWS.toLocaleString()} rows were read.`);
    body = body.slice(0, MAX_ROWS);
  }

  const short = body.filter((row) => row.length < names.length).length;
  const long = body.filter((row) => row.length > names.length).length;
  if (short > 0) warnings.push(`${short} row(s) had fewer fields than the header; padded.`);
  if (long > 0) warnings.push(`${long} row(s) had more fields than the header; the extras were kept.`);

  // Widen to the longest row: dropping the overflow would throw away data
  // without saying which, and the extra columns get positional names above.
  const width = Math.max(names.length, ...body.map((row) => row.length));
  for (let i = names.length; i < width; i += 1) names.push(`Column ${i + 1}`);

  const rows = body.map((row) =>
    row.length === width ? row : [...row, ...Array(width - row.length).fill("")],
  );

  const columns: Column[] = names.map((name, index) => {
    const values = rows.map((row) => row[index] ?? "");
    return {
      name,
      type: inferType(values),
      blanks: values.filter((value) => value.trim() === "").length,
    };
  });

  return { columns, rows, delimiter, warnings };
}

/** Quote a field only when it needs it, the way every reader expects. */
export function escapeField(value: string, delimiter: Delimiter): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r") ||
    value !== value.trim();
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise back to delimited text. CRLF, which is what RFC 4180 specifies. */
export function toCsv(columns: string[], rows: string[][], delimiter: Delimiter = ","): string {
  const line = (fields: string[]) => fields.map((f) => escapeField(f, delimiter)).join(delimiter);
  return [line(columns), ...rows.map(line)].join("\r\n");
}

/** Serialise as a Markdown table, for pasting into the Markdown app or a PR. */
export function toMarkdown(columns: string[], rows: string[][]): string {
  const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${columns.map(cell).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

/** Serialise as an array of objects, which is what an API usually wants. */
export function toJson(columns: Column[], rows: string[][]): string {
  const records = rows.map((row) =>
    Object.fromEntries(
      columns.map((column, index) => [column.name, cellValue(row[index] ?? "", column.type)]),
    ),
  );
  return JSON.stringify(records, null, 2);
}
