/**
 * The browser's side of the live feed: this app's own API route, and nothing
 * else.
 *
 * Every request goes to this origin, which is what lets the service worker
 * replay a feed you have already loaded while offline, and is why the upstream
 * never sees a visitor's address.
 *
 * The curated half needs nothing here — it is in the bundle (`catalog.ts`) and
 * is available offline on first load, before any request has been made.
 */

import { fetchJson } from "@/lib/net/fetch";
import type { FeedItem } from "./types";

/** Newly-listed products for one category, optionally for one year. */
export async function fetchFeed(
  category: string,
  year: number | null,
  signal?: AbortSignal,
): Promise<FeedItem[]> {
  const params = new URLSearchParams({ category });
  if (year) params.set("year", String(year));

  const body = await fetchJson<{ items: FeedItem[] }>(`/api/latest/feed?${params}`, {
    signal,
    label: "New listings",
  });

  // Defended rather than trusted: these responses are cached hard, in the
  // browser and in the service worker, and they outlive a deploy. A payload
  // written by an older version of this route is a normal thing to receive, and
  // a missing array here would crash the panel rather than render it empty.
  return Array.isArray(body.items) ? body.items : [];
}
