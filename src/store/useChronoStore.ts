"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

const PREFS_KEY = "sknotes:chrono:prefs";

export type ChronoTool = "cron" | "stamp" | "duration";

export const CHRONO_TOOLS: ChronoTool[] = ["cron", "stamp", "duration"];

const isTool = (v: unknown): v is ChronoTool => CHRONO_TOOLS.includes(v as ChronoTool);

interface StoredPrefs {
  tool?: string;
  cron?: string;
  stamp?: string;
  duration?: string;
  zone?: string;
}

interface ChronoState {
  tool: ChronoTool;
  /** The cron expression being explained. */
  cron: string;
  /** The timestamp being read. Empty means "now", which ticks. */
  stamp: string;
  /** The duration being measured. */
  duration: string;
  /** A second time zone to show a timestamp in, or "" for none. */
  zone: string;

  setTool: (tool: ChronoTool) => void;
  setCron: (cron: string) => void;
  setStamp: (stamp: string) => void;
  setDuration: (duration: string) => void;
  setZone: (zone: string) => void;
  hydrate: () => Promise<void>;
}

/**
 * Chrono's state — three independent inputs, one per tool.
 *
 * Persisted because all three are the kind of value you come back to: the cron
 * line you are debugging, the timestamp out of the log you are reading, the
 * duration you are converting. Losing them to an app switch would make the app
 * feel like a website rather than a tool.
 */
export const useChronoStore = create<ChronoState>((set, get) => ({
  tool: "cron",
  cron: "*/15 9-17 * * 1-5",
  stamp: "",
  duration: "1h 20m",
  zone: "",

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },
  setCron: (cron) => {
    set({ cron: cron.slice(0, 200) });
    void persist(get());
  },
  setStamp: (stamp) => {
    set({ stamp: stamp.slice(0, 120) });
    void persist(get());
  },
  setDuration: (duration) => {
    set({ duration: duration.slice(0, 120) });
    void persist(get());
  },
  setZone: (zone) => {
    set({ zone });
    void persist(get());
  },

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as StoredPrefs;
      set({
        tool: isTool(p.tool) ? p.tool : "cron",
        cron: typeof p.cron === "string" ? p.cron.slice(0, 200) : get().cron,
        stamp: typeof p.stamp === "string" ? p.stamp.slice(0, 120) : "",
        duration: typeof p.duration === "string" ? p.duration.slice(0, 120) : get().duration,
        zone: typeof p.zone === "string" ? p.zone : "",
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },
}));

const persist = (s: ChronoState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: s.tool,
      cron: s.cron,
      stamp: s.stamp,
      duration: s.duration,
      zone: s.zone,
    } satisfies StoredPrefs),
  );
