"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";

const MEMOS_KEY = "sknotes:voice:memos";
const PREFS_KEY = "sknotes:voice:prefs";

/**
 * Caps.
 *
 * Audio is kept as a base64 data URL in the workspace's key/value store (see
 * `lib/Voice/recorder.ts`), so the library's size is a real constraint rather
 * than a theoretical one. Thirty minutes of 32 kbps mono is roughly 7 MB of audio,
 * about 9.5 MB base64 — comfortable for IndexedDB, and enough for the app's
 * purpose. Past the cap the oldest memo with audio has its audio dropped and its
 * transcript kept, which is the right thing to lose first.
 */
export const MAX_MEMO_MS = 10 * 60 * 1000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_MEMOS = 300;

export interface Memo {
  id: string;
  title: string;
  /** A `data:` URL, or null when the audio was dropped to stay inside the cap. */
  audio: string | null;
  mimeType: string;
  durationMs: number;
  /** Transcribed text, or "" when transcription was off or unavailable. */
  transcript: string;
  createdAt: number;
}

interface StoredPrefs {
  /** Whether to transcribe while recording. Off by default — see the app. */
  transcribe?: boolean;
  language?: string;
}

interface VoiceState {
  memos: Memo[];
  query: string;
  transcribe: boolean;
  language: string;
  ready: boolean;

  setQuery: (query: string) => void;
  setTranscribe: (on: boolean) => void;
  setLanguage: (language: string) => void;
  /** Save a finished recording. Returns the new memo's id. */
  save: (memo: Omit<Memo, "id" | "createdAt">) => string;
  rename: (id: string, title: string) => void;
  setTranscript: (id: string, transcript: string) => void;
  remove: (id: string) => void;
  /** Drop just the audio, keeping the transcript — to reclaim space. */
  dropAudio: (id: string) => void;
  hydrate: () => Promise<void>;
}

/**
 * The memo library.
 *
 * `trim` is the part worth reading: because audio is stored inline, adding a memo
 * can push the library past what is reasonable to keep. Rather than refusing the
 * save — losing the recording the user just made — it frees space from the oldest
 * memos by dropping *their audio only*. The transcript is what makes an old memo
 * findable, and it costs almost nothing to keep.
 */
export const useVoiceStore = create<VoiceState>((set, get) => ({
  memos: [],
  query: "",
  transcribe: false,
  language: "en-US",
  ready: false,

  setQuery: (query) => set({ query: query.slice(0, 120) }),

  setTranscribe: (transcribe) => {
    set({ transcribe });
    void persistPrefs(get());
  },

  setLanguage: (language) => {
    set({ language });
    void persistPrefs(get());
  },

  save: (draft) => {
    const memo: Memo = {
      ...draft,
      id: uid(),
      createdAt: Date.now(),
      title: draft.title.trim().slice(0, 120),
      transcript: draft.transcript.slice(0, 20_000),
    };
    const memos = trim([memo, ...get().memos].slice(0, MAX_MEMOS));
    set({ memos });
    void persistMemos(memos);
    return memo.id;
  },

  rename: (id, title) => {
    const memos = get().memos.map((m) =>
      m.id === id ? { ...m, title: title.slice(0, 120) } : m,
    );
    set({ memos });
    void persistMemos(memos);
  },

  setTranscript: (id, transcript) => {
    const memos = get().memos.map((m) =>
      m.id === id ? { ...m, transcript: transcript.slice(0, 20_000) } : m,
    );
    set({ memos });
    void persistMemos(memos);
  },

  remove: (id) => {
    const memos = get().memos.filter((m) => m.id !== id);
    set({ memos });
    void persistMemos(memos);
  },

  dropAudio: (id) => {
    const memos = get().memos.map((m) => (m.id === id ? { ...m, audio: null } : m));
    set({ memos });
    void persistMemos(memos);
  },

  hydrate: async () => {
    const [rawMemos, rawPrefs] = await Promise.all([sGet(MEMOS_KEY), sGet(PREFS_KEY)]);

    let memos: Memo[] = [];
    try {
      if (rawMemos) {
        const parsed = JSON.parse(rawMemos) as unknown;
        if (Array.isArray(parsed)) {
          memos = parsed.filter(isMemo).slice(0, MAX_MEMOS).sort((a, b) => b.createdAt - a.createdAt);
        }
      }
    } catch {
      /* a corrupt library reads as empty rather than throwing on mount */
    }

    let prefs: StoredPrefs = {};
    try {
      if (rawPrefs) prefs = JSON.parse(rawPrefs) as StoredPrefs;
    } catch {
      /* defaults */
    }

    set({
      memos,
      ready: true,
      // Off unless explicitly turned on: transcription sends audio to the
      // browser's speech service, which nothing else in this workspace does.
      transcribe: prefs.transcribe === true,
      language: typeof prefs.language === "string" ? prefs.language : "en-US",
    });
  },
}));

/** Free space by dropping audio from the oldest memos, newest kept longest. */
function trim(memos: Memo[]): Memo[] {
  let bytes = memos.reduce((n, m) => n + (m.audio?.length ?? 0), 0);
  if (bytes <= MAX_AUDIO_BYTES) return memos;

  const out = memos.slice();
  // Oldest first, which is the end of the array.
  for (let i = out.length - 1; i >= 0 && bytes > MAX_AUDIO_BYTES; i--) {
    const audio = out[i].audio;
    if (!audio) continue;
    bytes -= audio.length;
    out[i] = { ...out[i], audio: null };
  }
  return out;
}

function isMemo(value: unknown): value is Memo {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<Memo>;
  return (
    typeof m.id === "string" &&
    typeof m.title === "string" &&
    (typeof m.audio === "string" || m.audio === null) &&
    typeof m.durationMs === "number" &&
    typeof m.transcript === "string" &&
    typeof m.createdAt === "number"
  );
}

const persistMemos = (memos: Memo[]): Promise<void> =>
  sSet(MEMOS_KEY, JSON.stringify(memos));

const persistPrefs = (s: VoiceState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({ transcribe: s.transcribe, language: s.language } satisfies StoredPrefs),
  );

/** Search titles and transcripts — the transcript is what makes audio findable. */
export function searchMemos(memos: Memo[], query: string): Memo[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return memos;
  return memos.filter((m) => {
    const haystack = `${m.title}\n${m.transcript}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/** Total bytes of stored audio, and how much of the cap that is. */
export function audioUsage(memos: Memo[]): { bytes: number; share: number } {
  const bytes = memos.reduce((n, m) => n + (m.audio?.length ?? 0), 0);
  return { bytes, share: Math.min(1, bytes / MAX_AUDIO_BYTES) };
}
