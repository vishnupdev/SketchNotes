/**
 * Async key/value storage for the whole workspace.
 *
 * Every app persists through this one module, so the store underneath it can be
 * swapped without touching a single app. It now prefers **IndexedDB** and keeps
 * `localStorage` (then an in-memory map) as fallbacks.
 *
 * Why IndexedDB is the primary store:
 *
 *  - `localStorage` is a shared, synchronous ~5 MB budget for the *entire*
 *    origin — one quota for every app in the workspace. A sketch with a few
 *    pasted images, a PDF session or an image edit exhausts it, and the previous
 *    implementation could only catch the failure and keep a copy in memory: the
 *    write looked like it succeeded and the work vanished on reload.
 *  - IndexedDB is measured against the origin's real quota (typically a large
 *    share of free disk), stores strings without the UTF-16 doubling, and never
 *    blocks the main thread.
 *  - A service worker can read it. `localStorage` is unavailable in worker
 *    scope, so background reminder checks (`public/sw.js`) had no way to see
 *    what the user had scheduled.
 *
 * Shape kept deliberately dumb — one object store of `key → string`, the same
 * contract `localStorage` offered — so nothing above this file has to know which
 * backend answered, and `public/sw.js` can read the same rows with twenty lines
 * of plain IDB.
 *
 * Existing installs are migrated on first use: every `sknotes:` / `oneapp:` key
 * is copied into IndexedDB and then removed from `localStorage`, so the old
 * quota is handed back and nothing is counted twice.
 */

/** Database, store and version. Mirrored in `public/sw.js` — keep in sync. */
export const DB_NAME = "oneapp";
export const STORE_NAME = "kv";

/** Key prefixes that belong to this workspace (used by migration + backup). */
export const KEY_PREFIXES = ["sknotes:", "oneapp:"] as const;

/** Set once the localStorage → IndexedDB copy has completed. */
const MIGRATED_KEY = "oneapp:storage-migrated";

/**
 * An `indexedDB.open()` that never settles is possible — a long-lived
 * transaction in another tab blocks a version change indefinitely. Past this
 * budget the workspace falls back to `localStorage` rather than hanging every
 * read behind it.
 */
const OPEN_TIMEOUT_MS = 4_000;

/**
 * Keys a *synchronous* reader also needs. `lib/ui-sound.ts` decides whether to
 * play the boot chime before any async hydration can land, so this handful is
 * mirrored into `localStorage` on write and left there by the migration. They
 * are a few bytes each; the quota problem is entirely about note and image data.
 */
const SYNC_MIRROR_KEYS = new Set(["sknotes:ui-sound"]);

export type StorageBackend = "idb" | "local" | "memory";

/** Last-resort store, also used for SSR and hard-blocked storage. */
const memory = new Map<string, string>();

/* ------------------------------ capability ---------------------------- */

function hasIdb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

/** Whether `localStorage` exists *and* accepts a write (private mode, quota). */
function localWritable(): boolean {
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

/**
 * Whether real, writable persistence is likely available in this environment.
 *
 * Synchronous, so it can only answer from capability checks — a browser that
 * exposes IndexedDB but refuses to open a database still answers `true` here.
 * {@link storageReady} is the accurate, awaited answer; this stays for callers
 * that need a first guess during render.
 */
export function storageAvailable(): boolean {
  return hasIdb() || localWritable();
}

/** The store actually answering reads and writes, once {@link ready} settled. */
export function storageBackend(): StorageBackend {
  return backend;
}

/** Accurate answer to "is anything I save going to survive a reload?" */
export async function storageReady(): Promise<boolean> {
  await ready();
  return backend !== "memory";
}

/* ------------------------------ IndexedDB ----------------------------- */

let backend: StorageBackend = "memory";
let db: IDBDatabase | null = null;
let readyPromise: Promise<void> | null = null;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Open the database, creating the object store whenever it is missing.
 *
 * Deliberately *not* `open(DB_NAME, 1)`: `public/sw.js` may open the same
 * database first (versionless, so it can never destroy anything), which creates
 * an empty version-1 database with no object store. A later `open(DB_NAME, 1)`
 * from here would then find the version already satisfied, skip `upgradeneeded`
 * and hand back a database with nowhere to write — permanently. Reading the
 * current version first and stepping past it only when the store is absent
 * handles the fresh, the already-created and the worker-created cases alike.
 */
async function openDb(): Promise<IDBDatabase> {
  const existing = await request(window.indexedDB.open(DB_NAME));
  if (existing.objectStoreNames.contains(STORE_NAME)) return existing;

  const nextVersion = existing.version + 1;
  existing.close();
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, nextVersion);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("indexeddb blocked"));
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("indexeddb timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Run one transaction, resolving when it *commits* (not merely when it queues). */
function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  if (!db) return Promise.reject(new Error("no database"));
  const tx = db.transaction(STORE_NAME, mode);
  const result = Promise.resolve(run(tx.objectStore(STORE_NAME)));
  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => result.then(resolve, reject);
    tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("transaction failed"));
    // A read-only transaction resolves on complete like any other; the result
    // promise is already settled by then because its request fired inside it.
    result.catch(() => {
      try {
        tx.abort();
      } catch {
        /* already finished */
      }
    });
  });
}

/**
 * Choose a backend once, migrating legacy `localStorage` data on the way. Every
 * public operation awaits this, so callers never see a half-initialised store.
 */
function ready(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (typeof window === "undefined") {
      backend = "memory";
      return;
    }
    if (hasIdb()) {
      try {
        db = await withTimeout(openDb(), OPEN_TIMEOUT_MS);
        backend = "idb";
        // A database dropped from under us (browser storage cleared, "Clear
        // site data") must not leave every later write failing silently.
        db.onclose = () => {
          db = null;
          backend = localWritable() ? "local" : "memory";
        };
        await migrateFromLocal();
        return;
      } catch {
        db = null;
      }
    }
    backend = localWritable() ? "local" : "memory";
  })();
  return readyPromise;
}

/**
 * Copy this workspace's `localStorage` keys into IndexedDB once, then drop them.
 *
 * Order matters: every value is written and read back before anything is
 * deleted, so an interrupted migration leaves the original data exactly where
 * it was and simply runs again next time.
 */
async function migrateFromLocal(): Promise<void> {
  if (!db) return;
  try {
    if ((await idbGet(MIGRATED_KEY)) === "done") return;
  } catch {
    return;
  }
  if (typeof window === "undefined") return;

  let entries: Array<[string, string]> = [];
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key === null || !isWorkspaceKey(key)) continue;
      const value = ls.getItem(key);
      if (value !== null) entries.push([key, value]);
    }
  } catch {
    entries = []; // storage blocked — nothing to migrate
  }

  try {
    for (const [key, value] of entries) {
      // Never let a stale localStorage copy overwrite newer IndexedDB data.
      if ((await idbGet(key)) === null) await idbSet(key, value);
    }
    await idbSet(MIGRATED_KEY, "done");
  } catch {
    return; // leave localStorage untouched; retry on the next load
  }

  for (const [key] of entries) {
    if (SYNC_MIRROR_KEYS.has(key)) continue;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* freeing the old copy is a bonus, not a requirement */
    }
  }
}

const isWorkspaceKey = (key: string): boolean =>
  KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

const idbGet = async (key: string): Promise<string | null> =>
  transact("readonly", async (store) => {
    const value = await request<unknown>(store.get(key));
    return typeof value === "string" ? value : null;
  });

const idbSet = (key: string, value: string): Promise<void> =>
  transact("readwrite", (store) => {
    store.put(value, key);
  });

/* ------------------------------ public API ---------------------------- */

export async function sGet(key: string): Promise<string | null> {
  await ready();
  if (backend === "idb") {
    try {
      const value = await idbGet(key);
      if (value !== null) return value;
    } catch {
      /* fall through to the mirrors below */
    }
  }
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* no localStorage here (worker, private mode, SSR) */
  }
  return memory.has(key) ? memory.get(key)! : null;
}

export async function sSet(key: string, value: string): Promise<void> {
  await ready();
  mirrorSync(key, value);

  if (backend === "idb") {
    try {
      await idbSet(key, value);
      // Only the durable store holds it now: keeping a second copy in `memory`
      // would double the footprint of every note and image in the workspace.
      memory.delete(key);
      return;
    } catch (e) {
      console.error("storage set failed", e);
    }
  }
  if (backend === "local") {
    try {
      window.localStorage.setItem(key, value);
      memory.delete(key);
      return;
    } catch (e) {
      console.error("storage set failed", e);
    }
  }
  // Nothing durable accepted it — a session copy is what keeps the work alive
  // until the user can export it (Settings → Data).
  memory.set(key, value);
}

export async function sDel(key: string): Promise<void> {
  await ready();
  memory.delete(key);
  if (backend === "idb") {
    try {
      await transact("readwrite", (store) => {
        store.delete(key);
      });
    } catch {
      /* ignore */
    }
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Mirror the few keys a synchronous reader depends on (see SYNC_MIRROR_KEYS). */
function mirrorSync(key: string, value: string): void {
  if (!SYNC_MIRROR_KEYS.has(key)) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* a mirror is an optimisation; the real write is above */
  }
}

/**
 * Every workspace key currently stored, whichever backend holds it.
 * Used by backup (`lib/backup/`) and the storage audit.
 */
export async function sKeys(): Promise<string[]> {
  const entries = await sEntries();
  return Object.keys(entries);
}

/**
 * Every workspace key/value pair. Foreign keys (another site's leftovers under
 * a different prefix) are excluded, so a backup can never carry data this
 * workspace does not own.
 */
export async function sEntries(): Promise<Record<string, string>> {
  await ready();
  const out: Record<string, string> = {};

  const take = (key: string, value: string | null) => {
    if (value === null || !isWorkspaceKey(key) || key === MIGRATED_KEY) return;
    out[key] = value;
  };

  if (backend === "idb") {
    try {
      const rows = await transact("readonly", async (store) => {
        const keys = await request<IDBValidKey[]>(store.getAllKeys());
        const values = await request<unknown[]>(store.getAll());
        return keys.map((key, i) => [String(key), values[i]] as const);
      });
      for (const [key, value] of rows) take(key, typeof value === "string" ? value : null);
    } catch {
      /* fall through to the other stores */
    }
  }
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key !== null && !(key in out)) take(key, ls.getItem(key));
    }
  } catch {
    /* ignore */
  }
  for (const [key, value] of memory) if (!(key in out)) take(key, value);
  return out;
}

/** Write many pairs at once — one transaction, so a restore is atomic. */
export async function sSetMany(entries: Record<string, string>): Promise<void> {
  await ready();
  for (const [key, value] of Object.entries(entries)) mirrorSync(key, value);

  if (backend === "idb") {
    try {
      await transact("readwrite", (store) => {
        for (const [key, value] of Object.entries(entries)) store.put(value, key);
      });
      for (const key of Object.keys(entries)) memory.delete(key);
      return;
    } catch (e) {
      console.error("storage bulk set failed", e);
    }
  }
  for (const [key, value] of Object.entries(entries)) {
    try {
      if (backend !== "local") throw new Error("no local store");
      window.localStorage.setItem(key, value);
      memory.delete(key);
    } catch {
      memory.set(key, value);
    }
  }
}

/** Delete many keys at once (the "replace everything" half of a restore). */
export async function sDelMany(keys: string[]): Promise<void> {
  await ready();
  for (const key of keys) memory.delete(key);
  if (backend === "idb") {
    try {
      await transact("readwrite", (store) => {
        for (const key of keys) store.delete(key);
      });
    } catch {
      /* ignore */
    }
  }
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/* ---------------------------- persistence ----------------------------- */

/**
 * Ask the browser to exempt this origin's data from automatic eviction.
 *
 * Worth asking for: everything the workspace holds is the user's only copy.
 * Chromium grants it silently for an installed or frequently-used site and
 * refuses quietly otherwise, so the answer is reported rather than acted on.
 */
export async function requestPersistence(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

/** Whether this origin's data is already exempt from eviction. */
export async function persistenceState(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}
