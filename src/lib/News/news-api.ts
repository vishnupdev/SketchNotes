import type { NewsArticle, NewsFeedResponse } from "./types";

/** Fetch a tab's headlines from our own `/api/news` route. */
export async function fetchNews(tabId: string): Promise<NewsArticle[]> {
  const res = await fetch(`/api/news?tab=${encodeURIComponent(tabId)}`);
  if (!res.ok) {
    throw new Error(`News request failed (${res.status})`);
  }
  const data = (await res.json()) as NewsFeedResponse;
  return data.articles ?? [];
}
