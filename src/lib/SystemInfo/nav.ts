/**
 * Typed accessors for the non-standard browser APIs the System Info app probes.
 * Each is guarded and returns null when unsupported, so callers never touch
 * `any` or crash on a missing feature. All are browser-only (SSR-safe guards).
 */

export interface NetworkInformation {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  addEventListener?: (type: "change", cb: () => void) => void;
  removeEventListener?: (type: "change", cb: () => void) => void;
}

export interface BatteryManager {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface UADataValues {
  platform?: string;
  platformVersion?: string;
  architecture?: string;
  bitness?: string;
  model?: string;
  uaFullVersion?: string;
}

export interface NavigatorUAData {
  platform?: string;
  mobile?: boolean;
  brands?: { brand: string; version: string }[];
  getHighEntropyValues?: (hints: string[]) => Promise<UADataValues>;
}

const nav = (): Navigator | null => (typeof navigator === "undefined" ? null : navigator);

export function getConnection(): NetworkInformation | null {
  const n = nav() as (Navigator & { connection?: NetworkInformation }) | null;
  return n?.connection ?? null;
}

export function getUAData(): NavigatorUAData | null {
  const n = nav() as (Navigator & { userAgentData?: NavigatorUAData }) | null;
  return n?.userAgentData ?? null;
}

export function getMemoryInfo(): MemoryInfo | null {
  if (typeof performance === "undefined") return null;
  const p = performance as Performance & { memory?: MemoryInfo };
  return p.memory ?? null;
}

export async function getBattery(): Promise<BatteryManager | null> {
  const n = nav() as (Navigator & { getBattery?: () => Promise<BatteryManager> }) | null;
  if (!n?.getBattery) return null;
  try {
    return await n.getBattery();
  } catch {
    return null;
  }
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  const n = nav();
  if (!n?.storage?.estimate) return null;
  try {
    return await n.storage.estimate();
  } catch {
    return null;
  }
}

export function getDeviceMemoryGB(): number | null {
  const n = nav() as (Navigator & { deviceMemory?: number }) | null;
  return typeof n?.deviceMemory === "number" ? n.deviceMemory : null;
}
