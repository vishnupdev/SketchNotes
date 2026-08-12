"use client";

/**
 * Offline warm-up: pull every app's code into the service-worker cache so the
 * whole workspace opens with no network — not just the app that happened to be
 * visited while online.
 *
 * Why this is needed: each app is code-split, so its chunk is only downloaded
 * the first time it's opened. Caching on demand would mean an "offline-ready"
 * app that still shows a blank screen for every tool the user hadn't tried yet.
 * Importing each app through {@link APP_LOADERS} downloads exactly the chunks
 * the workspace will later request, and the worker's cache-first rule for
 * `/_next/static` stores them on the way past.
 *
 * It runs two ways:
 *  - automatically, once per session, deferred to idle time and skipped on a
 *    metered or 2g-class link (never spend a user's data behind their back);
 *  - on demand from Settings → Offline, which also warms the news feed.
 */

import { readNetworkStatus } from "@/lib/net/status";
import { APP_LABELS, APP_LOADERS, WARMUP_ORDER, type LazyAppId } from "./app-modules";
import { precacheBuild, precacheUrls, swControlling, swSupported } from "./sw-client";

/** Progress for the Settings readout: 0..total steps, plus what's loading now. */
export interface WarmupStep {
  done: number;
  total: number;
  label: string;
}

export type WarmupProgress = (step: WarmupStep) => void;

export interface WarmupResult {
  loaded: number;
  failed: number;
  total: number;
}

export interface WarmupOptions {
  onProgress?: WarmupProgress;
  /**
   * Also cache network data that makes an offline session useful — currently
   * the default news feed. Only for the explicit, user-triggered warm-up.
   */
  includeData?: boolean;
}

/** Static files not referenced by the initial shell, so never auto-cached. */
const EXTRA_ASSETS = ["/pdf.worker.min.mjs", "/icon.svg", "/manifest.webmanifest", "/llms.txt"];

/** Feed cached so News has something to show offline. */
const DATA_URLS = ["/api/news?tab=tech"];

/** Wait for the browser to be idle (or a short beat, where unsupported). */
function nextIdle(timeout = 1500): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout });
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

let inflight: Promise<WarmupResult> | null = null;
let lastResult: WarmupResult | null = null;

/** Whether a warm-up has already completed in this page session. */
export const warmupCompleted = (): boolean => lastResult !== null;

/**
 * Download and cache every lazy app. Concurrent callers share one run; module
 * evaluation is spread across idle callbacks so warming never blocks input.
 */
export function warmUpOffline(options: WarmupOptions = {}): Promise<WarmupResult> {
  const { onProgress, includeData = false } = options;
  if (inflight) return inflight;

  const apps: LazyAppId[] = WARMUP_ORDER;
  const total = apps.length + 1; // + one step for the extra static assets

  inflight = (async () => {
    let loaded = 0;
    let failed = 0;

    for (const [index, id] of apps.entries()) {
      onProgress?.({ done: index, total, label: APP_LABELS[id] });
      await nextIdle();
      try {
        await APP_LOADERS[id]();
        loaded += 1;
      } catch {
        failed += 1; // offline mid-warm-up, or a chunk 404 after a deploy
      }
    }

    onProgress?.({ done: apps.length, total, label: "Assets" });
    await precacheUrls(includeData ? [...EXTRA_ASSETS, ...DATA_URLS] : EXTRA_ASSETS);
    /*
     * Belt and braces for the explicit save: importing each app above caches the
     * chunks this build actually loads, and this catches whatever the manifest
     * lists but the imports didn't pull in. It also forces the download on a
     * metered link, where the worker's own background precaching holds back.
     */
    if (includeData) await precacheBuild();
    loaded += 1;

    onProgress?.({ done: total, total, label: "Ready" });
    const result: WarmupResult = { loaded, failed, total };
    lastResult = result;
    return result;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Run `cb` as soon as a worker controls this page (so fetches are cached). */
function whenControlling(cb: () => void): () => void {
  if (!swSupported()) return () => {};
  if (swControlling()) {
    cb();
    return () => {};
  }
  const onChange = () => {
    if (swControlling()) {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      cb();
    }
  };
  navigator.serviceWorker.addEventListener("controllerchange", onChange);
  return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
}

/** Hold off this long after load before warming, so first paint stays clean. */
const AUTO_DELAY_MS = 4000;

/**
 * Schedule the automatic warm-up. Returns a cleanup function.
 *
 * Deliberately conservative: nothing happens unless a worker is in charge and
 * the connection is both present and not metered/slow. On a weak link the apps
 * still cache the normal way (as they're opened), and the user can force a full
 * download from Settings → Offline.
 */
export function scheduleOfflineWarmup(): () => void {
  if (typeof window === "undefined" || !swSupported()) return () => {};

  let timer = 0;
  let cancelled = false;

  const stopWaiting = whenControlling(() => {
    if (cancelled) return;
    timer = window.setTimeout(() => {
      const net = readNetworkStatus();
      if (cancelled || warmupCompleted() || !net.online || net.slow) return;
      void warmUpOffline();
    }, AUTO_DELAY_MS);
  });

  return () => {
    cancelled = true;
    stopWaiting();
    if (timer) window.clearTimeout(timer);
  };
}
