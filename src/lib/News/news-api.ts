import { fetchJson } from "@/lib/net/fetch";
import type { NewsArticle, NewsFeedResponse } from "./types";

/** Give up on a stalled feed request rather than spinning indefinitely. */
const NEWS_TIMEOUT_MS = 10_000;

/**
 * Fetch a tab's headlines from our own `/api/news` route.
 *
 * The request is made even when the browser reports offline: the service worker
 * answers it from the last successful response, so a saved feed still opens
 * with no connection. Only when that misses too does this reject with a
 * {@link NetError} whose message is ready to show.
 */
export async function fetchNews(tabId: string, signal?: AbortSignal): Promise<NewsArticle[]> {
  const data = await fetchJson<NewsFeedResponse>(`/api/news?tab=${encodeURIComponent(tabId)}`, {
    label: "News",
    timeoutMs: NEWS_TIMEOUT_MS,
    signal,
  });
  return data.articles ?? [];
}
