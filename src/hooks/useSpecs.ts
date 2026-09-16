"use client";

import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { browseProducts, fetchProduct, fetchSimilar, ProductMissingError, searchProducts } from "@/lib/Specs/client";
import { isOfflineError } from "@/lib/net/fetch";
import { queryKeys } from "@/lib/query-keys";
import type { ProductHit, ProductRecord, RelatedProduct } from "@/lib/Specs/types";

/**
 * Spec Analyser's server state.
 *
 * Every query here is cached for the whole session and never refetched on
 * focus, which is unusual in this workspace and deliberate: a shipped product's
 * specifications do not change while you are reading them. The one exception a
 * refetch would catch — an article edited mid-session — is not worth
 * re-fetching every sheet for, and each sheet carries the time it was read.
 *
 * A failed request is retried once, unless the failure was connectivity or the
 * product genuinely has no sheet. Retrying either of those only delays the
 * message the reader needs.
 */

/** Eight hours. Long enough that a session never re-fetches the same sheet. */
const SETTLED = 8 * 60 * 60 * 1000;

const retryUnlessHopeless = (failureCount: number, error: unknown): boolean =>
  failureCount < 1 && !isOfflineError(error) && !(error instanceof ProductMissingError);

/**
 * Results for a *submitted* search term.
 *
 * The term arrives already committed — the panel only changes it when the form
 * is submitted or a suggestion is tapped — so this never fires per keystroke.
 */
export function useProductSearch(term: string) {
  const query = term.trim();
  return useQuery<ProductHit[], Error>({
    queryKey: queryKeys.specsSearch(query.toLowerCase()),
    queryFn: ({ signal }) => searchProducts(query, signal),
    enabled: query.length >= 2,
    staleTime: SETTLED,
    gcTime: SETTLED,
    refetchOnWindowFocus: false,
    retry: retryUnlessHopeless,
  });
}

/** One product's full sheet. */
export function useProduct(title: string | null) {
  return useQuery<ProductRecord, Error>({
    queryKey: queryKeys.specsProduct(title ?? ""),
    queryFn: ({ signal }) => fetchProduct(title as string, signal),
    enabled: !!title,
    staleTime: SETTLED,
    gcTime: SETTLED,
    refetchOnWindowFocus: false,
    retry: retryUnlessHopeless,
  });
}

/**
 * Products worth comparing this one against.
 *
 * Keyed by the product rather than by the query it builds, so opening the same
 * sheet twice in a session costs nothing — and it only runs once the sheet
 * itself has loaded, because the relation rows it sends come from that sheet.
 */
export function useSimilar(product: ProductRecord | undefined) {
  return useQuery<RelatedProduct[], Error>({
    queryKey: queryKeys.specsSimilar(product?.title ?? ""),
    queryFn: ({ signal }) => fetchSimilar(product as ProductRecord, signal),
    enabled: !!product,
    staleTime: SETTLED,
    gcTime: SETTLED,
    refetchOnWindowFocus: false,
    retry: retryUnlessHopeless,
  });
}

/**
 * The sheets a comparison needs, fetched together.
 *
 * `useQueries` rather than a loop of `useProduct`, because the number of
 * columns changes as products are ticked and unticked — and a hook called in a
 * loop whose length varies is the one thing React's rules forbid outright.
 * Each column shares the cache entry `useProduct` uses, so a product you have
 * already opened costs no request when it joins a comparison.
 */
export function useProducts(titles: string[]): UseQueryResult<ProductRecord, Error>[] {
  return useQueries({
    queries: titles.map((title) => ({
      queryKey: queryKeys.specsProduct(title),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchProduct(title, signal),
      staleTime: SETTLED,
      gcTime: SETTLED,
      refetchOnWindowFocus: false,
      retry: retryUnlessHopeless,
    })),
  });
}

/**
 * A browsable list of products — every phone Samsung has shipped, every Toyota.
 *
 * Cached as hard as everything else here: a category gains a member when
 * somebody writes an article, so re-fetching it while the user taps between
 * makers would be pure waste. Switching back to a list already seen is instant.
 */
export function useBrowse(kind: string, source: string) {
  return useQuery<ProductHit[], Error>({
    queryKey: queryKeys.specsBrowse(kind, source),
    queryFn: ({ signal }) => browseProducts(kind, source, signal),
    enabled: !!kind && !!source,
    staleTime: SETTLED,
    gcTime: SETTLED,
    refetchOnWindowFocus: false,
    retry: retryUnlessHopeless,
  });
}
