"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/Latest/client";
import { categoryById } from "@/lib/Latest/categories";
import { isOfflineError } from "@/lib/net/fetch";
import { queryKeys } from "@/lib/query-keys";
import type { FeedItem } from "@/lib/Latest/types";

/**
 * Latest Tech's server state — the live feed only.
 *
 * The curated catalogue deliberately has no hook: it ships in the bundle, so it
 * is not server state and putting it behind a query would add a loading state
 * to data that is already in memory. That is also what makes the app work
 * offline on a first visit, before any request has succeeded.
 *
 * The feed is cached hard, for the same reason Spec Analyser caches its lookups
 * hard: a category gains a member when somebody writes an article, so
 * re-fetching while a reader taps between years would be pure waste. Switching
 * back to a year already seen is instant.
 */

/** Eight hours. Long enough that a session never re-fetches the same year. */
const SETTLED = 8 * 60 * 60 * 1000;

const retryUnlessOffline = (failureCount: number, error: unknown): boolean =>
  failureCount < 1 && !isOfflineError(error);

/**
 * Newly-listed products for one category and year.
 *
 * Disabled outright for the categories whose source has no enumeration —
 * televisions and monitors. That is not a loading state and not an error: there
 * is nothing to ask for, so nothing is asked, and the panel explains the gap in
 * words instead of spinning.
 */
export function useFeed(category: string, year: number | null) {
  const hasFeed = categoryById(category).feed !== null;

  return useQuery<FeedItem[], Error>({
    queryKey: queryKeys.latestFeed(category, year ?? 0),
    queryFn: ({ signal }) => fetchFeed(category, year, signal),
    enabled: hasFeed,
    staleTime: SETTLED,
    gcTime: SETTLED,
    refetchOnWindowFocus: false,
    retry: retryUnlessOffline,
  });
}
