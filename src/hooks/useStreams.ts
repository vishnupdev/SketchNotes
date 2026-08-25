"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStreams } from "@/lib/Streams/streams-api";
import { isOfflineError } from "@/lib/net/fetch";
import { readNetworkStatus } from "@/lib/net/status";
import { queryKeys } from "@/lib/query-keys";
import type { StreamKind } from "@/lib/Streams/types";

/**
 * The videos behind one station or search. Live data, so it goes stale quickly
 * and each query is cached under its own key - switching back to a station you
 * already opened is instant, and a station you have not opened is one request.
 *
 * Live listings expire faster than music ones for the same reason the route
 * caches them for less: a stream that has ended is a card that plays nothing.
 *
 * `enabled` is what keeps the Search tab from firing a request per keystroke -
 * the query is only run once there is something to search for.
 */
export function useStreams(query: string, kind: StreamKind) {
  const live = kind === "live";
  return useQuery({
    queryKey: queryKeys.streams(kind, query),
    queryFn: ({ signal }) => fetchStreams(query, kind, signal),
    enabled: query.trim().length > 0,
    staleTime: live ? 2 * 60 * 1000 : 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Coming back to the tab should refresh a live listing, but not at the cost
    // of a metered or 2g-class connection, where the cached list is the kinder
    // answer.
    refetchOnWindowFocus: () => {
      const net = readNetworkStatus();
      return live && net.online && !net.slow;
    },
    retry: (failureCount, error) => failureCount < 1 && !isOfflineError(error),
  });
}
