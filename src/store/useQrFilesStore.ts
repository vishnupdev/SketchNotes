"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { CHUNK_CHOICES, type ChunkSize, type FileClass } from "@/lib/qr/file-frames";
import { QR_ECCS, type QrEcc } from "@/lib/qr/types";
import { uid } from "@/lib/utils";

const HISTORY_KEY = "sknotes:qrfiles:history";
const PREFS_KEY = "sknotes:qrfiles:prefs";

/** A log of what was converted, not of the files themselves — see below. */
const MAX_HISTORY = 30;

export const QRFILES_TABS = ["encode", "rebuild", "history"] as const;
export type QrFilesTab = (typeof QRFILES_TABS)[number];

interface QrFilesPrefs {
  /** Payload bytes per code — the density/legibility trade. */
  chunk: ChunkSize;
  ecc: QrEcc;
}

/**
 * "M" and 640, because these codes are as likely to be printed and scanned off
 * paper across a desk as read off a screen six inches away — which is the case
 * Handoff's frame player optimises for, and why it fixes level L instead.
 */
const DEFAULT_PREFS: QrFilesPrefs = { chunk: 640, ecc: "M" };

/**
 * One conversion, remembered.
 *
 * Deliberately metadata only: the file's *contents* are never written to
 * storage. A 3 MB video would blow the origin's quota on its own, and — more to
 * the point — this app's promise is that a file passes through it, not that it
 * accumulates a copy of everything anyone ever encoded.
 */
export interface QrFileEntry {
  id: string;
  name: string;
  mime: string;
  fileClass: FileClass;
  /** Size of the original file, in bytes. */
  size: number;
  /** How many codes it came to. */
  parts: number;
  origin: "encoded" | "rebuilt";
  ts: number;
}

interface QrFilesState extends QrFilesPrefs {
  tab: QrFilesTab;
  history: QrFileEntry[];

  setTab: (tab: QrFilesTab) => void;
  setChunk: (chunk: ChunkSize) => void;
  setEcc: (ecc: QrEcc) => void;
  /** Record a file that was turned into codes, or rebuilt from them. */
  remember: (entry: Omit<QrFileEntry, "id" | "ts">) => void;
  forget: (id: string) => void;
  clearHistory: () => void;
  /** Adopt persisted history and preferences after mount (avoids SSR mismatch). */
  hydrate: () => Promise<void>;
}

const FILE_CLASSES: FileClass[] = ["image", "document", "audio", "video", "file"];

/** Shape-check one stored entry; anything malformed is dropped, not repaired. */
function parseEntry(raw: unknown): QrFileEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<QrFileEntry>;
  if (typeof e.id !== "string" || typeof e.name !== "string" || typeof e.ts !== "number") {
    return null;
  }
  return {
    id: e.id,
    name: e.name,
    mime: typeof e.mime === "string" ? e.mime : "",
    fileClass: FILE_CLASSES.includes(e.fileClass as FileClass)
      ? (e.fileClass as FileClass)
      : "file",
    size: typeof e.size === "number" && e.size >= 0 ? e.size : 0,
    parts: typeof e.parts === "number" && e.parts > 0 ? e.parts : 1,
    origin: e.origin === "rebuilt" ? "rebuilt" : "encoded",
    ts: e.ts,
  };
}

/**
 * QR Files state: the two choices that change what the codes look like, and a
 * short record of what has passed through.
 */
export const useQrFilesStore = create<QrFilesState>((set, get) => ({
  ...DEFAULT_PREFS,
  tab: "encode",
  history: [],

  setTab: (tab) => set({ tab }),
  setChunk: (chunk) => {
    set({ chunk });
    persistPrefs(get());
  },
  setEcc: (ecc) => {
    set({ ecc });
    persistPrefs(get());
  },

  remember: (entry) => {
    const next = [{ ...entry, id: uid(), ts: Date.now() }, ...get().history].slice(0, MAX_HISTORY);
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
              .filter((e): e is QrFileEntry => e !== null)
              .slice(0, MAX_HISTORY),
          });
        }
      } catch {
        /* corrupt value — start with an empty history */
      }
    }
    if (rawPrefs) {
      try {
        const p = JSON.parse(rawPrefs) as Partial<QrFilesPrefs>;
        set({
          chunk: CHUNK_CHOICES.includes(p.chunk as ChunkSize)
            ? (p.chunk as ChunkSize)
            : DEFAULT_PREFS.chunk,
          ecc: QR_ECCS.includes(p.ecc as QrEcc) ? (p.ecc as QrEcc) : DEFAULT_PREFS.ecc,
        });
      } catch {
        /* corrupt value — keep the defaults */
      }
    }
  },
}));

function persistPrefs(s: QrFilesState) {
  const prefs: QrFilesPrefs = { chunk: s.chunk, ecc: s.ecc };
  void sSet(PREFS_KEY, JSON.stringify(prefs));
}
