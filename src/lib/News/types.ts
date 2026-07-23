/** A single normalized headline returned by `/api/news`. */
export interface NewsArticle {
  /** Stable id (article link) for React keys. */
  id: string;
  title: string;
  /** Canonical article link (opens in a new tab). */
  link: string;
  /** Publisher name, e.g. "The Hindu". */
  source: string;
  /** ISO timestamp of publication, or null when the feed omits it. */
  publishedAt: string | null;
}

/** Shape of a successful `/api/news` response. */
export interface NewsFeedResponse {
  tab: string;
  articles: NewsArticle[];
}
