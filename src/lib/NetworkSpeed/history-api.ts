/**
 * Persistence for the Network Speed test's recent-run history. A single
 * localStorage slot holds the most recent {@link SpeedRecord}s (newest first,
 * capped), mirroring the storage pattern used by the other apps.
 */

import { sGet, sSet } from "@/lib/storage";
import type { ConnectionInfo, SpeedRecord } from "./types";

const KEY = "sknotes:netspeed:history";
/** How many past runs to keep. */
export const HISTORY_LIMIT = 10;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function normalizeConnection(raw: unknown): ConnectionInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  return {
    effectiveType: typeof c.effectiveType === "string" ? c.effectiveType : null,
    downlink: isNum(c.downlink) ? c.downlink : null,
    rtt: isNum(c.rtt) ? c.rtt : null,
    saveData: Boolean(c.saveData),
    online: c.online == null ? true : Boolean(c.online),
  };
}

function normalize(raw: unknown): SpeedRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): SpeedRecord | null => {
      if (!r || typeof r !== "object") return null;
      const t = r as Record<string, unknown>;
      if (typeof t.id !== "string" || !isNum(t.at)) return null;
      return {
        id: t.id,
        at: t.at,
        ping: isNum(t.ping) ? t.ping : 0,
        jitter: isNum(t.jitter) ? t.jitter : 0,
        download: isNum(t.download) ? t.download : 0,
        upload: isNum(t.upload) ? t.upload : 0,
        connection: normalizeConnection(t.connection),
      };
    })
    .filter((r): r is SpeedRecord => r !== null)
    .slice(0, HISTORY_LIMIT);
}

export async function loadHistory(): Promise<SpeedRecord[]> {
  try {
    const raw = await sGet(KEY);
    return raw ? normalize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: SpeedRecord[]): void {
  void sSet(KEY, JSON.stringify(records.slice(0, HISTORY_LIMIT)));
}
