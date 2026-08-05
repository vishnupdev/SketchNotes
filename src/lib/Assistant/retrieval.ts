import { KNOWLEDGE } from "./knowledge";
import type { KnowledgeEntry } from "./types";

/**
 * Tiny in-memory retrieval engine over the knowledge base — the agent's
 * "understanding" layer. It is deliberately a classic bag-of-words ranker
 * (IDF-weighted field scoring + phrase bonuses) rather than anything neural:
 * it needs no model download, adds no bundle weight beyond this file, runs in
 * well under a millisecond, and works in every browser and offline.
 *
 * The ranked entries are then either quoted directly (local engine) or handed
 * to the browser's on-device model as grounding context.
 */

/** Words too common to carry intent; dropped from queries and the index. */
const STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "but", "by", "can", "could", "did", "do", "does",
  "for", "from", "get", "give", "has", "have", "how", "i", "if", "in", "into", "is", "it", "its",
  "just", "know", "let", "like", "make", "me", "much", "my", "of", "on", "one", "or", "other", "please",
  "same", "should", "show", "so", "some", "tell", "that", "the", "their", "them", "then", "there",
  "these", "they", "this", "to", "up", "use", "used", "using", "want", "was", "way", "we", "what",
  "when", "where", "which", "who", "why", "will", "with", "would", "you", "your",
  // "how does X work?" is the most common phrasing there is; the verb says
  // nothing about X, and every entry that describes *anything* working matches it.
  "work", "works", "working",
]);

/**
 * Query-side expansions: everyday words mapped onto the vocabulary the
 * knowledge base actually uses. Keeps the entries readable while still matching
 * how people phrase questions.
 */
const SYNONYMS: Record<string, string[]> = {
  ad: ["free"],
  ads: ["free"],
  alarm: ["reminder", "alert"],
  bill: ["free", "price"],
  charge: ["free", "price"],
  colour: ["color", "theme"],
  combine: ["merge"],
  cost: ["free", "price"],
  dark: ["theme", "dark mode"],
  delete: ["remove"],
  doc: ["document"],
  drawing: ["sketch", "draw"],
  file: ["document"],
  handwrite: ["handwriting"],
  internet: ["network", "online", "offline"],
  jpeg: ["jpg", "image"],
  keep: ["save", "backup"],
  lang: ["language"],
  light: ["theme"],
  mobile: ["phone"],
  night: ["dark mode", "theme"],
  paint: ["draw", "sketch"],
  photo: ["image"],
  picture: ["image"],
  plan: ["todo", "task"],
  privacy: ["private", "data"],
  remind: ["reminder"],
  scan: ["image", "pdf"],
  shrink: ["compress", "resize"],
  signup: ["account"],
  size: ["compress", "resize"],
  smaller: ["compress"],
  speed: ["network"],
  stopwatch: ["timer"],
  theme: ["theme", "dark mode"],
  wifi: ["network"],
  write: ["text", "note"],
};

/** Split text into comparable terms: unicode-safe, de-pluralised, stop-free. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

/** Crudest useful stemmer: fold regular plurals so "pdfs" matches "pdf". */
function stem(term: string): string {
  if (term.length > 3 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.length > 3 && term.endsWith("es") && !term.endsWith("ses")) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

/** Field weights — a hit in the title says far more than a hit in the prose. */
const W_TITLE = 3;
const W_KEYWORD = 2.6;
const W_BODY = 1;

interface IndexedEntry {
  entry: KnowledgeEntry;
  /** term → best field weight for that term within this entry. */
  weights: Map<string, number>;
  /** Multi-word keyword phrases, for exact-phrase bonuses. */
  phrases: string[];
}

/**
 * How hard long entries are pushed down (BM25's length normalisation, in spirit).
 * Without it the sprawling cross-cutting entries — which name every app while
 * explaining offline use or privacy — outscore the app's own entry on questions
 * like "how do reminders work?", purely by mentioning more words.
 */
const LENGTH_PENALTY = 0.55;

function record(weights: Map<string, number>, terms: string[], weight: number) {
  for (const t of terms) {
    const current = weights.get(t) ?? 0;
    if (weight > current) weights.set(t, weight);
  }
}

/** Built once per session (module scope) — the corpus is static. */
const INDEX: IndexedEntry[] = KNOWLEDGE.map((entry) => {
  const weights = new Map<string, number>();
  record(weights, tokenize(entry.title), W_TITLE);
  for (const kw of entry.keywords) record(weights, tokenize(kw), W_KEYWORD);
  record(weights, tokenize(entry.answer), W_BODY);
  const phrases = [
    entry.title.toLowerCase(),
    ...entry.keywords.filter((k) => k.includes(" ")).map((k) => k.toLowerCase()),
  ];
  return { entry, weights, phrases };
});

/** Inverse document frequency per term across the corpus. */
const IDF = (() => {
  const df = new Map<string, number>();
  for (const { weights } of INDEX) {
    for (const term of weights.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = INDEX.length;
  const idf = new Map<string, number>();
  for (const [term, count] of df) idf.set(term, Math.log(1 + n / count));
  return idf;
})();

/** Unknown terms still deserve some weight — they're maximally specific. */
const DEFAULT_IDF = Math.log(1 + INDEX.length);

/** Mean distinct-term count across entries, the baseline for length normalisation. */
const AVG_LENGTH =
  INDEX.reduce((sum, e) => sum + e.weights.size, 0) / Math.max(1, INDEX.length);

export interface Match {
  entry: KnowledgeEntry;
  /** Raw ranking score; only meaningful relative to other matches. */
  score: number;
  /** 0..1 share of the question this entry accounts for. */
  confidence: number;
}

/** Expand a query into terms plus their synonym terms. */
function queryTerms(question: string): string[] {
  const base = tokenize(question);
  const out = new Set(base);
  for (const term of base) {
    for (const syn of SYNONYMS[term] ?? []) for (const t of tokenize(syn)) out.add(t);
  }
  return [...out];
}

/**
 * Rank knowledge entries against a question, best first. `confidence` is
 * normalised so callers can apply a fixed "did I actually understand this?"
 * threshold regardless of question length.
 */
export function search(question: string, limit = 3): Match[] {
  const terms = queryTerms(question);
  if (!terms.length) return [];

  const normalized = question.toLowerCase();
  const idfOf = (t: string) => IDF.get(t) ?? DEFAULT_IDF;
  // Best case: every query term hits a title. Used to normalise confidence.
  const ceiling = terms.reduce((sum, t) => sum + idfOf(t) * W_TITLE, 0) || 1;

  const matches: Match[] = [];
  for (const { entry, weights, phrases } of INDEX) {
    let raw = 0;
    let hits = 0;
    for (const term of terms) {
      const w = weights.get(term);
      if (w) {
        raw += idfOf(term) * w;
        hits++;
      }
    }
    if (!hits) continue;

    // A question that literally contains an entry's phrase is a strong signal.
    for (const phrase of phrases) if (phrase.length > 5 && normalized.includes(phrase)) raw += 4;

    // Reward answering more of the question, not just one rare word, then
    // discount entries that are simply long enough to mention everything.
    const coverage = hits / terms.length;
    const length = 1 - LENGTH_PENALTY + LENGTH_PENALTY * (weights.size / AVG_LENGTH);
    const score = (raw * (0.55 + 0.45 * coverage)) / length;
    matches.push({ entry, score, confidence: Math.min(1, score / ceiling) });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Below this the agent admits it didn't understand rather than guessing. */
export const CONFIDENCE_FLOOR = 0.16;
