"use client";

import { useEffect, useState } from "react";
import {
  getBattery,
  getConnection,
  getMemoryInfo,
  getStorageEstimate,
  type NetworkInformation,
} from "@/lib/SystemInfo/nav";

export interface PerfStats {
  fps: number;
  frameMs: number;
  heapUsed: number | null;
  heapLimit: number | null;
  uptimeMs: number;
}

export interface BatteryStats {
  level: number;
  charging: boolean;
}

export interface NetStats {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface LiveSystemStats {
  perf: PerfStats;
  heapSupported: boolean;
  battery: BatteryStats | null;
  batterySupported: boolean;
  storage: { usage: number; quota: number } | null;
  net: NetStats;
}

const readNet = (): NetStats => {
  const c: NetworkInformation | null = getConnection();
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    effectiveType: c?.effectiveType,
    downlink: c?.downlink,
    rtt: c?.rtt,
    saveData: c?.saveData,
  };
};

/**
 * Continuously-sampled device metrics for the live dashboard: frame rate + JS
 * heap (rAF loop), plus event-driven battery, storage and network state. All
 * probes degrade gracefully when an API is missing.
 */
export function useLiveSystemStats(): LiveSystemStats {
  const [perf, setPerf] = useState<PerfStats>({
    fps: 0,
    frameMs: 0,
    heapUsed: null,
    heapLimit: null,
    uptimeMs: 0,
  });
  const [heapSupported] = useState(() => getMemoryInfo() != null);
  const [battery, setBattery] = useState<BatteryStats | null>(null);
  const [batterySupported, setBatterySupported] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [net, setNet] = useState<NetStats>(() =>
    typeof navigator === "undefined"
      ? { online: true }
      : readNet(),
  );

  // FPS + JS heap + uptime via requestAnimationFrame, flushed twice a second.
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let frames = 0;
    let windowStart = start;

    const loop = (t: number) => {
      frames++;
      const elapsed = t - windowStart;
      if (elapsed >= 500) {
        const mem = getMemoryInfo();
        setPerf({
          fps: Math.round((frames * 1000) / elapsed),
          frameMs: Math.round((elapsed / frames) * 10) / 10,
          heapUsed: mem ? mem.usedJSHeapSize : null,
          heapLimit: mem ? mem.jsHeapSizeLimit : null,
          uptimeMs: t - start,
        });
        frames = 0;
        windowStart = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Battery — snapshot + live level/charging updates.
  useEffect(() => {
    let cancelled = false;
    let mgr: Awaited<ReturnType<typeof getBattery>> = null;
    const sync = () => {
      if (mgr) setBattery({ level: mgr.level, charging: mgr.charging });
    };
    getBattery().then((b) => {
      if (cancelled) return;
      setBatterySupported(b != null);
      if (!b) return;
      mgr = b;
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    });
    return () => {
      cancelled = true;
      if (mgr) {
        mgr.removeEventListener("levelchange", sync);
        mgr.removeEventListener("chargingchange", sync);
      }
    };
  }, []);

  // Storage estimate — on mount and refreshed periodically.
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      getStorageEstimate().then((est) => {
        if (!cancelled && est && est.quota) {
          setStorage({ usage: est.usage ?? 0, quota: est.quota });
        }
      });
    read();
    const iv = window.setInterval(read, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);

  // Network — online/offline + connection change events.
  useEffect(() => {
    const update = () => setNet(readNet());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const conn = getConnection();
    conn?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener?.("change", update);
    };
  }, []);

  return { perf, heapSupported, battery, batterySupported, storage, net };
}
