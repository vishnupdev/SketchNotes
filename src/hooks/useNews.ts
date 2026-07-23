"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/News/news-api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Headlines for a single news tab. Unlike the local-first defaults, news is
 * live data: it goes stale after 5 minutes and refetches on window focus so a
 * returning user sees fresh headlines. One query per tab keeps each cached
 * independently, so switching tabs is instant after the first visit.
 */
export function useNews(tabId: string) {
  return useQuery({
    queryKey: queryKeys.news(tabId),
    queryFn: () => fetchNews(tabId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
