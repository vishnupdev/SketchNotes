/**
 * Shared feed vocabulary. Lives outside any single app's folder because more
 * than one app renders Google News items — the News app's category feeds and
 * World Clock's per-country headlines — and neither should reach into the
 * other's internals to get the shape.
 */

/** A single normalized headline parsed out of a Google News RSS feed. */
export interface FeedArticle {
  /** Stable id (article link) for React keys. */
  id: string;
  title: string;
  /** Canonical article link (opens in a new tab). */
  link: string;
  /** Publisher name, e.g. "The Hindu". */
  source: string;
  /** Publisher homepage from the feed's `<source url>`, used to derive a logo. */
  sourceUrl: string | null;
  /** Short plain-text preview from the feed's description, or null when absent. */
  summary: string | null;
  /** ISO timestamp of publication, or null when the feed omits it. */
  publishedAt: string | null;
}
