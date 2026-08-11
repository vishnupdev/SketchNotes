import { fetchJson } from "@/lib/net/fetch";
import type { FeedArticle } from "@/lib/rss/types";

/** Give up on a stalled feed request rather than spinning indefinitely. */
const NEWS_TIMEOUT_MS = 10_000;

/** Shape of a successful `/api/worldclock/news` response. */
export interface CountryNewsResponse {
  country: string;
  articles: FeedArticle[];
}

/**
 * Fetch a country's latest headlines from our own `/api/worldclock/news` route.
 *
 * The request is made even when the browser reports offline: the service worker
 * answers it from the last successful response, so a country opened earlier
 * still shows its headlines with no connection. Only when that misses too does
 * this reject with a {@link NetError} whose message is ready to show.
 */
export async function fetchCountryNews(
  code: string,
  signal?: AbortSignal,
): Promise<FeedArticle[]> {
  const data = await fetchJson<CountryNewsResponse>(
    `/api/worldclock/news?country=${encodeURIComponent(code)}`,
    { label: "Country news", timeoutMs: NEWS_TIMEOUT_MS, signal },
  );
  return data.articles ?? [];
}
