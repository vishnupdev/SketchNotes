"use client";

import { useQuery } from "@tanstack/react-query";
import { searchPlaces } from "@/lib/Satellite/geocode";
import { isOfflineError } from "@/lib/net/fetch";
import { queryKeys } from "@/lib/query-keys";

/**
 * Results for a *submitted* search term.
 *
 * The term is passed in already committed — the caller only changes it when the
 * form is submitted or a suggestion is tapped — so this never fires per
 * keystroke. That is a requirement rather than a nicety: the geocoder behind it
 * is OpenStreetMap's, run on donations, and its usage policy asks for about one
 * request a second (see `lib/Satellite/geocode.ts`).
 *
 * Results are cached for the session, so going back to a search you already ran
 * is instant and costs that service nothing.
 */
export function usePlaceSearch(term: string) {
  const query = term.trim();
  return useQuery({
    queryKey: queryKeys.placeSearch(query.toLowerCase()),
    queryFn: ({ signal }) => searchPlaces(query, signal),
    enabled: query.length >= 2,
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => failureCount < 1 && !isOfflineError(error),
  });
}
