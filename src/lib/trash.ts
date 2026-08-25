import { sGet, sSet, sSetMany } from "@/lib/storage";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * A safety net under every delete in the workspace.
 *
 * Everything here lives in one browser with no server copy, and until now every
 * delete was final — a mis-tapped note, task or board section was simply gone.
 * People lose work to slips far more often than to disk failures, so this keeps
 * what was deleted for a month and lets it be put back.
 *
 * Deliberately generic: a trashed thing is described as *storage operations to
 * undo*, not as a note or a task. That means restoring needs no code from the
 * app the thing came from — which is what keeps this shell-level (rules #4/#5)
 * and what stops it going stale when an app changes its own shape.
 *
 * Two kinds of part cover everything the workspace stores:
 *
 *  - **key** — a whole storage key and its value (a sketch note is one of these).
 *  - **item** — one element of a JSON array held at a key (a task inside
 *    `sknotes:todos`, a section inside `sknotes:board`). Restoring puts it back
 *    into the array, matched by `id` so a double restore can't duplicate it.
 *
 * A note deletion is both at once: the document key, plus its entry in the notes
 * index. That is why an entry carries a *list* of parts rather than one.
 */

const TRASH_KEY = "sknotes:trash";

/** How long something stays recoverable. */
export const TRASH_DAYS = 30;

/**
 * Caps, because the trash must never become the reason storage fills up.
 *
 * An item too big to keep is *not* silently swallowed: `moveToTrash` says so,
 * and the app can tell the user this one is gone for good rather than implying a
 * safety net that isn't there.
 */
const MAX_ITEM_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

export type TrashPart =
  | { kind: "key"; key: string; value: string }
  | { kind: "item"; key: string; item: unknown };

export interface TrashEntry {
  id: string;
  app: AppId;
  /** What was deleted, in the user's words — a note title, a task. */
  label: string;
  /** Optional second line: a count, a date, anything clarifying. */
  detail?: string;
  bytes: number;
  deletedAt: number;
  parts: TrashPart[];
}

/** A whole storage key and its value. */
export const keyPart = (key: string, value: string): TrashPart => ({ kind: "key", key, value });

/** One element of the JSON array stored at `key`. */
export const itemPart = (key: string, item: unknown): TrashPart => ({ kind: "item", key, item });

const byteLength = (text: string): number =>
  typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length;

async function readTrash(): Promise<TrashEntry[]> {
  try {
    const raw = await sGet(TRASH_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Untrusted stored data like any other: keep only well-formed rows.
    return parsed.filter(
      (e): e is TrashEntry =>
        Boolean(e) &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.label === "string" &&
        typeof e.deletedAt === "number" &&
        Array.isArray(e.parts),
    );
  } catch {
    return [];
  }
}

const writeTrash = (entries: TrashEntry[]): Promise<void> =>
  sSet(TRASH_KEY, JSON.stringify(entries));

export interface TrashResult {
  /** False when the thing was too big to keep — it is deleted either way. */
  trashed: boolean;
  reason?: string;
}

/**
 * Put something in the trash. Does **not** delete anything: the caller performs
 * its own delete, and this records how to undo it.
 *
 * Written that way round on purpose — a trash that also deleted would have to
 * know each app's write path, which is exactly the coupling this avoids.
 */
export async function moveToTrash(input: {
  app: AppId;
  label: string;
  detail?: string;
  parts: TrashPart[];
}): Promise<TrashResult> {
  const entry: TrashEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    app: input.app,
    label: input.label.trim() || "Untitled",
    detail: input.detail,
    bytes: 0,
    deletedAt: Date.now(),
    parts: input.parts,
  };
  entry.bytes = byteLength(JSON.stringify(entry.parts));

  if (entry.bytes > MAX_ITEM_BYTES) {
    return {
      trashed: false,
      reason: `too large to keep in the trash (${Math.round(entry.bytes / 1024 / 1024)} MB)`,
    };
  }

  const kept = prune(await readTrash());
  const next = [entry, ...kept];

  // Make room oldest-first, so the most recent mistake is the one that stays
  // recoverable.
  let total = next.reduce((sum, e) => sum + e.bytes, 0);
  while (next.length > 1 && total > MAX_TOTAL_BYTES) {
    const dropped = next.pop();
    total -= dropped?.bytes ?? 0;
  }

  await writeTrash(next);
  return { trashed: true };
}

/** Everything recoverable, newest first, with anything expired already gone. */
export async function listTrash(): Promise<TrashEntry[]> {
  const entries = await readTrash();
  const kept = prune(entries);
  if (kept.length !== entries.length) await writeTrash(kept);
  return kept.sort((a, b) => b.deletedAt - a.deletedAt);
}

/** Drop anything past the retention window. */
function prune(entries: TrashEntry[]): TrashEntry[] {
  const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.deletedAt >= cutoff);
}

/** Delete expired rows now, and report how many went. */
export async function pruneTrash(): Promise<number> {
  const entries = await readTrash();
  const kept = prune(entries);
  if (kept.length !== entries.length) await writeTrash(kept);
  return entries.length - kept.length;
}

/**
 * Put one entry back.
 *
 * The caller reloads afterwards, like restoring a backup: every app reads its
 * data once at start-up, so writing the keys back is only half the job.
 */
export async function restoreFromTrash(id: string): Promise<boolean> {
  const entries = await readTrash();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return false;

  const keys: Record<string, string> = {};
  for (const part of entry.parts) {
    if (part.kind === "key") {
      keys[part.key] = part.value;
      continue;
    }
    // An array member: read what is there now and put the element back, rather
    // than overwriting a collection that has changed since the delete.
    const current = await readArray(part.key);
    const item = part.item as { id?: unknown } | null;
    const id = item && typeof item === "object" ? item.id : undefined;
    const already =
      id !== undefined && current.some((row) => (row as { id?: unknown })?.id === id);
    keys[part.key] = JSON.stringify(already ? current : [part.item, ...current]);
  }

  await sSetMany(keys);
  await writeTrash(entries.filter((e) => e.id !== id));
  return true;
}

async function readArray(key: string): Promise<unknown[]> {
  try {
    const raw = await sGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Forget one entry for good. */
export async function purgeFromTrash(id: string): Promise<void> {
  const entries = await readTrash();
  await writeTrash(entries.filter((e) => e.id !== id));
}

/** Forget everything. Returns how many entries went. */
export async function emptyTrash(): Promise<number> {
  const entries = await readTrash();
  await writeTrash([]);
  return entries.length;
}
