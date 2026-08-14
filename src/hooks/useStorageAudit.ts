"use client";

import { useQuery } from "@tanstack/react-query";
import { auditStorage } from "@/lib/Resources/storage-audit";
import { queryKeys } from "@/lib/query-keys";

/**
 * The device-storage audit, cached through TanStack Query so switching tabs
 * doesn't re-walk every cache and key.
 *
 * It is a snapshot of something that changes only when another app writes, so
 * it is refetched on an explicit "Re-scan" rather than on a timer — the walk
 * touches every localStorage key and every Cache Storage entry, which is not
 * work to repeat behind the user's back.
 */
export function useStorageAudit() {
  return useQuery({
    queryKey: queryKeys.storageAudit,
    queryFn: auditStorage,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
