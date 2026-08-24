import { sEntries } from "@/lib/storage";
import { classifyKey } from "@/lib/storage-keys";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * What there is to send, grouped the way the user thinks about it: per app, plus
 * the workspace's own settings.
 *
 * Sending everything is rarely what someone wants over a camera link — a sketch
 * with photos in it can be megabytes, while a task list is a few kilobytes — so
 * the picker shows sizes and lets the choice be narrowed. The estimate is
 * honest: it is the byte length of the JSON, before compression, which is what
 * decides how many QR frames there will be.
 */

export interface SendGroup {
  /** The app the keys belong to, or null for the workspace settings. */
  app: AppId | null;
  keys: string[];
  bytes: number;
}

const byteLength = (text: string): number =>
  typeof TextEncoder !== "undefined" ? new TextEncoder().encode(text).length : text.length;

/** Everything on this device, grouped and sized, largest first. */
export async function readSendGroups(): Promise<{
  groups: SendGroup[];
  entries: Record<string, string>;
}> {
  const entries = await sEntries();
  const map = new Map<AppId | null, SendGroup>();

  for (const [key, value] of Object.entries(entries)) {
    const cls = classifyKey(key);
    if (cls.kind === "foreign") continue;
    const app = cls.kind === "app" ? cls.app : null;
    const group = map.get(app) ?? { app, keys: [], bytes: 0 };
    group.keys.push(key);
    group.bytes += byteLength(key) + byteLength(value);
    map.set(app, group);
  }

  return {
    groups: [...map.values()].sort((a, b) => b.bytes - a.bytes),
    entries,
  };
}

/** Narrow a full entry map down to the chosen groups. */
export function pickEntries(
  entries: Record<string, string>,
  groups: SendGroup[],
  chosen: ReadonlySet<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of groups) {
    if (!chosen.has(groupId(group))) continue;
    for (const key of group.keys) {
      const value = entries[key];
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

/** Stable id for a group, since `null` can't be a key in the chosen set. */
export const groupId = (group: SendGroup): string => group.app ?? "settings";
