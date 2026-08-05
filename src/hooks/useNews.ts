"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/News/news-api";
import { isOfflineError } from "@/lib/net/fetch";
import { readNetworkStatus } from "@/lib/net/status";
import { queryKeys } from "@/lib/query-keys";

/**
 * Headlines for a single news tab. Unlike the local-first defaults, news is
 * live data: it goes stale after 5 minutes and refetches on window focus so a
 * returning user sees fresh headlines. One query per tab keeps each cached
 * independently, so switching tabs is instant after the first visit.
 *
 * Network-aware in three ways, so a weak or missing connection costs nothing:
 * focus refetches are skipped while offline or on a metered/slow link (the
 * cached feed is shown instead), and a failed request is only retried when the
 * failure wasn't connectivity — retrying an offline fetch just delays the
 * message the user needs to see.
 */
export function useNews(tabId: string) {
  return useQuery({
    queryKey: queryKeys.news(tabId),
    queryFn: ({ signal }) => fetchNews(tabId, signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: () => {
      const net = readNetworkStatus();
      return net.online && !net.slow;
    },
    retry: (failureCount, error) => failureCount < 1 && !isOfflineError(error),
  });
}
