/**
 * Backup and restore for everything the workspace keeps on this device.
 *
 * The workspace has no account and no server: notes, tasks, reminders, boards,
 * themes and every preference live in this one browser. That is the privacy
 * promise, and it is also the risk — clearing site data, switching laptops or a
 * browser evicting storage takes the lot, with nothing to restore from. This
 * module is the missing half: one file out, the same file back in.
 *
 * What it produces is a `.zip` holding `backup.json` (see `./types.ts`) plus a
 * plain-text note explaining what the file is, so someone finding it in a
 * downloads folder in two years can tell. Zipped because the biggest thing in a
 * backup is base64 image data in sketches, which compresses by roughly a third
 * and costs nothing to unpack. A bare `.json` is accepted on the way back in
 * too, so a hand-edited or hand-extracted file still restores.
 *
 * JSZip is imported dynamically: this module is reachable from the always-loaded
 * settings panel, and a compression library has no business in the initial
 * payload (rule #7).
 */

import { sDelMany, sEntries, sSetMany } from "@/lib/storage";
import { classifyKey } from "@/lib/storage-keys";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { AppId } from "@/store/useWorkspaceStore";
import {
  BACKUP_ENTRY_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupFile,
  type BackupRow,
  type BackupSummary,
  type RestoreMode,
  type RestoreResult,
} from "./types";

const README = `This is a OneApp backup.

It contains everything OneApp had saved in one browser — notes, tasks,
reminders, boards, timers and preferences — as a single JSON document
(${BACKUP_ENTRY_NAME}).

To restore it, open OneApp, go to Settings -> Data and choose "Restore from a
backup", then pick this file. Nothing here is uploaded anywhere: the file was
written by your browser and is read back by your browser.

The JSON is plain text and safe to inspect. Each key is exactly what one app
stores under it, so a single app's data can be recovered by hand if needed.
`;

/** `oneapp-backup-2026-08-24.zip` — sortable, and obvious a year later. */
export function backupFileName(at: number = Date.now()): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `oneapp-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`;
}

const byteLength = (text: string): number =>
  typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length;

/* -------------------------------- export ------------------------------ */

export interface CreatedBackup {
  blob: Blob;
  name: string;
  summary: BackupSummary;
}

/**
 * Wrap a set of stored pairs in the backup document, dropping anything this
 * workspace doesn't own.
 *
 * Shared with Handoff, which sends the identical document between devices over
 * QR codes instead of writing it to a file — so a transfer and a backup are
 * literally the same bytes, validated by the same reader on the way in.
 */
export function buildDocument(stored: Record<string, string>): {
  json: string;
  summary: BackupSummary;
} {
  const entries: Record<string, string> = {};
  let skipped = 0;

  for (const [key, value] of Object.entries(stored)) {
    // Foreign keys are excluded rather than trusted: a backup must only ever
    // carry data this workspace itself wrote.
    if (classifyKey(key).kind === "foreign") {
      skipped += 1;
      continue;
    }
    entries[key] = value;
  }

  const createdAt = Date.now();
  const source = { name: SITE_NAME, url: SITE_URL };
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt,
    source,
    entries,
  };
  return {
    json: JSON.stringify(file),
    summary: { ...summarize(entries), createdAt, source, skipped },
  };
}

/** Read everything the workspace has stored and package it for download. */
export async function createBackup(): Promise<CreatedBackup> {
  const { json, summary } = buildDocument(await sEntries());
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(BACKUP_ENTRY_NAME, json);
  zip.file("README.txt", README);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { blob, name: backupFileName(summary.createdAt), summary };
}

/* -------------------------------- import ------------------------------ */

export class BackupError extends Error {}

/** Pull `backup.json` out of a `.zip`, or accept a bare `.json` document. */
async function readBackupText(file: File | Blob): Promise<string> {
  const looksZip = await isZip(file);
  if (!looksZip) return file.text();

  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);
  const entry =
    zip.file(BACKUP_ENTRY_NAME) ??
    // Tolerate an archive rebuilt with a folder around it, or renamed.
    zip.filter((path) => path.toLowerCase().endsWith(".json"))[0];
  if (!entry) throw new BackupError("That archive doesn't contain a OneApp backup.");
  return entry.async("string");
}

/** Zip files start with "PK\003\004"; sniffing beats trusting a file name. */
async function isZip(file: File | Blob): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  } catch {
    return false;
  }
}

/**
 * Validate a chosen file and describe what restoring it would bring back.
 *
 * Nothing is written here. The user sees the summary — when it was taken, which
 * apps it covers, how much data — and only then decides.
 */
export async function readBackup(
  file: File | Blob,
): Promise<{ entries: Record<string, string>; summary: BackupSummary }> {
  return readBackupJson(await readBackupText(file));
}

/**
 * Validate a backup *document* and describe it. Split out from
 * {@link readBackup} because a backup does not only arrive as a file: Handoff
 * receives the very same document over a chain of QR codes, and both paths must
 * apply identical checks to what they are about to write into storage.
 */
export function readBackupJson(json: string): {
  entries: Record<string, string>;
  summary: BackupSummary;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError("That file isn't a OneApp backup — it couldn't be read.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new BackupError("That file isn't a OneApp backup.");
  }
  const raw = parsed as Partial<BackupFile>;
  if (raw.format !== BACKUP_FORMAT) {
    throw new BackupError("That file isn't a OneApp backup.");
  }
  if (typeof raw.version === "number" && raw.version > BACKUP_VERSION) {
    throw new BackupError(
      "That backup was made by a newer version of OneApp. Update this page, then try again.",
    );
  }
  if (!raw.entries || typeof raw.entries !== "object") {
    throw new BackupError("That backup is empty or damaged.");
  }

  // Keep only well-formed, owned pairs. A backup is untrusted input like any
  // other file: a stray key of the wrong type must not reach the store.
  const entries: Record<string, string> = {};
  let skipped = 0;
  for (const [key, value] of Object.entries(raw.entries)) {
    if (typeof value !== "string" || classifyKey(key).kind === "foreign") {
      skipped += 1;
      continue;
    }
    entries[key] = value;
  }
  if (Object.keys(entries).length === 0) {
    throw new BackupError("That backup contains nothing this workspace can restore.");
  }

  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : 0;
  const source =
    raw.source && typeof raw.source.name === "string"
      ? raw.source
      : { name: SITE_NAME, url: SITE_URL };

  return { entries, summary: { ...summarize(entries), createdAt, source, skipped } };
}

/**
 * Write a backup's contents into this browser.
 *
 * `merge` (the default) writes what the backup holds and leaves everything else
 * alone — the right choice for pulling one device's data into another. `replace`
 * additionally clears the workspace keys the backup does *not* mention, which is
 * what "make this browser look exactly like the backup" means; it is the
 * destructive option and the UI asks for confirmation before using it.
 *
 * Apps read their data once at start-up, so the caller reloads afterwards rather
 * than trying to re-hydrate every app's store in place.
 */
export async function applyBackup(
  entries: Record<string, string>,
  mode: RestoreMode = "merge",
): Promise<RestoreResult> {
  let removed = 0;
  if (mode === "replace") {
    const current = await sEntries();
    const stale = Object.keys(current).filter(
      (key) => !(key in entries) && classifyKey(key).kind !== "foreign",
    );
    if (stale.length) await sDelMany(stale);
    removed = stale.length;
  }
  await sSetMany(entries);
  return { written: Object.keys(entries).length, removed, mode };
}

/** Erase every key this workspace owns. Used by Settings → Data → Erase. */
export async function eraseWorkspaceData(): Promise<number> {
  const current = await sEntries();
  const keys = Object.keys(current).filter((key) => classifyKey(key).kind !== "foreign");
  if (keys.length) await sDelMany(keys);
  return keys.length;
}

/* ------------------------------- summary ------------------------------ */

/** Group a key/value map into per-app rows, largest first. */
function summarize(entries: Record<string, string>): Omit<BackupSummary, "createdAt" | "source" | "skipped"> {
  const perApp = new Map<AppId | null, BackupRow>();
  let bytes = 0;

  for (const [key, value] of Object.entries(entries)) {
    const size = byteLength(key) + byteLength(value);
    bytes += size;
    const cls = classifyKey(key);
    const app = cls.kind === "app" ? cls.app : null;
    const row = perApp.get(app) ?? { app, keys: 0, bytes: 0 };
    row.keys += 1;
    row.bytes += size;
    perApp.set(app, row);
  }

  return {
    keys: Object.keys(entries).length,
    bytes,
    rows: [...perApp.values()].sort((a, b) => b.bytes - a.bytes),
  };
}
