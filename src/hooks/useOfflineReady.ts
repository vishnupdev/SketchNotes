"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sGet, sSet } from "@/lib/storage";
import {
  clearOfflineCaches,
  offlineCacheStatus,
  swControlling,
  swSupported,
} from "@/lib/offline/sw-client";
import { warmUpOffline, warmupCompleted } from "@/lib/offline/warmup";

const SAVED_AT_KEY = "oneapp:offline-saved-at";

/*
 * `swSupported()` reads `navigator`, so calling it straight from a render would
 * answer false on the server and true in the browser — and since the panel
 * renders an entirely different element for the unsupported case, React reports
 * that as a hydration mismatch.
 *
 * Routing it through `useSyncExternalStore` keeps the hydrating render on the
 * server's answer and re-renders after. That answer is optimistic (the same
 * assumption `lib/net/status.ts` makes about connectivity), so the real panel is
 * what gets server-rendered and only a browser genuinely lacking service workers
 * swaps to the notice — rather than every visitor briefly seeing it.
 */
const neverChanges = () => () => {};
const supportedOnServer = () => true;

function useSwSupported(): boolean {
  return useSyncExternalStore(neverChanges, swSupported, supportedOnServer);
}

export type OfflineStatus = "unsupported" | "idle" | "saving" | "ready" | "error";

export interface OfflineReadyState {
  /** Service workers exist in this browser. */
  supported: boolean;
  /** A worker is actually serving this page, so caching is live. */
  active: boolean;
  status: OfflineStatus;
  /** 0..1 while saving. */
  progress: number;
  /** What is being saved right now, or the last outcome. */
  label: string;
  /** Files currently held for offline use (null until the worker answers). */
  cachedFiles: number | null;
  /** When the user last ran a full save. */
  savedAt: number | null;
  /** Download every app plus the news feed for offline use. */
  save: () => void;
  /** Forget everything saved for offline use. */
  clear: () => void;
}

/**
 * State for the Settings → Offline section: how much of the workspace is saved
 * for offline use, and the controls to save it all now or clear it.
 *
 * The apps also warm up on their own in the background (see
 * `scheduleOfflineWarmup`); this hook exists so the user can force it — e.g.
 * before a flight, or on a metered connection where the automatic warm-up
 * deliberately holds back.
 */
export function useOfflineReady(): OfflineReadyState {
  const supported = useSwSupported();
  const [active, setActive] = useState(false);
  // A warm-up may already have run in this session (the automatic one), so the
  // panel opens showing "ready" rather than "nothing saved yet". "unsupported" is
  // folded in on the way out instead of seeded here, so it can't be stranded in
  // state when `supported` settles after hydration.
  const [status, setStatus] = useState<OfflineStatus>(() =>
    warmupCompleted() ? "ready" : "idle",
  );
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [cachedFiles, setCachedFiles] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Every state write lands after an await, so asking the worker for a readout
  // never cascades an extra render.
  const refresh = useCallback(async () => {
    if (!swSupported()) return;
    const s = await offlineCacheStatus();
    if (!mounted.current) return;
    setActive(swControlling());
    setCachedFiles(s?.total ?? null);
  }, []);

  // Initial readout: cache size, plus the last full-save timestamp.
  useEffect(() => {
    void refresh();
    void sGet(SAVED_AT_KEY).then((raw) => {
      const ts = raw ? Number(raw) : NaN;
      if (mounted.current && Number.isFinite(ts)) setSavedAt(ts);
    });
  }, [refresh]);

  const save = useCallback(() => {
    setStatus("saving");
    setProgress(0);
    setLabel("Starting…");
    warmUpOffline({
      includeData: true,
      onProgress: ({ done, total, label: what }) => {
        if (!mounted.current) return;
        setProgress(total ? done / total : 0);
        setLabel(what);
      },
    })
      .then(async (result) => {
        if (!mounted.current) return;
        const now = Date.now();
        await sSet(SAVED_AT_KEY, String(now));
        if (!mounted.current) return;
        setSavedAt(now);
        setStatus(result.failed > 0 ? "error" : "ready");
        setLabel(
          result.failed > 0
            ? `${result.failed} of ${result.total} parts couldn't be saved — try again with a steadier connection.`
            : "All apps are saved for offline use.",
        );
        void refresh();
      })
      .catch(() => {
        if (!mounted.current) return;
        setStatus("error");
        setLabel("Saving failed. Check your connection and try again.");
      });
  }, [refresh]);

  const clear = useCallback(() => {
    void clearOfflineCaches().then(async () => {
      await sSet(SAVED_AT_KEY, "");
      if (!mounted.current) return;
      setSavedAt(null);
      setStatus("idle");
      setProgress(0);
      setLabel("Offline files cleared. They rebuild as you use the apps.");
      void refresh();
    });
  }, [refresh]);

  return {
    supported,
    active,
    status: supported ? status : "unsupported",
    progress,
    label,
    cachedFiles,
    savedAt,
    save,
    clear,
  };
}
