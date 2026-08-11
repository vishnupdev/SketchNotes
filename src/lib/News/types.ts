import type { FeedArticle } from "@/lib/rss/types";

/**
 * A single normalized headline returned by `/api/news`. The shape itself is the
 * shared feed article (see `@/lib/rss/types`) — aliased here so the News app
 * keeps its own vocabulary at every call site.
 */
export type NewsArticle = FeedArticle;

/** Shape of a successful `/api/news` response. */
export interface NewsFeedResponse {
  tab: string;
  articles: NewsArticle[];
}
