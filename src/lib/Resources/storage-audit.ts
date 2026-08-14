import type { AppId } from "@/store/useWorkspaceStore";

/**
 * What this site is actually keeping on the device, and which app put it there.
 *
 * The workspace stores everything under a single `sknotes:` prefix in
 * localStorage, so the only way to say "Todos is using 4 KB" is to know the key
 * scheme. {@link OWNERS} is that knowledge, written out once here. It is read
 * strictly top-to-bottom, so a prefix rule can be listed after the exact keys it
 * would otherwise swallow.
 *
 * Nothing in this module writes or deletes. The monitor reports; clearing data
 * stays where it already lives (Settings → Offline, and the browser's own site
 * settings), so a glance at a number can never cost someone their notes.
 */

/** Keys that belong to the workspace shell rather than to any one app. */
const SETTINGS_KEYS = new Set([
  "sknotes:theme",
  "sknotes:custom-themes",
  "sknotes:ui-style",
  "sknotes:density",
  "sknotes:app-order",
  "sknotes:cursor",
]);

interface OwnerRule {
  app: AppId;
  match: (key: string) => boolean;
}

const exact =
  (...keys: string[]) =>
  (k: string): boolean =>
    keys.includes(k);
const prefix =
  (p: string) =>
  (k: string): boolean =>
    k.startsWith(p);

const OWNERS: OwnerRule[] = [
  { app: "todos", match: exact("sknotes:todos") },
  { app: "reminders", match: exact("sknotes:reminders") },
  { app: "timer", match: exact("sknotes:timer") },
  { app: "board", match: exact("sknotes:board") },
  { app: "morse", match: exact("sknotes:morse") },
  { app: "assistant", match: exact("sknotes:assistant") },
  { app: "translate", match: exact("sknotes:translate-prefs") },
  { app: "color", match: exact("sknotes:colorlens-picks") },
  { app: "sound", match: prefix("sknotes:sound:") },
  { app: "world", match: prefix("sknotes:worldclock:") },
  { app: "speed", match: prefix("sknotes:netspeed:") },
  { app: "malayalam", match: prefix("sknotes:malayalam-") },
  // Sketchnotes keys a note by its bare id (`sknotes:<id>`) plus one index, so
  // it can only be identified last — as "every remaining workspace key".
  { app: "sketchnotes", match: prefix("sknotes:") },
];

/** localStorage holds UTF-16, so a stored pair costs about two bytes a char. */
const pairBytes = (key: string, value: string): number => (key.length + value.length) * 2;

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
  local: { bytes: number; keys: number; available: boolean };
  session: { bytes: number; keys: number };
  /** Data attributed to a specific app, largest first. */
  byApp: AppStorageRow[];
  /** Theme, pointer and launcher preferences — shell, not app. */
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

const owner = (key: string): AppId | null =>
  OWNERS.find((rule) => rule.match(key))?.app ?? null;

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
 * Walk every store this page can see and attribute what it finds. Runs entirely
 * on the device; nothing is transmitted and nothing is modified.
 */
export async function auditStorage(): Promise<StorageAudit> {
  const local = safeArea(() => window.localStorage);
  const session = safeArea(() => window.sessionStorage);

  const perApp = new Map<AppId, AppStorageRow>();
  const settings = { bytes: 0, keys: 0 };
  const foreign = { bytes: 0, keys: 0 };
  let localBytes = 0;
  let localKeys = 0;

  if (local) {
    try {
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (key === null) continue;
        const bytes = pairBytes(key, local.getItem(key) ?? "");
        localBytes += bytes;
        localKeys++;

        if (SETTINGS_KEYS.has(key)) {
          settings.bytes += bytes;
          settings.keys++;
          continue;
        }
        const app = owner(key);
        if (!app) {
          foreign.bytes += bytes;
          foreign.keys++;
          continue;
        }
        const row = perApp.get(app) ?? { app, bytes: 0, keys: 0 };
        row.bytes += bytes;
        row.keys++;
        perApp.set(app, row);
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
    local: { bytes: localBytes, keys: localKeys, available: local != null },
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
