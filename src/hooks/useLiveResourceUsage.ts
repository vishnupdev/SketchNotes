"use client";

import { useEffect, useState } from "react";

/**
 * The resources a page consumes whether or not it ever asks permission —
 * memory, storage, processor, battery, network — sampled live.
 *
 * Everything degrades: a browser that won't report the JS heap, the battery or
 * the connection yields `null` for that reading rather than a fabricated one.
 *
 * Sampling is off entirely unless `enabled` — the caller passes false whenever
 * another tab of the app is showing — and the frame loop stops on its own in a
 * backgrounded tab, because that is what the browser does to `requestAnimationFrame`.
 */

export interface HeapReading {
  usedBytes: number;
  limitBytes: number;
}

export interface NetworkReading {
  online: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export interface LiveUsage {
  /** JavaScript heap this tab is holding. Chromium-only. */
  heap: HeapReading | null;
  /** Rounded, deliberately coarse figure the platform reports. */
  deviceMemoryGB: number | null;
  cores: number | null;
  storage: { usage: number; quota: number } | null;
  battery: { level: number; charging: boolean } | null;
  network: NetworkReading;
  /** Bytes pulled over the network since this page loaded. */
  transferred: number;
  fps: number;
  uptimeMs: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}
interface ConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: "change", cb: () => void) => void;
  removeEventListener?: (type: "change", cb: () => void) => void;
}
interface BatteryManager {
  level: number;
  charging: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const heapInfo = (): MemoryInfo | null => {
  if (typeof performance === "undefined") return null;
  return (performance as Performance & { memory?: MemoryInfo }).memory ?? null;
};

const connection = (): ConnectionInfo | null =>
  typeof navigator === "undefined"
    ? null
    : ((navigator as Navigator & { connection?: ConnectionInfo }).connection ?? null);

const readNetwork = (): NetworkReading => {
  const c = connection();
  return {
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    effectiveType: c?.effectiveType ?? null,
    downlink: c?.downlink ?? null,
    rtt: c?.rtt ?? null,
    saveData: c?.saveData ?? false,
  };
};

const readTransferred = (): number => {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return 0;
  return performance
    .getEntriesByType("resource")
    .reduce((sum, e) => sum + ((e as PerformanceResourceTiming).transferSize || 0), 0);
};

const EMPTY_NETWORK: NetworkReading = {
  online: true,
  effectiveType: null,
  downlink: null,
  rtt: null,
  saveData: false,
};

export function useLiveResourceUsage(enabled: boolean): LiveUsage {
  const [heap, setHeap] = useState<HeapReading | null>(null);
  const [fps, setFps] = useState(0);
  const [uptimeMs, setUptimeMs] = useState(0);
  const [storage, setStorage] = useState<LiveUsage["storage"]>(null);
  const [battery, setBattery] = useState<LiveUsage["battery"]>(null);
  const [network, setNetwork] = useState<NetworkReading>(EMPTY_NETWORK);
  const [transferred, setTransferred] = useState(0);
  const [cores] = useState<number | null>(() =>
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : null,
  );
  const [deviceMemoryGB] = useState<number | null>(() => {
    if (typeof navigator === "undefined") return null;
    const m = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return typeof m === "number" ? m : null;
  });

  // Frame rate, heap and uptime — one rAF loop, flushed twice a second so the
  // numbers are readable rather than a blur.
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    let raf = 0;
    let frames = 0;
    let windowStart = start;

    const loop = (t: number) => {
      frames++;
      const elapsed = t - windowStart;
      if (elapsed >= 500) {
        const mem = heapInfo();
        setHeap(mem ? { usedBytes: mem.usedJSHeapSize, limitBytes: mem.jsHeapSizeLimit } : null);
        setFps(Math.round((frames * 1000) / elapsed));
        setUptimeMs(t - start);
        frames = 0;
        windowStart = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  // Storage + bytes transferred, on a slow interval. Neither moves fast enough
  // to be worth a frame loop.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const read = () => {
      setTransferred(readTransferred());
      if (!navigator.storage?.estimate) return;
      void navigator.storage
        .estimate()
        .then((est) => {
          if (alive && est.quota) setStorage({ usage: est.usage ?? 0, quota: est.quota });
        })
        .catch(() => {
          /* storage blocked — leave the last good reading */
        });
    };
    read();
    const iv = window.setInterval(read, 4000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [enabled]);

  // Battery — a snapshot plus live level/charging updates.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let mgr: BatteryManager | null = null;
    const sync = () => {
      if (mgr) setBattery({ level: mgr.level, charging: mgr.charging });
    };
    const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> })
      .getBattery;
    if (getBattery) {
      void getBattery
        .call(navigator)
        .then((b) => {
          if (!alive) return;
          mgr = b;
          sync();
          b.addEventListener("levelchange", sync);
          b.addEventListener("chargingchange", sync);
        })
        .catch(() => {
          /* no battery information on this platform */
        });
    }
    return () => {
      alive = false;
      mgr?.removeEventListener("levelchange", sync);
      mgr?.removeEventListener("chargingchange", sync);
    };
  }, [enabled]);

  // Network — event-driven, so there is nothing to poll.
  useEffect(() => {
    if (!enabled) return;
    const update = () => setNetwork(readNetwork());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const conn = connection();
    conn?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener?.("change", update);
    };
  }, [enabled]);

  return {
    heap,
    deviceMemoryGB,
    cores,
    storage,
    battery,
    network,
    transferred,
    fps,
    uptimeMs,
  };
}
