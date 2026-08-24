/**
 * Ranking for the command palette.
 *
 * Nineteen apps, ten PDF sections and a dozen themes is past the point where
 * scanning a grid beats typing, so the palette needs to put the right row first
 * from two or three characters. The rules, strongest first:
 *
 *  1. the whole query is the title                     — "timer" → Timer
 *  2. the title starts with the query                  — "tim" → Timer
 *  3. a *word* in the title starts with the query      — "clock" → World Clock
 *  4. the title contains the query anywhere            — "lock" → World Clock
 *  5. a keyword matches by any of the rules above      — "alarm" → Reminders
 *  6. the query's letters appear in order in the title — "wclk" → World Clock
 *
 * Initials are folded into rule 3 by matching against the title's first letters
 * ("wc" → World Clock), which is how people actually abbreviate.
 *
 * Deliberately not a fuzzy library: the corpus is a hundred short strings, the
 * whole thing runs on every keystroke, and a hand-written ladder is testable and
 * explainable — a surprising first row in a palette is worse than no palette.
 */

/** Fold case and accents so "é" matches "e" and spacing is uniform. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (text: string): string[] => text.split(/[\s\-_/&(),.]+/).filter(Boolean);

/** First letter of each word — "World Clock" → "wc". */
const initials = (text: string): string => words(text).map((w) => w[0]).join("");

/** Are `query`'s characters present, in order, in `text`? */
function subsequence(query: string, text: string): boolean {
  let i = 0;
  for (const ch of text) {
    if (ch === query[i]) i++;
    if (i === query.length) return true;
  }
  return query.length === 0;
}

/** Score one string against a normalized query. 0 means "no match". */
function scoreText(query: string, text: string): number {
  const target = normalize(text);
  if (!target) return 0;
  if (target === query) return 1000;
  if (target.startsWith(query)) return 900 - Math.min(80, target.length - query.length);
  if (words(target).some((w) => w.startsWith(query))) return 700;
  if (initials(target).startsWith(query)) return 650;
  const at = target.indexOf(query);
  if (at > -1) return 500 - Math.min(80, at);
  if (query.length >= 3 && subsequence(query, target)) return 260;
  return 0;
}

/**
 * Score a palette row. Keywords score below the title so a synonym can never
 * outrank the thing actually named — "notes" must land on Sketchnotes, not on
 * an app that merely lists "notes" among its terms.
 */
export function scoreCommand(rawQuery: string, title: string, keywords: string[] = []): number {
  const query = normalize(rawQuery);
  if (!query) return 1; // empty query: everything matches equally, order stands
  const best = scoreText(query, title);
  if (best >= 700) return best;
  const keyword = keywords.reduce((max, k) => Math.max(max, scoreText(query, k)), 0);
  // A keyword hit is worth a fraction of the same hit on the title.
  return Math.max(best, Math.round(keyword * 0.6));
}
