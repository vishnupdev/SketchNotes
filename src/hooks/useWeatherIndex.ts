"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWeatherIndex } from "@/lib/Satellite/weather";
import { isOfflineError } from "@/lib/net/fetch";
import { readNetworkStatus } from "@/lib/net/status";
import { queryKeys } from "@/lib/query-keys";

/** New frames are published every ten minutes, so ask a little more often. */
const REFRESH_MS = 5 * 60 * 1000;

/**
 * The index of live weather frames, refreshed while the map is showing one.
 *
 * `enabled` is what makes this honest about its cost: with the overlay off,
 * nothing is requested at all, so opening the app to look at imagery makes no
 * third-party request beyond the tiles themselves. With it on, one small JSON
 * document is re-fetched every five minutes — the frames it names are what the
 * animation plays.
 *
 * Polling stops when the tab is hidden and while the connection is metered or
 * weak: a map nobody is looking at has no live to be behind on.
 */
export function useWeatherIndex(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.weatherFrames,
    queryFn: ({ signal }) => fetchWeatherIndex(signal),
    enabled,
    staleTime: REFRESH_MS,
    gcTime: 30 * 60 * 1000,
    refetchInterval: () => (readNetworkStatus().slow ? false : REFRESH_MS),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: () => {
      const net = readNetworkStatus();
      return net.online && !net.slow;
    },
    retry: (failureCount, error) => failureCount < 1 && !isOfflineError(error),
  });
}
