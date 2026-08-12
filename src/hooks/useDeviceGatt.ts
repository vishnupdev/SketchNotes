"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canInspectGatt, readGatt, type GattReport } from "@/lib/nearby/gatt";

export interface UseDeviceGatt {
  /** Whether a GATT walk is possible for this device at all. */
  supported: boolean;
  report: GattReport | null;
  reading: boolean;
  error: string | null;
  /** Connect, read services and characteristics, then disconnect. */
  read: () => Promise<void>;
}

/**
 * Reads one Bluetooth device's GATT table on demand.
 *
 * Deliberately not automatic: connecting is a radio operation that can wake a
 * sleeping peripheral, take several seconds, and block whatever else wants to
 * pair with it. So it runs only when the user asks, and the result is cached
 * until they pick a different device.
 *
 * Passing `null` (or a non-Bluetooth device's key) parks the hook.
 */
export function useDeviceGatt(deviceKey: string | null): UseDeviceGatt {
  const [report, setReport] = useState<GattReport | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // A different device means a different table — drop the previous result
  // rather than showing one device's services under another's name.
  useEffect(() => {
    setReport(null);
    setError(null);
    setReading(false);
  }, [deviceKey]);

  const read = useCallback(async () => {
    if (!deviceKey) return;
    setError(null);
    setReading(true);
    try {
      const next = await readGatt(deviceKey);
      if (alive.current) setReport(next);
    } catch (err) {
      if (alive.current) {
        setError(err instanceof Error && err.message ? err.message : "Couldn't read this device.");
      }
    } finally {
      if (alive.current) setReading(false);
    }
  }, [deviceKey]);

  return {
    supported: !!deviceKey && canInspectGatt(deviceKey),
    report,
    reading,
    error,
    read,
  };
}
