"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCountryNews } from "@/lib/WorldClock/news-api";
import { isOfflineError } from "@/lib/net/fetch";
import { readNetworkStatus } from "@/lib/net/status";
import { queryKeys } from "@/lib/query-keys";

/**
 * Latest headlines for one country. One query per country code keeps each
 * cached independently, so flipping back to a country you already viewed is
 * instant and costs no request.
 *
 * Network-aware in the same three ways as the News app's feed, so a weak or
 * missing connection costs nothing: the query is skipped entirely with no
 * country selected, focus refetches are held back while offline or on a
 * metered/slow link, and a failed request is only retried when the failure
 * wasn't connectivity — retrying an offline fetch just delays the message the
 * user needs to see.
 */
export function useCountryNews(code: string | null) {
  return useQuery({
    queryKey: queryKeys.countryNews(code ?? ""),
    queryFn: ({ signal }) => fetchCountryNews(code as string, signal),
    enabled: Boolean(code),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: () => {
      const net = readNetworkStatus();
      return net.online && !net.slow;
    },
    retry: (failureCount, error) => failureCount < 1 && !isOfflineError(error),
  });
}
