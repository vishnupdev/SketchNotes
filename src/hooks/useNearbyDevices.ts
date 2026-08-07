"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBluetoothAvailability,
  getNearbySupport,
  pairDevice,
  revealDeviceNames,
  scanNearbyDevices,
  startLeScan,
  watchCastAvailability,
  watchDeviceChanges,
  type NearbyDevice,
  type NearbySupport,
  type PairableTransport,
  type Transport,
} from "@/lib/SystemInfo/nearby";

/** Grouping order for the list — wireless first, then wired, then built-in. */
const TRANSPORT_ORDER: Transport[] = [
  "bluetooth",
  "usb",
  "hid",
  "serial",
  "gamepad",
  "mic",
  "speaker",
  "camera",
];

export interface UseNearbyDevices {
  support: NearbySupport;
  /** Bluetooth radio present and on; null when the browser won't say. */
  adapter: boolean | null;
  /** Cast-capable displays seen on the local network; null when unknown. */
  castAvailable: boolean | null;
  devices: NearbyDevice[];
  /** Media devices exist but their names need a permission to read. */
  namesHidden: boolean;
  scanning: boolean;
  /** Transports whose chooser is currently open. */
  pending: PairableTransport[];
  /** Live BLE advertisement scanning is running. */
  leScanning: boolean;
  error: string | null;
  rescan: () => void;
  pair: (transport: PairableTransport) => Promise<void>;
  toggleLeScan: () => Promise<void>;
  revealNames: () => Promise<void>;
}

/**
 * Drives the Nearby Devices panel: keeps the permission-free device sweep in
 * sync with the platform's connect/disconnect events, and exposes the
 * gesture-gated actions (open a chooser, run a live BLE scan, reveal media
 * device names).
 *
 * Two sets are tracked separately. `enumerated` is authoritative and replaced on
 * every sweep, so unplugging something removes it. `found` holds devices only a
 * chooser or a live scan can see; they're kept until the next manual rescan so a
 * just-paired serial port doesn't vanish from the list.
 */
export function useNearbyDevices(): UseNearbyDevices {
  const [support] = useState<NearbySupport>(getNearbySupport);
  const [adapter, setAdapter] = useState<boolean | null>(null);
  const [castAvailable, setCastAvailable] = useState<boolean | null>(null);
  const [enumerated, setEnumerated] = useState<NearbyDevice[]>([]);
  const [found, setFound] = useState<NearbyDevice[]>([]);
  const [namesHidden, setNamesHidden] = useState(false);
  const [scanning, setScanning] = useState(support.any);
  const [pending, setPending] = useState<PairableTransport[]>([]);
  const [leScanning, setLeScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alive = useRef(true);
  const stopLeScan = useRef<(() => void) | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const sweep = useCallback(async () => {
    const [scan, available] = await Promise.all([
      scanNearbyDevices(),
      getBluetoothAvailability(),
    ]);
    if (!alive.current) return;
    setEnumerated(scan.devices);
    setNamesHidden(scan.namesHidden);
    setAdapter(available);
  }, []);

  // Initial sweep, plus a re-sweep whenever any transport reports a change.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void sweep().finally(() => {
        if (!cancelled) setScanning(false);
      });
    };
    run();
    const off = watchDeviceChanges(run);
    return () => {
      cancelled = true;
      off();
    };
  }, [sweep]);

  // Cast displays are watched, not polled — availability flips as TVs wake up.
  useEffect(() => {
    let off: (() => void) | null = null;
    let cancelled = false;
    watchCastAvailability((value) => {
      if (!cancelled) setCastAvailable(value);
    }).then((stop) => {
      if (cancelled) stop?.();
      else off = stop;
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  // Stop any live scan when the panel goes away.
  useEffect(
    () => () => {
      stopLeScan.current?.();
      stopLeScan.current = null;
    },
    [],
  );

  const rescan = useCallback(() => {
    setError(null);
    setFound([]);
    setScanning(true);
    void sweep().finally(() => {
      if (alive.current) setScanning(false);
    });
  }, [sweep]);

  const pair = useCallback(
    async (transport: PairableTransport) => {
      setError(null);
      // Only this transport is marked pending. A chooser the browser leaves open
      // must never be able to lock the other three buttons.
      setPending((prev) => (prev.includes(transport) ? prev : [...prev, transport]));
      const result = await pairDevice(transport);
      if (!alive.current) return;
      setPending((prev) => prev.filter((t) => t !== transport));
      if (!result.ok) {
        if (!result.cancelled) setError(result.message);
        return;
      }
      // Merge by key so re-picking a known device doesn't duplicate the row.
      setFound((prev) => {
        const byKey = new Map(prev.map((d) => [d.key, d]));
        for (const d of result.devices) byKey.set(d.key, d);
        return [...byKey.values()];
      });
      void sweep();
    },
    [sweep],
  );

  const toggleLeScan = useCallback(async () => {
    setError(null);
    if (stopLeScan.current) {
      stopLeScan.current();
      stopLeScan.current = null;
      setLeScanning(false);
      return;
    }
    try {
      const stop = await startLeScan((device) => {
        if (!alive.current) return;
        setFound((prev) => {
          const byKey = new Map(prev.map((d) => [d.key, d]));
          byKey.set(device.key, device);
          return [...byKey.values()];
        });
      });
      if (!alive.current) {
        stop();
        return;
      }
      stopLeScan.current = stop;
      setLeScanning(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Live scanning couldn't start.",
      );
    }
  }, []);

  const revealNames = useCallback(async () => {
    setError(null);
    const ok = await revealDeviceNames();
    if (!alive.current) return;
    if (!ok) {
      setError("Camera / microphone access was declined, so names stay hidden.");
      return;
    }
    void sweep();
  }, [sweep]);

  // Merge the two sets, then order by transport and name so the list is stable
  // across re-sweeps. An enumerated entry wins — it has live connection state —
  // but keeps the signal strength a live scan contributed.
  const devices = useMemo(() => {
    const byKey = new Map<string, NearbyDevice>();
    for (const d of found) byKey.set(d.key, d);
    for (const d of enumerated) {
      const prior = byKey.get(d.key);
      byKey.set(d.key, prior?.rssi != null ? { ...d, rssi: prior.rssi } : d);
    }
    return [...byKey.values()].sort(
      (a, b) =>
        TRANSPORT_ORDER.indexOf(a.transport) - TRANSPORT_ORDER.indexOf(b.transport) ||
        a.name.localeCompare(b.name),
    );
  }, [enumerated, found]);

  return {
    support,
    adapter,
    castAvailable,
    devices,
    namesHidden,
    scanning,
    pending,
    leScanning,
    error,
    rescan,
    pair,
    toggleLeScan,
    revealNames,
  };
}
