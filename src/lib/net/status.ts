/**
 * Shared network-condition snapshot for the whole workspace: is there a
 * connection at all, and is it good enough to spend bandwidth on?
 *
 * Two signals feed it — `navigator.onLine` (reliable for "definitely offline")
 * and the Network Information API (`navigator.connection`, non-standard and
 * partially supported, so every field is optional). `slow` folds them into the
 * single question features actually ask: should we skip or defer network work?
 *
 * Framework-free on purpose: the service-worker warm-up, plain libs and the
 * React hook (`useNetworkStatus`) all read the same source of truth.
 */

export interface NetworkStatus {
  /** False only when the browser is certain there is no connection. */
  online: boolean;
  /** "slow-2g" | "2g" | "3g" | "4g" where exposed, else null. */
  effectiveType: string | null;
  /** Estimated downlink in Mbps, where exposed. */
  downlink: number | null;
  /** Estimated round-trip time in ms, where exposed. */
  rtt: number | null;
  /** The user asked the OS/browser to save data. */
  saveData: boolean;
  /**
   * Online, but on a link where optional network work should be skipped or
   * deferred (metered/data-saver, 2g-class, or a very low downlink estimate).
   */
  slow: boolean;
}

/** Connection classes we treat as too weak for optional requests. */
const SLOW_TYPES = new Set(["slow-2g", "2g"]);

/** Below this estimated downlink (Mbps) the link counts as slow. */
const SLOW_DOWNLINK_MBPS = 0.4;

/** Assumed on the server: no `navigator`, and the client re-reads on mount. */
const SERVER_STATUS: NetworkStatus = {
  online: true,
  effectiveType: null,
  downlink: null,
  rtt: null,
  saveData: false,
  slow: false,
};

type ConnectionLike = {
  effectiveType?: unknown;
  downlink?: unknown;
  rtt?: unknown;
  saveData?: unknown;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function connection(): ConnectionLike | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as unknown as { connection?: ConnectionLike };
  return nav.connection ?? null;
}

function compute(): NetworkStatus {
  if (typeof navigator === "undefined") return SERVER_STATUS;
  const c = connection();
  const online = navigator.onLine !== false;
  const effectiveType = typeof c?.effectiveType === "string" ? c.effectiveType : null;
  const downlink = typeof c?.downlink === "number" ? c.downlink : null;
  const rtt = typeof c?.rtt === "number" ? c.rtt : null;
  const saveData = Boolean(c?.saveData);
  const slow =
    online &&
    (saveData ||
      (effectiveType !== null && SLOW_TYPES.has(effectiveType)) ||
      (downlink !== null && downlink > 0 && downlink < SLOW_DOWNLINK_MBPS));
  return { online, effectiveType, downlink, rtt, saveData, slow };
}

function same(a: NetworkStatus, b: NetworkStatus): boolean {
  return (
    a.online === b.online &&
    a.effectiveType === b.effectiveType &&
    a.downlink === b.downlink &&
    a.rtt === b.rtt &&
    a.saveData === b.saveData &&
    a.slow === b.slow
  );
}

/*
 * The snapshot is cached and only swapped when a field actually changes, so
 * `useSyncExternalStore` sees a stable reference and never re-renders in a loop.
 */
let current: NetworkStatus = SERVER_STATUS;
let primed = false;
const listeners = new Set<() => void>();

function refresh(): NetworkStatus {
  const next = compute();
  if (!same(current, next)) current = next;
  return current;
}

/** Current network conditions. Safe to call on the server. */
export function readNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined") return SERVER_STATUS;
  // With no subscribers there are no events to invalidate the cache, so read
  // through; `refresh` keeps the reference stable when nothing changed.
  if (!primed || listeners.size === 0) {
    primed = true;
    return refresh();
  }
  return current;
}

/** Server-render snapshot — a constant, as `useSyncExternalStore` requires. */
export const serverNetworkStatus = (): NetworkStatus => SERVER_STATUS;

function handleChange() {
  const before = current;
  if (refresh() !== before) for (const l of listeners) l();
}

/** Subscribe to connection changes. Returns an unsubscribe function. */
export function subscribeNetworkStatus(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("online", handleChange);
    window.addEventListener("offline", handleChange);
    connection()?.addEventListener?.("change", handleChange);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("online", handleChange);
      window.removeEventListener("offline", handleChange);
      connection()?.removeEventListener?.("change", handleChange);
    }
  };
}

/** Shorthand for the common guard: definitely no connection right now. */
export const isOffline = (): boolean => !readNetworkStatus().online;
