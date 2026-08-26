"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { guessLanguage, LANGUAGE_BY_ID } from "@/lib/Snippets/highlight";
import {
  MAX_BODY,
  MAX_TITLE,
  parseTags,
  type Snippet,
  type SnippetSort,
} from "@/lib/Snippets/types";

const SNIPPETS_KEY = "sknotes:snippets:items";
const PREFS_KEY = "sknotes:snippets:prefs";

/** Enough for a real library, short of the point where a single write is slow. */
const MAX_SNIPPETS = 500;

interface SnippetsState {
  snippets: Snippet[];
  /** The search box. */
  query: string;
  sort: SnippetSort;
  /** Id of the snippet open in the editor, or null for the list. */
  editingId: string | null;
  /** True once the saved library has been read, so the list can say "empty". */
  ready: boolean;

  setQuery: (query: string) => void;
  setSort: (sort: SnippetSort) => void;
  /** Create a snippet and open it. Returns the new id. */
  create: (seed?: Partial<Pick<Snippet, "title" | "body" | "language">>) => string;
  update: (id: string, patch: Partial<Omit<Snippet, "id" | "createdAt">>) => void;
  /** Set the tags from a typed string. */
  setTags: (id: string, raw: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  /** Record that a snippet was copied, for the "most used" sort. */
  noteCopy: (id: string) => void;
  edit: (id: string | null) => void;
  hydrate: () => Promise<void>;
}

const SORTS: SnippetSort[] = ["updated", "created", "title", "copies"];

/**
 * The snippet library.
 *
 * Everything lives in one stored array rather than a key per snippet. The library
 * is small (hundreds of records, tens of kilobytes), it is always read whole to
 * render the list, and one key means one write — which also means the backup and
 * clone features get the whole library without having to enumerate keys.
 *
 * `updatedAt` is set by the store on every mutation, never by the caller. It is
 * what the default sort relies on, and a component that forgot to set it would
 * quietly leave an edited snippet at the bottom of the list.
 */
export const useSnippetsStore = create<SnippetsState>((set, get) => ({
  snippets: [],
  query: "",
  sort: "updated",
  editingId: null,
  ready: false,

  setQuery: (query) => set({ query: query.slice(0, 120) }),

  setSort: (sort) => {
    set({ sort });
    void sSet(PREFS_KEY, JSON.stringify({ sort }));
  },

  create: (seed) => {
    const now = Date.now();
    const body = (seed?.body ?? "").slice(0, MAX_BODY);
    const snippet: Snippet = {
      id: uid(),
      title: (seed?.title ?? "").slice(0, MAX_TITLE),
      // A pasted body is worth guessing at; an empty one gets the safe default.
      language:
        seed?.language && LANGUAGE_BY_ID[seed.language]
          ? seed.language
          : body
            ? guessLanguage(body)
            : "typescript",
      body,
      tags: [],
      createdAt: now,
      updatedAt: now,
      copies: 0,
    };

    const snippets = [snippet, ...get().snippets].slice(0, MAX_SNIPPETS);
    set({ snippets, editingId: snippet.id });
    void persist(snippets);
    return snippet.id;
  },

  update: (id, patch) => {
    const snippets = get().snippets.map((s) =>
      s.id === id
        ? {
            ...s,
            ...patch,
            title: (patch.title ?? s.title).slice(0, MAX_TITLE),
            body: (patch.body ?? s.body).slice(0, MAX_BODY),
            language:
              patch.language && LANGUAGE_BY_ID[patch.language] ? patch.language : s.language,
            updatedAt: Date.now(),
          }
        : s,
    );
    set({ snippets });
    void persist(snippets);
  },

  setTags: (id, raw) => {
    const tags = parseTags(raw);
    const snippets = get().snippets.map((s) =>
      s.id === id ? { ...s, tags, updatedAt: Date.now() } : s,
    );
    set({ snippets });
    void persist(snippets);
  },

  remove: (id) => {
    const snippets = get().snippets.filter((s) => s.id !== id);
    set({ snippets, editingId: get().editingId === id ? null : get().editingId });
    void persist(snippets);
  },

  duplicate: (id) => {
    const source = get().snippets.find((s) => s.id === id);
    if (!source) return;
    const now = Date.now();
    const copy: Snippet = {
      ...source,
      id: uid(),
      title: `${source.title || "Untitled"} copy`.slice(0, MAX_TITLE),
      createdAt: now,
      updatedAt: now,
      copies: 0,
    };
    const snippets = [copy, ...get().snippets].slice(0, MAX_SNIPPETS);
    set({ snippets, editingId: copy.id });
    void persist(snippets);
  },

  noteCopy: (id) => {
    // Deliberately does *not* touch `updatedAt`: copying is not editing, and
    // bumping it would reshuffle the list every time someone used it.
    const snippets = get().snippets.map((s) =>
      s.id === id ? { ...s, copies: s.copies + 1 } : s,
    );
    set({ snippets });
    void persist(snippets);
  },

  edit: (editingId) => set({ editingId }),

  hydrate: async () => {
    const [rawItems, rawPrefs] = await Promise.all([sGet(SNIPPETS_KEY), sGet(PREFS_KEY)]);

    let snippets: Snippet[] = [];
    try {
      if (rawItems) {
        const parsed = JSON.parse(rawItems) as unknown;
        if (Array.isArray(parsed)) {
          snippets = parsed
            .filter(isSnippet)
            .slice(0, MAX_SNIPPETS)
            // `copies` is not part of the guard, because a library written before
            // it existed is still perfectly good. Defaulting it here is what stops
            // `copies + 1` from becoming NaN on the first copy of such a record.
            .map((s) => ({ ...s, copies: Number.isFinite(s.copies) ? s.copies : 0 }));
        }
      }
    } catch {
      /* a corrupt library reads as empty rather than throwing on mount */
    }

    let sort: SnippetSort = "updated";
    try {
      if (rawPrefs) {
        const p = JSON.parse(rawPrefs) as { sort?: string };
        if (SORTS.includes(p.sort as SnippetSort)) sort = p.sort as SnippetSort;
      }
    } catch {
      /* defaults */
    }

    set({ snippets, sort, ready: true });
  },
}));

/** Guard a stored record: anything missing its essentials is dropped. */
function isSnippet(value: unknown): value is Snippet {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Snippet>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.body === "string" &&
    typeof s.language === "string" &&
    Array.isArray(s.tags) &&
    typeof s.createdAt === "number" &&
    typeof s.updatedAt === "number"
  );
}

const persist = (snippets: Snippet[]): Promise<void> =>
  sSet(SNIPPETS_KEY, JSON.stringify(snippets));

export { MAX_SNIPPETS };
