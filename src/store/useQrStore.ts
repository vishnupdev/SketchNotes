"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { readPayload } from "@/lib/qr/payload";
import { QR_KINDS, type QrEcc, type QrEntry, type QrKind } from "@/lib/qr/types";
import { uid } from "@/lib/utils";

const HISTORY_KEY = "sknotes:qr:history";
const PREFS_KEY = "sknotes:qr:prefs";

/** Recent codes worth keeping, not a log — a phone's scan history is short. */
const MAX_HISTORY = 40;

export type QrTab = "scan" | "create" | "history";

interface QrPrefs {
  ecc: QrEcc;
  size: number;
  kind: QrKind;
}

const DEFAULT_PREFS: QrPrefs = { ecc: "M", size: 320, kind: "text" };

interface QrState extends QrPrefs {
  tab: QrTab;
  history: QrEntry[];

  setTab: (tab: QrTab) => void;
  setEcc: (ecc: QrEcc) => void;
  setSize: (size: number) => void;
  setKind: (kind: QrKind) => void;
  /** Record a code that was read or made. Same text twice in a row is one entry. */
  remember: (text: string, origin: QrEntry["origin"]) => void;
  forget: (id: string) => void;
  clearHistory: () => void;
  /** Adopt persisted history and preferences after mount (avoids SSR mismatch). */
  hydrate: () => void;
}

/** Shape-check one stored entry; anything malformed is dropped, not repaired. */
function parseEntry(raw: unknown): QrEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<QrEntry>;
  if (typeof e.id !== "string" || typeof e.text !== "string" || typeof e.ts !== "number") {
    return null;
  }
  const kind = QR_KINDS.includes(e.kind as QrKind) ? (e.kind as QrKind) : "text";
  return {
    id: e.id,
    text: e.text,
    kind,
    ts: e.ts,
    origin: e.origin === "created" ? "created" : "scanned",
  };
}

/**
 * QR tool state: what has been scanned or made on this device, and the couple of
 * choices worth remembering between visits.
 *
 * History is local like everything else in the workspace — a scanned Wi-Fi
 * password is exactly the sort of thing that must never leave the device — and
 * can be cleared from the app or from Settings → Data.
 */
export const useQrStore = create<QrState>((set, get) => ({
  ...DEFAULT_PREFS,
  tab: "scan",
  history: [],

  setTab: (tab) => set({ tab }),
  setEcc: (ecc) => {
    set({ ecc });
    persistPrefs(get());
  },
  setSize: (size) => {
    set({ size: Math.max(120, Math.min(1024, Math.round(size))) });
    persistPrefs(get());
  },
  setKind: (kind) => {
    set({ kind });
    persistPrefs(get());
  },

  remember: (text, origin) => {
    const value = text.trim();
    if (!value) return;
    const history = get().history;
    // The scanner sees the same code many times a second; only a change counts.
    if (history[0]?.text === value && history[0]?.origin === origin) return;
    const entry: QrEntry = {
      id: uid(),
      text: value,
      kind: readPayload(value).kind,
      ts: Date.now(),
      origin,
    };
    const next = [entry, ...history.filter((e) => e.text !== value)].slice(0, MAX_HISTORY);
    set({ history: next });
    void sSet(HISTORY_KEY, JSON.stringify(next));
  },

  forget: (id) => {
    const next = get().history.filter((e) => e.id !== id);
    set({ history: next });
    void sSet(HISTORY_KEY, JSON.stringify(next));
  },

  clearHistory: () => {
    set({ history: [] });
    void sSet(HISTORY_KEY, "[]");
  },

  hydrate: async () => {
    const [rawHistory, rawPrefs] = await Promise.all([sGet(HISTORY_KEY), sGet(PREFS_KEY)]);
    if (rawHistory) {
      try {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          set({
            history: parsed
              .map(parseEntry)
              .filter((e): e is QrEntry => e !== null)
              .slice(0, MAX_HISTORY),
          });
        }
      } catch {
        /* corrupt value — start with an empty history */
      }
    }
    if (rawPrefs) {
      try {
        const p = JSON.parse(rawPrefs) as Partial<QrPrefs>;
        set({
          ecc: p.ecc && ["L", "M", "Q", "H"].includes(p.ecc) ? p.ecc : DEFAULT_PREFS.ecc,
          size:
            typeof p.size === "number" && p.size >= 120 && p.size <= 1024
              ? p.size
              : DEFAULT_PREFS.size,
          kind: QR_KINDS.includes(p.kind as QrKind) ? (p.kind as QrKind) : DEFAULT_PREFS.kind,
        });
      } catch {
        /* corrupt value — keep the defaults */
      }
    }
  },
}));

function persistPrefs(s: QrState) {
  const prefs: QrPrefs = { ecc: s.ecc, size: s.size, kind: s.kind };
  void sSet(PREFS_KEY, JSON.stringify(prefs));
}
