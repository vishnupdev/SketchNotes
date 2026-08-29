/**
 * The workspace's storage key scheme, and which app owns each key.
 *
 * Everything the workspace saves lives under one `sknotes:` / `oneapp:` prefix
 * in a single key/value store (see `lib/storage.ts`), so "how much is Todos
 * using?" and "which of these keys belong in a backup of Todos?" can only be
 * answered by knowing the scheme. That knowledge is written out once here.
 *
 * Shell-level on purpose (rules #4/#5): two features need it — the Resource
 * Monitor's storage audit (`lib/Resources/storage-audit.ts`) and backup/restore
 * (`lib/backup/`) — and neither may import the other's internals.
 *
 * Nothing in this module reads, writes or deletes anything. It only classifies.
 */

import type { AppId } from "@/store/useWorkspaceStore";

/** Keys that belong to the workspace shell rather than to any one app. */
export const SETTINGS_KEYS: ReadonlySet<string> = new Set([
  "sknotes:theme",
  "sknotes:custom-themes",
  "sknotes:ui-style",
  "sknotes:density",
  "sknotes:app-order",
  "sknotes:cursor",
  "sknotes:ui-sound",
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

/**
 * Read strictly top-to-bottom, so a prefix rule can be listed after the exact
 * keys it would otherwise swallow.
 */
const OWNERS: OwnerRule[] = [
  { app: "todos", match: exact("sknotes:todos") },
  { app: "reminders", match: exact("sknotes:reminders") },
  { app: "timer", match: exact("sknotes:timer") },
  { app: "board", match: exact("sknotes:board") },
  { app: "morse", match: exact("sknotes:morse") },
  { app: "assistant", match: exact("sknotes:assistant") },
  { app: "translate", match: exact("sknotes:translate-prefs") },
  { app: "color", match: exact("sknotes:colorlens-picks") },
  { app: "qr", match: prefix("sknotes:qr:") },
  { app: "text", match: prefix("sknotes:text:") },
  { app: "drop", match: prefix("sknotes:drop:") },
  { app: "clone", match: prefix("sknotes:clone:") },
  { app: "sound", match: prefix("sknotes:sound:") },
  { app: "world", match: prefix("sknotes:worldclock:") },
  { app: "speed", match: prefix("sknotes:netspeed:") },
  { app: "malayalam", match: prefix("sknotes:malayalam-") },
  { app: "walk", match: prefix("sknotes:walk:") },
  { app: "wallet", match: prefix("sknotes:wallet:") },
  { app: "voice", match: prefix("sknotes:voice:") },
  { app: "convert", match: prefix("sknotes:convert:") },
  { app: "api", match: prefix("sknotes:api:") },
  { app: "snippets", match: prefix("sknotes:snippets:") },
  { app: "markdown", match: prefix("sknotes:markdown:") },
  { app: "chrono", match: prefix("sknotes:chrono:") },
  { app: "contrast", match: prefix("sknotes:contrast:") },
  { app: "satellite", match: prefix("sknotes:satellite:") },
  // Scan deliberately stores nothing — its pages live in memory until exported —
  // so it has no rule here. Adding one would claim a prefix that never exists.
  // Sketchnotes keys a note by its bare id (`sknotes:<id>`) plus one index, so
  // it can only be identified last — as "every remaining workspace key".
  { app: "sketchnotes", match: prefix("sknotes:") },
];

/** Which app a stored key belongs to, or null when no rule claims it. */
export const keyOwner = (key: string): AppId | null =>
  OWNERS.find((rule) => rule.match(key))?.app ?? null;

/** Whether a key holds a workspace preference rather than one app's data. */
export const isSettingsKey = (key: string): boolean => SETTINGS_KEYS.has(key);

/**
 * How a stored pair is classified for the user: one app's data, a workspace
 * preference, or something under a prefix this workspace does not own.
 */
export type KeyClass = { kind: "app"; app: AppId } | { kind: "settings" } | { kind: "foreign" };

export function classifyKey(key: string): KeyClass {
  if (SETTINGS_KEYS.has(key)) return { kind: "settings" };
  const app = keyOwner(key);
  return app ? { kind: "app", app } : { kind: "foreign" };
}

/**
 * Approximate byte cost of one stored pair. Strings are held as UTF-16 in both
 * backends, so a stored pair costs about two bytes a character. Close enough to
 * rank apps by size; no browser reports an exact per-key figure.
 */
export const pairBytes = (key: string, value: string): number => (key.length + value.length) * 2;
