/** A single normalized headline returned by `/api/news`. */
export interface NewsArticle {
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

/** Shape of a successful `/api/news` response. */
export interface NewsFeedResponse {
  tab: string;
  articles: NewsArticle[];
}
