"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_BAUD_RATE,
  canConnect,
  connectDevice,
  disconnectAllDevices,
  disconnectDevice,
  getLink,
  getLinks,
  getServerLinks,
  reconcileLinks,
  subscribeLinks,
  type DeviceLink,
} from "@/lib/nearby/connect";
import type { NearbyDevice } from "@/lib/nearby/discovery";

export interface UseDeviceConnections {
  /** The devices this page can actually open a link to, in list order. */
  connectable: NearbyDevice[];
  /** How many of those are open right now. */
  openCount: number;
  link: (key: string) => DeviceLink;
  connect: (key: string) => void;
  disconnect: (key: string) => void;
  disconnectAll: () => void;
  /** Chosen line speed for a serial port; only meaningful before it opens. */
  baudRate: (key: string) => number;
  setBaudRate: (key: string, rate: number) => void;
}

/**
 * Binds the Nearby app to the module-level connection manager in
 * `lib/nearby/connect.ts`.
 *
 * The links deliberately live outside React. An open USB or serial handle
 * outlives the component that opened it, and the workspace unmounts an app the
 * moment you switch to another one — if this state were in `useState`, browsing
 * to Todos and back would silently drop every connection the user had made.
 * `useSyncExternalStore` just subscribes to it.
 */
export function useDeviceConnections(devices: NearbyDevice[]): UseDeviceConnections {
  const links = useSyncExternalStore(subscribeLinks, getLinks, getServerLinks);
  const [baudRates, setBaudRates] = useState<Record<string, number>>({});

  // A device that has gone away can't report its own disconnect on every
  // transport, so each fresh sweep is also the cue to drop dead links.
  useEffect(() => {
    reconcileLinks();
  }, [devices]);

  const connectable = useMemo(() => devices.filter((d) => canConnect(d.key)), [devices]);

  const openCount = useMemo(
    () => connectable.filter((d) => links.get(d.key)?.state === "connected").length,
    [connectable, links],
  );

  const link = useCallback((key: string) => links.get(key) ?? getLink(key), [links]);

  const connect = useCallback(
    (key: string) => {
      void connectDevice(key, { baudRate: baudRates[key] ?? DEFAULT_BAUD_RATE });
    },
    [baudRates],
  );

  const disconnect = useCallback((key: string) => {
    void disconnectDevice(key);
  }, []);

  const disconnectAll = useCallback(() => {
    void disconnectAllDevices();
  }, []);

  const baudRate = useCallback(
    (key: string) => baudRates[key] ?? DEFAULT_BAUD_RATE,
    [baudRates],
  );

  const setBaudRate = useCallback((key: string, rate: number) => {
    setBaudRates((prev) => ({ ...prev, [key]: rate }));
  }, []);

  return {
    connectable,
    openCount,
    link,
    connect,
    disconnect,
    disconnectAll,
    baudRate,
    setBaudRate,
  };
}
