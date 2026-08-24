import type { AppId } from "@/store/useWorkspaceStore";

/**
 * The backup file format.
 *
 * Deliberately plain and self-describing: a flat map of the very storage keys
 * the workspace reads at runtime, wrapped in enough metadata to recognise the
 * file years later. No compression scheme of its own, no binary framing, no
 * app-specific structure — an app that changes how it stores its data keeps
 * working with old backups for free, because the file holds exactly what that
 * app itself wrote.
 *
 * `entries` values are strings for the same reason: that is what the store
 * holds. Parsing them here would mean this module needing to know every app's
 * schema, and a single malformed value could then take out a whole restore.
 */
export const BACKUP_FORMAT = "oneapp-backup";
export const BACKUP_VERSION = 1;

/** Name of the JSON document inside the backup archive. */
export const BACKUP_ENTRY_NAME = "backup.json";

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  /** Bumped only for a change old readers could not survive. */
  version: number;
  /** When the backup was taken (epoch ms). */
  createdAt: number;
  /** Where it came from — origin and app version, for the user's own sake. */
  source: { name: string; url: string };
  /** Storage key → stored value, verbatim. */
  entries: Record<string, string>;
}

/**
 * One line of the "what's in this file" summary shown before restoring.
 *
 * Carries the app *id*, not its name: the display name and icon live in
 * `components/AppCatalog.tsx`, and resolving them here would give the workspace
 * two catalogs to keep in step.
 */
export interface BackupRow {
  /** The app the keys belong to, or null for workspace preferences. */
  app: AppId | null;
  keys: number;
  bytes: number;
}

export interface BackupSummary {
  createdAt: number;
  source: { name: string; url: string };
  keys: number;
  bytes: number;
  rows: BackupRow[];
  /** Keys under a prefix this workspace does not own — never restored. */
  skipped: number;
}

/** Merge keeps anything the backup does not mention; replace does not. */
export type RestoreMode = "merge" | "replace";

export interface RestoreResult {
  written: number;
  removed: number;
  mode: RestoreMode;
}
