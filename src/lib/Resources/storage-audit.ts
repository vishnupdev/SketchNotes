import type { AppId } from "@/store/useWorkspaceStore";
import { DB_NAME, STORE_NAME, storageBackend, type StorageBackend } from "@/lib/storage";
import { classifyKey, pairBytes } from "@/lib/storage-keys";

/**
 * What this site is actually keeping on the device, and which app put it there.
 *
 * The workspace stores everything under a single `sknotes:` prefix in one
 * key/value store, so the only way to say "Todos is using 4 KB" is to know the
 * key scheme. That knowledge lives in `lib/storage-keys.ts`, shared with
 * backup/restore, which needs the very same classification.
 *
 * Both stores are walked, because which one holds the data depends on the
 * browser: IndexedDB is the primary store (see `lib/storage.ts`) with
 * localStorage as the fallback — and just after an upgrade localStorage can
 * still hold keys the migration has not swept yet. `saved` is their union, so
 * the user is shown what is on the device rather than what is in one API.
 *
 * Nothing in this module writes or deletes. The monitor reports; clearing data
 * lives where it already did (Settings → Offline, Settings → Data, and the
 * browser's own site settings), so a glance at a number can never cost someone
 * their notes.
 */

export interface AppStorageRow {
  app: AppId;
  bytes: number;
  keys: number;
}

export interface CacheRow {
  name: string;
  entries: number;
}

export interface StorageAudit {
  /** The browser's own figure for this origin, when it will give one. */
  estimate: { usage: number; quota: number } | null;
  /** Everything the workspace has saved, across both key/value stores. */
  saved: { bytes: number; keys: number; available: boolean };
  /** Which store is answering reads and writes in this browser. */
  backend: StorageBackend;
  session: { bytes: number; keys: number };
  /** Data attributed to a specific app, largest first. */
  byApp: AppStorageRow[];
  /** Theme, pointer, sound and launcher preferences — shell, not app. */
  settings: { bytes: number; keys: number };
  /** Keys under some other prefix entirely (an extension, an older build). */
  foreign: { bytes: number; keys: number };
  /** Offline copies of the apps themselves, kept by the service worker. */
  caches: CacheRow[];
  cacheEntries: number;
  /** IndexedDB databases, where the browser will enumerate them. */
  databases: string[];
  databasesKnown: boolean;
  serviceWorkers: number;
  cookies: number;
  /** Whether this origin's data is exempt from automatic eviction. */
  persisted: boolean | null;
}

/** Size one Storage area, tolerating a browser that blocks it outright. */
function measure(area: Storage | null): { bytes: number; keys: number } {
  if (!area) return { bytes: 0, keys: 0 };
  let bytes = 0;
  let keys = 0;
  try {
    for (let i = 0; i < area.length; i++) {
      const key = area.key(i);
      if (key === null) continue;
      bytes += pairBytes(key, area.getItem(key) ?? "");
      keys++;
    }
  } catch {
    /* private mode, or storage disabled — report what was counted so far */
  }
  return { bytes, keys };
}

const safeArea = (pick: () => Storage): Storage | null => {
  try {
    return pick();
  } catch {
    return null;
  }
};

/**
 * Read every key/value pair the workspace's IndexedDB store holds.
 *
 * Read-only and versionless — a monitor must never be the thing that creates or
 * upgrades a database — so a browser where the store does not exist yet simply
 * contributes nothing.
 */
async function readDbRows(): Promise<Array<[string, string]>> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await new Promise<IDBDatabase | null>((resolve) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
    if (!db) return [];
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close();
      return [];
    }
    const rows = await new Promise<Array<[string, string]>>((resolve) => {
      const out: Array<[string, string]> = [];
      const tx = db.transaction(STORE_NAME, "readonly");
      const cursorReq = tx.objectStore(STORE_NAME).openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        if (typeof cursor.value === "string") out.push([String(cursor.key), cursor.value]);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => resolve(out);
      tx.onabort = () => resolve(out);
    });
    db.close();
    return rows;
  } catch {
    return [];
  }
}

/**
 * Walk every store this page can see and attribute what it finds. Runs entirely
 * on the device; nothing is transmitted and nothing is modified.
 */
export async function auditStorage(): Promise<StorageAudit> {
  const local = safeArea(() => window.localStorage);
  const session = safeArea(() => window.sessionStorage);

  const perApp = new Map<AppId, AppStorageRow>();
  const settings = { bytes: 0, keys: 0 };
  const foreign = { bytes: 0, keys: 0 };
  let savedBytes = 0;
  let savedKeys = 0;
  // A key can sit in both stores mid-migration; count it once.
  const counted = new Set<string>();

  const attribute = (key: string, value: string) => {
    if (counted.has(key)) return;
    counted.add(key);
    const bytes = pairBytes(key, value);
    savedBytes += bytes;
    savedKeys++;

    const cls = classifyKey(key);
    if (cls.kind === "settings") {
      settings.bytes += bytes;
      settings.keys++;
      return;
    }
    if (cls.kind === "foreign") {
      foreign.bytes += bytes;
      foreign.keys++;
      return;
    }
    const row = perApp.get(cls.app) ?? { app: cls.app, bytes: 0, keys: 0 };
    row.bytes += bytes;
    row.keys++;
    perApp.set(cls.app, row);
  };

  for (const [key, value] of await readDbRows()) attribute(key, value);

  if (local) {
    try {
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (key === null) continue;
        attribute(key, local.getItem(key) ?? "");
      }
    } catch {
      /* keep whatever was counted */
    }
  }

  const [estimate, caches, databases, serviceWorkers, persisted] = await Promise.all([
    readEstimate(),
    readCaches(),
    readDatabases(),
    countServiceWorkers(),
    readPersisted(),
  ]);

  return {
    estimate,
    saved: { bytes: savedBytes, keys: savedKeys, available: storageBackend() !== "memory" },
    backend: storageBackend(),
    session: measure(session),
    byApp: [...perApp.values()].sort((a, b) => b.bytes - a.bytes),
    settings,
    foreign,
    caches: caches.rows,
    cacheEntries: caches.total,
    databases: databases.names,
    databasesKnown: databases.known,
    serviceWorkers,
    cookies: countCookies(),
    persisted,
  };
}

async function readEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    if (!est.quota) return null;
    return { usage: est.usage ?? 0, quota: est.quota };
  } catch {
    return null;
  }
}

async function readCaches(): Promise<{ rows: CacheRow[]; total: number }> {
  if (typeof caches === "undefined") return { rows: [], total: 0 };
  try {
    const names = await caches.keys();
    const rows = await Promise.all(
      names.map(async (name) => {
        try {
          const cache = await caches.open(name);
          return { name, entries: (await cache.keys()).length };
        } catch {
          return { name, entries: 0 };
        }
      }),
    );
    rows.sort((a, b) => b.entries - a.entries);
    return { rows, total: rows.reduce((sum, r) => sum + r.entries, 0) };
  } catch {
    return { rows: [], total: 0 };
  }
}

/** `indexedDB.databases()` is Chromium/Safari-only; Firefox can't enumerate. */
async function readDatabases(): Promise<{ names: string[]; known: boolean }> {
  if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") {
    return { names: [], known: false };
  }
  try {
    const dbs = await indexedDB.databases();
    return { names: dbs.map((d) => d.name ?? "(unnamed)"), known: true };
  } catch {
    return { names: [], known: false };
  }
}

async function countServiceWorkers(): Promise<number> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.getRegistrations) return 0;
  try {
    return (await navigator.serviceWorker.getRegistrations()).length;
  } catch {
    return 0;
  }
}

async function readPersisted(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

/** Cookies readable from script. HttpOnly cookies are invisible here by design. */
function countCookies(): number {
  if (typeof document === "undefined" || !document.cookie) return 0;
  return document.cookie.split(";").filter((c) => c.trim().length > 0).length;
}
