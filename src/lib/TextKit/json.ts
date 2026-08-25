import { findJsonFault } from "./locate";

/**
 * Reading, tidying and checking JSON.
 *
 * The part that earns its place is the *error*: a browser's parse message
 * ("Unexpected token } in JSON at position 428") is useless on a 400-line
 * document. Turning the position into a line and column, with the offending line
 * quoted, is the difference between finding the problem and giving up.
 */

export interface JsonError {
  message: string;
  line: number;
  column: number;
  /** The line the parser tripped on, for pointing at. */
  excerpt: string;
}

export type JsonResult = { ok: true; text: string } | { ok: false; error: JsonError };

/** Turn a character offset into a 1-based line and column. */
export function locate(text: string, position: number): { line: number; column: number } {
  const upto = text.slice(0, Math.max(0, position));
  const lines = upto.split(/\r?\n/);
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

/**
 * Describe a failed parse.
 *
 * The position comes from our own validator (`./locate.ts`), never from the
 * engine's message: V8 dropped "at position N" in favour of quoting a fragment,
 * and every engine words it differently — so scraping the message gives a
 * confident, wrong line number. Falling back to the engine's text for the
 * *wording* is fine; the location has to be found properly.
 */
function asError(error: unknown, text: string): JsonError {
  const fault = findJsonFault(text);
  const { line, column } = locate(text, fault?.index ?? 0);
  const engineMessage = error instanceof Error ? error.message : "Invalid JSON";
  return {
    message:
      fault?.message ??
      engineMessage.replace(/\s*in JSON at position \d+.*/i, "").replace(/^JSON\.parse:\s*/i, ""),
    line,
    column,
    excerpt: text.split(/\r?\n/)[line - 1]?.trim().slice(0, 120) ?? "",
  };
}

export function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: JsonError } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: asError(error, text) };
  }
}

/** Pretty-print with a chosen indent. */
export function formatJson(text: string, indent: 2 | 4 | "\t" = 2): JsonResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value, null, indent) };
}

/** Strip every optional byte. */
export function minifyJson(text: string): JsonResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value) };
}

/**
 * Sort object keys, everywhere, at every depth — so two documents that hold the
 * same data can actually be compared line by line. Arrays keep their order,
 * because in an array the order *is* data.
 */
export function sortJsonKeys(text: string, indent: 2 | 4 | "\t" = 2): JsonResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const sort = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, sort(v)]),
      );
    }
    return value;
  };
  return { ok: true, text: JSON.stringify(sort(parsed.value), null, indent) };
}

/** A one-line description of what the document holds. */
export function describeJson(text: string): string {
  const parsed = parseJson(text);
  if (!parsed.ok) return "";
  const value = parsed.value;
  if (Array.isArray(value)) return `array of ${value.length}`;
  if (value === null) return "null";
  if (typeof value === "object") {
    const keys = Object.keys(value as object).length;
    return `object with ${keys} key${keys === 1 ? "" : "s"}`;
  }
  return typeof value;
}
