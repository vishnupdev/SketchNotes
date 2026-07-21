/**
 * Async key/value storage abstraction. Prefers `localStorage`; falls back to an
 * in-memory map when storage is unavailable (SSR, private mode, quota errors).
 * The async surface lets TanStack Query treat persistence like any data source
 * and keeps the door open for swapping in IndexedDB or a backend later.
 */

const memory = new Map<string, string>();

/** Whether real, writable persistence is available in this environment. */
export function storageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "__sk_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const ok = () => storageAvailable();

export async function sGet(key: string): Promise<string | null> {
  if (!ok()) return memory.has(key) ? memory.get(key)! : null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function sSet(key: string, value: string): Promise<void> {
  if (!ok()) {
    memory.set(key, value);
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    // Quota or serialisation failure — keep a session copy so work isn't lost.
    memory.set(key, value);
    console.error("storage set failed", e);
  }
}

export async function sDel(key: string): Promise<void> {
  if (!ok()) {
    memory.delete(key);
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
