"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLocalIPs,
  getPublicIP,
  type LocalIpResult,
  type PublicIpResult,
} from "@/lib/SystemInfo/ip";

/**
 * Device IP state. Local addresses are gathered automatically via WebRTC (no
 * network request); the public IP is only fetched when {@link lookupPublic} is
 * called, since it contacts an external service.
 */
export function useDeviceIp() {
  const [local, setLocal] = useState<LocalIpResult | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [pub, setPub] = useState<PublicIpResult | null>(null);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState(false);

  useEffect(() => {
    let ok = true;
    getLocalIPs().then((r) => {
      if (ok) {
        setLocal(r);
        setLocalLoading(false);
      }
    });
    return () => {
      ok = false;
    };
  }, []);

  const lookupPublic = useCallback(async () => {
    setPubLoading(true);
    setPubError(false);
    const r = await getPublicIP();
    setPub(r);
    setPubError(r == null);
    setPubLoading(false);
  }, []);

  return { local, localLoading, pub, pubLoading, pubError, lookupPublic };
}
