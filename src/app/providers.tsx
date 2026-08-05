"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerServiceWorker, unregisterServiceWorker } from "@/lib/offline/sw-client";
import { scheduleOfflineWarmup } from "@/lib/offline/warmup";

/** Marks the tab as already reloaded, so the dev cleanup can never loop. */
const DEV_SW_RELOADED = "oneapp:dev-sw-cleared";

/**
 * Register the offline service worker (`/sw.js`) and, once it is in charge,
 * warm every code-split app into its cache so the whole workspace boots and
 * runs with no network.
 *
 * Production only. In development the opposite happens: any worker left behind
 * by a production build is torn down, because it would keep serving that build's
 * cached shell and `/_next/static` chunks to the dev server's freshly compiled
 * pages — a stale/fresh mix that React reports as a hydration mismatch.
 */
function useOfflineSupport() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void unregisterServiceWorker().then((removed) => {
        // Unregistering leaves the current page under the old worker's control,
        // so only a reload gets it onto live dev output. Once per tab: after the
        // reload there is no registration left, so `removed` is false anyway.
        if (!removed || !navigator.serviceWorker.controller) return;
        if (sessionStorage.getItem(DEV_SW_RELOADED)) return;
        sessionStorage.setItem(DEV_SW_RELOADED, "1");
        window.location.reload();
      });
      return;
    }

    let stopWarmup: (() => void) | undefined;
    const start = () => {
      void registerServiceWorker();
      // Deferred and idle-scheduled inside, so first paint is never delayed.
      stopWarmup = scheduleOfflineWarmup();
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      window.removeEventListener("load", start);
      stopWarmup?.();
    };
  }, []);
}

/**
 * Client providers. The QueryClient is created once per browser session with
 * defaults suited to a local-first app (no window refetches, retries off).
 *
 * `networkMode: "offlineFirst"` is what makes queries work with no connection:
 * the default "online" mode would pause them the moment the browser reports
 * offline, so the service worker never gets asked and its cached responses
 * (news headlines, past translations) would go unused.
 */
export function Providers({ children }: { children: ReactNode }) {
  useOfflineSupport();

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            gcTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
            networkMode: "offlineFirst",
          },
          mutations: { networkMode: "offlineFirst" },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
