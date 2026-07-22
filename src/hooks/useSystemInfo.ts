"use client";

import { useQuery } from "@tanstack/react-query";
import { collectSystemInfo } from "@/lib/SystemInfo/collect";
import { queryKeys } from "@/lib/query-keys";

/**
 * Runs the system analysis once and caches the report. The scan reads live
 * browser/hardware APIs, so it only executes client-side; `refetch()` re-runs
 * it for the "Re-scan" action. Kept fresh forever until manually invalidated.
 */
export function useSystemInfo() {
  return useQuery({
    queryKey: queryKeys.systemInfo,
    queryFn: collectSystemInfo,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
