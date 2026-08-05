"use client";

import { useSyncExternalStore } from "react";
import {
  readNetworkStatus,
  serverNetworkStatus,
  subscribeNetworkStatus,
  type NetworkStatus,
} from "@/lib/net/status";

/**
 * Live network conditions for UI that must adapt to a weak or missing
 * connection: `online` to switch a feature into its offline state, `slow` to
 * hold back optional requests (auto-refresh, remote logos, previews).
 *
 * Shared by every app in the workspace — one listener set, one snapshot.
 */
export function useNetworkStatus(): NetworkStatus {
  return useSyncExternalStore(subscribeNetworkStatus, readNetworkStatus, serverNetworkStatus);
}

/** Just the boolean, for the many call sites that only gate on connectivity. */
export function useIsOnline(): boolean {
  return useNetworkStatus().online;
}
