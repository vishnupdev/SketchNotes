"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { isMethod, type Method } from "@/lib/Api/guard";
import type { ApiRequest, ApiResult, BodyKind, HeaderRow } from "@/lib/Api/request";

const SAVED_KEY = "sknotes:api:saved";
const DRAFT_KEY = "sknotes:api:draft";

const MAX_SAVED = 100;
const MAX_HISTORY = 25;

/** A history entry: what was sent, and the headline of what came back. */
export interface HistoryEntry {
  id: string;
  method: Method;
  url: string;
  status: number | null;
  timeMs: number | null;
  at: number;
}

const emptyHeader = (): HeaderRow => ({ id: uid(), name: "", value: "", on: true });

const blankRequest = (): ApiRequest => ({
  id: uid(),
  name: "",
  method: "GET",
  url: "",
  // One empty row to type into, rather than an "add a header" button to find first.
  headers: [emptyHeader()],
  bodyKind: "none",
  body: "",
});

interface ApiState {
  /** The request being edited. */
  draft: ApiRequest;
  /** Saved requests — the "collection". */
  saved: ApiRequest[];
  /** Recent sends, newest first. Not persisted — see below. */
  history: HistoryEntry[];
  result: ApiResult | null;
  sending: boolean;
  ready: boolean;

  setDraft: (patch: Partial<ApiRequest>) => void;
  setHeader: (id: string, patch: Partial<HeaderRow>) => void;
  addHeader: () => void;
  removeHeader: (id: string) => void;
  setBodyKind: (kind: BodyKind) => void;
  reset: () => void;

  save: () => void;
  load: (id: string) => void;
  removeSaved: (id: string) => void;

  setResult: (result: ApiResult | null) => void;
  setSending: (sending: boolean) => void;
  noteHistory: (entry: Omit<HistoryEntry, "id">) => void;
  clearHistory: () => void;

  hydrate: () => Promise<void>;
}

/**
 * The API client's state.
 *
 * One deliberate asymmetry: **saved requests persist, history does not.**
 *
 * A saved request is something you chose to keep, and you typed its name. History
 * is a trail of everything you sent — and what people send to an API includes
 * bearer tokens, session cookies and API keys, in the header rows and in the URL's
 * query string. Writing that trail to disk would turn a debugging tool into a
 * credential store that nobody asked for. It lives in memory for the session and
 * goes when the tab does.
 *
 * The draft persists because losing a half-built request to a refresh is the most
 * annoying thing an API client can do — but it is one request, the one on screen,
 * which the user can see and clear.
 */
export const useApiStore = create<ApiState>((set, get) => ({
  draft: blankRequest(),
  saved: [],
  history: [],
  result: null,
  sending: false,
  ready: false,

  setDraft: (patch) => {
    const draft = { ...get().draft, ...patch };
    set({ draft });
    void sSet(DRAFT_KEY, JSON.stringify(draft));
  },

  setHeader: (id, patch) => {
    const headers = get().draft.headers.map((h) => (h.id === id ? { ...h, ...patch } : h));
    get().setDraft({ headers });
  },

  addHeader: () => {
    const headers = [...get().draft.headers, emptyHeader()];
    get().setDraft({ headers });
  },

  removeHeader: (id) => {
    const headers = get().draft.headers.filter((h) => h.id !== id);
    // Never leave zero rows — there would be nothing to type into.
    get().setDraft({ headers: headers.length > 0 ? headers : [emptyHeader()] });
  },

  setBodyKind: (bodyKind) => get().setDraft({ bodyKind }),

  reset: () => {
    const draft = blankRequest();
    set({ draft, result: null });
    void sSet(DRAFT_KEY, JSON.stringify(draft));
  },

  save: () => {
    const draft = get().draft;
    if (!draft.url.trim()) return;

    const entry: ApiRequest = {
      ...draft,
      // A name is not required; the URL is a better fallback than "Untitled".
      name: draft.name.trim() || draft.url.trim().slice(0, 60),
    };

    // Re-saving the same request replaces it rather than accumulating copies.
    const existing = get().saved.findIndex((s) => s.id === entry.id);
    const saved = get().saved.slice();
    if (existing === -1) saved.unshift(entry);
    else saved[existing] = entry;

    const trimmed = saved.slice(0, MAX_SAVED);
    set({ saved: trimmed, draft: entry });
    void sSet(SAVED_KEY, JSON.stringify(trimmed));
  },

  load: (id) => {
    const found = get().saved.find((s) => s.id === id);
    if (!found) return;
    // A deep-ish copy of the header rows, so editing the draft does not mutate
    // the saved copy in place.
    const draft: ApiRequest = { ...found, headers: found.headers.map((h) => ({ ...h })) };
    set({ draft, result: null });
    void sSet(DRAFT_KEY, JSON.stringify(draft));
  },

  removeSaved: (id) => {
    const saved = get().saved.filter((s) => s.id !== id);
    set({ saved });
    void sSet(SAVED_KEY, JSON.stringify(saved));
  },

  setResult: (result) => set({ result }),
  setSending: (sending) => set({ sending }),

  noteHistory: (entry) =>
    set({ history: [{ ...entry, id: uid() }, ...get().history].slice(0, MAX_HISTORY) }),

  clearHistory: () => set({ history: [] }),

  hydrate: async () => {
    const [rawSaved, rawDraft] = await Promise.all([sGet(SAVED_KEY), sGet(DRAFT_KEY)]);

    let saved: ApiRequest[] = [];
    try {
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved) as unknown;
        if (Array.isArray(parsed)) saved = parsed.filter(isRequest).slice(0, MAX_SAVED);
      }
    } catch {
      /* a corrupt collection reads as empty rather than throwing on mount */
    }

    let draft = blankRequest();
    try {
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as unknown;
        if (isRequest(parsed)) draft = parsed;
      }
    } catch {
      /* defaults */
    }

    set({ saved, draft, ready: true });
  },
}));

/** Guard a stored request. Anything malformed is dropped rather than repaired. */
function isRequest(value: unknown): value is ApiRequest {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<ApiRequest>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    isMethod(r.method) &&
    typeof r.url === "string" &&
    Array.isArray(r.headers) &&
    r.headers.every(
      (h) =>
        h &&
        typeof h === "object" &&
        typeof (h as HeaderRow).id === "string" &&
        typeof (h as HeaderRow).name === "string" &&
        typeof (h as HeaderRow).value === "string",
    ) &&
    typeof r.body === "string"
  );
}
