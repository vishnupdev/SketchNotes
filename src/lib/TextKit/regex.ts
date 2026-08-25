/**
 * A regular-expression workbench.
 *
 * Writing a pattern is a guess-and-check job, and the checking is what people go
 * to a website for. Doing it here means the text being matched — a log, a list of
 * addresses — never leaves the device.
 *
 * Two safety points, both real:
 *
 *  - **A bad pattern is an answer, not a crash.** Construction errors are caught
 *    and shown as written.
 *  - **Catastrophic backtracking cannot be interrupted** once a JS regex is
 *    running; there is no timeout to reach for. The mitigation is a cap on the
 *    subject length and on the number of matches collected, which bounds the
 *    damage a pathological pattern can do to something recoverable.
 */

/** Longest subject this will run a user-written pattern against. */
export const SUBJECT_LIMIT = 20_000;

/** Most matches collected — enough to see the shape, not enough to hang. */
const MATCH_LIMIT = 500;

export const FLAGS: Array<{ id: string; label: string; hint: string }> = [
  { id: "g", label: "g", hint: "All matches, not just the first" },
  { id: "i", label: "i", hint: "Ignore case" },
  { id: "m", label: "m", hint: "^ and $ match line ends" },
  { id: "s", label: "s", hint: ". matches newlines" },
  { id: "u", label: "u", hint: "Unicode escapes" },
];

export interface RegexMatch {
  /** 0-based index in the subject. */
  index: number;
  text: string;
  /** Capture groups, in order; undefined for groups that didn't participate. */
  groups: Array<string | undefined>;
  /** Named groups, when the pattern has any. */
  named?: Record<string, string | undefined>;
}

export type RegexRun =
  | { ok: true; matches: RegexMatch[]; truncated: boolean; capped: boolean }
  | { ok: false; error: string };

/** Run `pattern` over `subject`, reporting a bad pattern rather than throwing. */
export function runRegex(pattern: string, flags: string, subject: string): RegexRun {
  if (!pattern) return { ok: true, matches: [], truncated: false, capped: false };

  const capped = subject.length > SUBJECT_LIMIT;
  const text = capped ? subject.slice(0, SUBJECT_LIMIT) : subject;

  let re: RegExp;
  try {
    // `g` is forced so `matchAll` works; the caller's own `g` choice decides
    // whether more than the first match is *reported*.
    re = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "That pattern is invalid." };
  }

  const matches: RegexMatch[] = [];
  let truncated = false;
  try {
    for (const match of text.matchAll(re)) {
      matches.push({
        index: match.index ?? 0,
        text: match[0],
        groups: match.slice(1),
        named: match.groups ? { ...match.groups } : undefined,
      });
      if (!flags.includes("g")) break;
      if (matches.length >= MATCH_LIMIT) {
        truncated = true;
        break;
      }
      // A zero-length match would otherwise loop forever on the same position.
      if (match[0] === "" && re.lastIndex <= (match.index ?? 0)) break;
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "That pattern failed." };
  }

  return { ok: true, matches, truncated, capped };
}

export type ReplaceResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Preview a replacement. `$1`, `$<name>` and `$&` work as they do in
 * `String.replace`, which is what someone writing a pattern expects.
 */
export function replaceWith(
  pattern: string,
  flags: string,
  subject: string,
  replacement: string,
): ReplaceResult {
  if (!pattern) return { ok: true, text: subject };
  try {
    const re = new RegExp(pattern, flags);
    return { ok: true, text: subject.replace(re, replacement) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "That pattern is invalid." };
  }
}
