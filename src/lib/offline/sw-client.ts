"use client";

/**
 * Page-side half of the offline setup: registers `/sw.js` and talks to it over
 * a `MessageChannel` (see the message handler at the bottom of `public/sw.js`).
 *
 * Every call degrades to a null/false result rather than throwing, so callers
 * never need to care whether service workers exist in this browser, whether the
 * page is controlled yet, or whether the worker replied in time.
 */

/** Cache-entry counts by cache, as reported by the worker. */
export interface OfflineCacheStatus {
  version: string;
  counts: Record<string, number>;
  total: number;
}

const REPLY_TIMEOUT_MS = 4000;

/** Downloading the whole build is a multi-megabyte job, so it gets far longer. */
const BUILD_PRECACHE_TIMEOUT_MS = 120_000;

export const swSupported = (): boolean =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

/** True once a worker is actually serving this page (caching is live). */
export const swControlling = (): boolean =>
  swSupported() && Boolean(navigator.serviceWorker.controller);

/**
 * Register the worker. Safe to call repeatedly — the browser dedupes by scope.
 * Also nudges an already-installed newer worker to take over immediately, so a
 * deploy's fresh chunks replace stale cached ones on the next visit.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    reg.addEventListener("updatefound", () => {
      reg.installing?.addEventListener("statechange", (e) => {
        const sw = e.target as ServiceWorker;
        if (sw.state === "installed") sw.postMessage({ type: "SKIP_WAITING" });
      });
    });
    return reg;
  } catch {
    return null;
  }
}

/**
 * Remove every worker on this origin and drop the caches it owns.
 *
 * Development escape hatch. A worker installed by an earlier production build
 * keeps controlling `localhost` across dev restarts, and its cache-first rules
 * then answer with the previous build's shell and chunks while the dev server
 * compiles the current source — which surfaces as a hydration mismatch. Returns
 * whether anything was actually removed; unregistering does not evict the worker
 * from the page already running, so a reload is needed to finish the job.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!swSupported()) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("oneapp-")).map((k) => caches.delete(k)));
    }
    return regs.length > 0;
  } catch {
    return false;
  }
}

/** Send one request to the worker and await its reply (null on any failure). */
async function ask<T>(
  message: Record<string, unknown>,
  timeoutMs = REPLY_TIMEOUT_MS,
): Promise<T | null> {
  if (!swSupported()) return null;
  const worker =
    navigator.serviceWorker.controller ?? (await navigator.serviceWorker.ready).active ?? null;
  if (!worker) return null;

  return new Promise<T | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve((event.data as T) ?? null);
    };
    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** How much is currently saved for offline use. */
export const offlineCacheStatus = (): Promise<OfflineCacheStatus | null> =>
  ask<OfflineCacheStatus>({ type: "CACHE_STATUS" });

/** Ask the worker to download and store extra URLs (static assets). */
export const precacheUrls = (urls: string[]): Promise<{ saved: number } | null> =>
  urls.length === 0 ? Promise.resolve({ saved: 0 }) : ask({ type: "PRECACHE", urls });

/** Outcome of a whole-build precache; `skipped` says why nothing was stored. */
export interface BuildPrecacheResult {
  saved?: number;
  total?: number;
  revision?: string | null;
  skipped?: string;
}

/**
 * Store every asset in the build manifest — the code-split chunk for each app
 * included — regardless of connection type.
 *
 * The worker already does this by itself on a normal connection; this is the
 * explicit "save it all now" path, which is also the only one that runs on a
 * metered link. Takes noticeably longer than the other messages (it downloads
 * the whole build), so it deliberately doesn't wait for a reply through `ask`.
 */
export function precacheBuild(): Promise<BuildPrecacheResult | null> {
  return ask<BuildPrecacheResult>({ type: "PRECACHE_BUILD" }, BUILD_PRECACHE_TIMEOUT_MS);
}

/** Drop every offline cache the workspace owns. */
export const clearOfflineCaches = (): Promise<{ cleared: boolean } | null> =>
  ask({ type: "CLEAR_CACHES" });
