"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { guessDeviceLabel, DEVICE_KEY } from "@/lib/Clone/snapshot";
import type { CloneRoute } from "@/lib/Clone/types";
import { uid } from "@/lib/utils";

const HISTORY_KEY = "sknotes:clone:history";
const ROUTE_KEY = "sknotes:clone:route";

/** Enough to answer "did I already clone this device?", not an audit log. */
const MAX_HISTORY = 12;

/** One completed clone, from this device's point of view. */
export interface CloneRecord {
  id: string;
  ts: number;
  direction: "sent" | "received";
  route: CloneRoute;
  /** The other device's name, as it gave it. */
  other: string;
  /** Keys written (received) or sent. */
  keys: number;
  bytes: number;
  /** Received clones only: whether it replaced what was here. */
  replaced?: boolean;
}

interface CloneState {
  /** What this device calls itself. Travels inside every clone it sends. */
  device: string;
  /** How the two devices are joined — remembered, since it rarely changes. */
  route: CloneRoute;
  /**
   * Whether the network route may reach past the local network. Never
   * persisted: contacting a third-party STUN server is a decision to be made
   * each time, not a setting that quietly stays on.
   */
  wide: boolean;
  history: CloneRecord[];
  /** True once the persisted values have been merged in. */
  ready: boolean;

  setDevice: (name: string) => void;
  setRoute: (route: CloneRoute) => void;
  setWide: (wide: boolean) => void;
  record: (entry: Omit<CloneRecord, "id" | "ts">) => void;
  clearHistory: () => void;
  /** Adopt the persisted name, route and history after mount (avoids SSR mismatch). */
  hydrate: () => void;
}

const ROUTES: CloneRoute[] = ["cable", "network", "offline"];

/** Shape-check one stored record; anything malformed is dropped, not repaired. */
function parseRecord(raw: unknown): CloneRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CloneRecord>;
  if (typeof r.id !== "string" || typeof r.ts !== "number") return null;
  return {
    id: r.id,
    ts: r.ts,
    direction: r.direction === "sent" ? "sent" : "received",
    route: ROUTES.includes(r.route as CloneRoute) ? (r.route as CloneRoute) : "network",
    other: typeof r.other === "string" ? r.other : "Another device",
    keys: typeof r.keys === "number" ? r.keys : 0,
    bytes: typeof r.bytes === "number" ? r.bytes : 0,
    replaced: r.replaced === true,
  };
}

/**
 * What the Clone app remembers between visits: this device's name, the route
 * that usually applies, and the last few clones either way.
 *
 * Small on purpose. Everything about a clone *in flight* — the connection, the
 * frames, the progress, the plan — belongs to the panel doing it and dies with
 * it, which is what guarantees no link and no camera outlives the screen it was
 * started from. Only the three things a person would be annoyed to re-enter
 * live here.
 *
 * The device name matters more than it looks: it is the only thing telling the
 * receiving device where an arriving clone came from, and "Work laptop" versus
 * "Old phone" is the difference between confidently replacing a device's data
 * and guessing.
 */
export const useCloneStore = create<CloneState>((set, get) => ({
  // Empty until hydration so the server and the first client render agree; the
  // panels show the guess in the field's placeholder meanwhile.
  device: "",
  route: "network",
  wide: false,
  history: [],
  ready: false,

  setDevice: (name) => {
    const device = name.slice(0, 60);
    set({ device });
    void sSet(DEVICE_KEY, device.trim());
  },
  setRoute: (route) => {
    set({ route });
    void sSet(ROUTE_KEY, route);
  },
  setWide: (wide) => set({ wide }),

  record: (entry) => {
    const history = [{ ...entry, id: uid(), ts: Date.now() }, ...get().history].slice(
      0,
      MAX_HISTORY,
    );
    set({ history });
    void sSet(HISTORY_KEY, JSON.stringify(history));
  },
  clearHistory: () => {
    set({ history: [] });
    void sSet(HISTORY_KEY, "[]");
  },

  hydrate: async () => {
    const [device, route, history] = await Promise.all([
      sGet(DEVICE_KEY),
      sGet(ROUTE_KEY),
      sGet(HISTORY_KEY),
    ]);

    let records: CloneRecord[] = [];
    if (history) {
      try {
        const parsed: unknown = JSON.parse(history);
        records = Array.isArray(parsed)
          ? parsed.map(parseRecord).filter((r): r is CloneRecord => r !== null)
          : [];
      } catch {
        /* corrupt value — start with no history rather than refusing to load */
      }
    }

    set({
      device: device?.trim() || guessDeviceLabel(),
      route: ROUTES.includes(route as CloneRoute) ? (route as CloneRoute) : "network",
      history: records,
      ready: true,
    });
  },
}));
