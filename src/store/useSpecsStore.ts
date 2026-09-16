"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { DEFAULT_REGION, regionById } from "@/lib/Specs/stores";
import { BROWSE_KINDS, kindById, sourceById } from "@/lib/Specs/catalog";
import type { OwnRating, ProductHit } from "@/lib/Specs/types";

const RECENT_KEY = "sknotes:specs:recent";
const RATINGS_KEY = "sknotes:specs:ratings";
const COMPARE_KEY = "sknotes:specs:compare";
const REGION_KEY = "sknotes:specs:region";
const BROWSE_KEY = "sknotes:specs:browse";
const SHORTLIST_KEY = "sknotes:specs:shortlist";

export type SpecsTab = "find" | "sheet" | "prices" | "similar" | "rating";

export const SPECS_TABS: SpecsTab[] = ["find", "sheet", "prices", "similar", "rating"];

/** How many products a comparison holds before it stops reading as a table. */
export const MAX_COMPARE = 4;

/** Recently opened sheets kept for the launcher list. */
const MAX_RECENT = 24;

interface SpecsState {
  tab: SpecsTab;
  /** What is in the search box — not what was searched for. */
  query: string;
  /** The submitted term the results belong to. */
  term: string;
  /** Article title of the sheet on screen, or null before one is opened. */
  openTitle: string | null;

  /** Sheets opened before, most recent first. Persisted. */
  recent: ProductHit[];
  /** Titles being compared against the open sheet. Persisted. */
  compare: string[];
  /** The user's own ratings, keyed by article title. Persisted. */
  ratings: Record<string, OwnRating>;
  /** Which country's shops the Prices tab lists. Persisted. */
  region: string;
  /** Products deliberately kept while deciding. Persisted. */
  shortlist: ProductHit[];
  /** Which kind of product the Find tab is browsing. Persisted. */
  browseKind: string;
  /** Which maker or list within that kind. Persisted. */
  browseSource: string;

  setTab: (tab: SpecsTab) => void;
  setQuery: (query: string) => void;
  /** Run a search: commits the typed term and shows the results. */
  submitQuery: (query: string) => void;
  /** Open a product's sheet, remembering it and clearing the old comparison. */
  openProduct: (hit: ProductHit) => void;

  toggleCompare: (title: string) => void;
  clearCompare: () => void;

  setRegion: (region: string) => void;
  /** Browse a kind of product. Moving kind resets to that kind's first list. */
  setBrowseKind: (kind: string) => void;
  setBrowseSource: (source: string) => void;

  /** Add a product to the shortlist, or take it off if it is already on. */
  toggleShortlist: (hit: ProductHit) => void;
  clearShortlist: () => void;

  rate: (rating: Omit<OwnRating, "at">) => void;
  clearRating: (title: string) => void;

  forget: (title: string) => void;
  /** Merge the persisted lists in after mount (avoids an SSR mismatch). */
  hydrate: () => Promise<void>;
}

/** Shrink a hit to what the recents list actually draws. */
const asRecent = (hit: ProductHit): ProductHit => ({
  title: hit.title,
  name: hit.name,
  description: hit.description,
  image: hit.image,
});

/**
 * Coerce an untrusted stored value into a usable list of products.
 *
 * The cap is a parameter rather than a constant because the two lists that use
 * this have opposite policies: recents are a trail the app keeps for you and
 * may trim, while a shortlist is a decision you made — trimming it silently
 * would be the app throwing away something you chose to keep.
 */
function readHits(raw: unknown, limit = Infinity): ProductHit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is ProductHit => !!v && typeof v === "object" && typeof (v as ProductHit).title === "string")
    .map((v) => ({
      title: v.title,
      name: typeof v.name === "string" ? v.name : v.title,
      description: typeof v.description === "string" ? v.description : "",
      image: typeof v.image === "string" ? v.image : null,
    }))
    .slice(0, limit);
}

/** Coerce an untrusted stored value into usable ratings. */
function readRatings(raw: unknown): Record<string, OwnRating> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, OwnRating> = {};
  for (const [title, value] of Object.entries(raw as Record<string, unknown>)) {
    const r = value as Partial<OwnRating>;
    const stars = Number(r?.stars);
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) continue;
    out[title] = {
      title,
      name: typeof r.name === "string" ? r.name : title,
      stars: Math.round(stars),
      note: typeof r.note === "string" ? r.note.slice(0, 600) : "",
      at: typeof r.at === "string" ? r.at : new Date().toISOString(),
    };
  }
  return out;
}

export const useSpecsStore = create<SpecsState>((set, get) => ({
  tab: "find",
  query: "",
  term: "",
  openTitle: null,
  recent: [],
  compare: [],
  ratings: {},
  region: DEFAULT_REGION,
  shortlist: [],
  browseKind: BROWSE_KINDS[0].id,
  browseSource: BROWSE_KINDS[0].sources[0].id,

  setTab: (tab) => set({ tab }),
  setQuery: (query) => set({ query: query.slice(0, 120) }),

  // The typed text and the searched term are separate on purpose: results stay
  // on screen while the box is being edited, so refining a search never blanks
  // the list you were reading.
  submitQuery: (query) => {
    const term = query.trim().slice(0, 120);
    if (!term) return;
    set({ query: term, term, tab: "find" });
  },

  openProduct: (hit) => {
    const recent = [asRecent(hit), ...get().recent.filter((r) => r.title !== hit.title)].slice(0, MAX_RECENT);
    set({
      openTitle: hit.title,
      tab: "sheet",
      recent,
      // A comparison belongs to the sheet it was built against. Carrying one
      // across to a different product would put a phone's battery column beside
      // a motorcycle's, which is a table nobody asked for.
      compare: [],
    });
    void sSet(RECENT_KEY, JSON.stringify(recent));
    void sSet(COMPARE_KEY, JSON.stringify([]));
  },

  toggleCompare: (title) => {
    const current = get().compare;
    const compare = current.includes(title)
      ? current.filter((t) => t !== title)
      : [...current, title].slice(0, MAX_COMPARE);
    set({ compare });
    void sSet(COMPARE_KEY, JSON.stringify(compare));
  },
  clearCompare: () => {
    set({ compare: [] });
    void sSet(COMPARE_KEY, JSON.stringify([]));
  },

  // Coerced through `regionById`, so a stored id from a region that has since
  // been removed lands on the default rather than on an empty shop list.
  setRegion: (region) => {
    const id = regionById(region).id;
    set({ region: id });
    void sSet(REGION_KEY, id);
  },

  // Changing kind drops the maker with it: "Samsung" means a different list
  // under Phones than under Laptops, and most makers exist under only one kind.
  // Landing on that kind's first list is the only sane answer.
  setBrowseKind: (kind) => {
    const next = kindById(kind);
    const browse = { browseKind: next.id, browseSource: next.sources[0].id };
    set(browse);
    void sSet(BROWSE_KEY, JSON.stringify(browse));
  },
  setBrowseSource: (source) => {
    const kind = kindById(get().browseKind);
    const browse = { browseKind: kind.id, browseSource: sourceById(kind, source).id };
    set(browse);
    void sSet(BROWSE_KEY, JSON.stringify(browse));
  },

  // Unbounded on purpose, unlike `recent`. Recents are a trail the app keeps
  // for you and may trim; a shortlist is a decision you made, and silently
  // dropping the oldest thing you were considering would be the app losing your
  // work.
  toggleShortlist: (hit) => {
    const current = get().shortlist;
    const shortlist = current.some((s) => s.title === hit.title)
      ? current.filter((s) => s.title !== hit.title)
      : [...current, asRecent(hit)];
    set({ shortlist });
    void sSet(SHORTLIST_KEY, JSON.stringify(shortlist));
  },
  clearShortlist: () => {
    set({ shortlist: [] });
    void sSet(SHORTLIST_KEY, JSON.stringify([]));
  },

  rate: ({ title, name, stars, note }) => {
    const ratings = {
      ...get().ratings,
      [title]: {
        title,
        name,
        stars: Math.min(5, Math.max(1, Math.round(stars))),
        note: note.slice(0, 600),
        at: new Date().toISOString(),
      },
    };
    set({ ratings });
    void sSet(RATINGS_KEY, JSON.stringify(ratings));
  },
  clearRating: (title) => {
    const ratings = { ...get().ratings };
    delete ratings[title];
    set({ ratings });
    void sSet(RATINGS_KEY, JSON.stringify(ratings));
  },

  forget: (title) => {
    const recent = get().recent.filter((r) => r.title !== title);
    set({ recent });
    void sSet(RECENT_KEY, JSON.stringify(recent));
  },

  hydrate: async () => {
    const [rawRecent, rawRatings, rawCompare, rawRegion, rawBrowse, rawShortlist] = await Promise.all([
      sGet(RECENT_KEY),
      sGet(RATINGS_KEY),
      sGet(COMPARE_KEY),
      sGet(REGION_KEY),
      sGet(BROWSE_KEY),
      sGet(SHORTLIST_KEY),
    ]);

    const patch: Partial<SpecsState> = {};

    if (rawRecent) {
      try {
        patch.recent = readHits(JSON.parse(rawRecent), MAX_RECENT);
      } catch {
        /* corrupt value — start with an empty list */
      }
    }
    if (rawRatings) {
      try {
        patch.ratings = readRatings(JSON.parse(rawRatings));
      } catch {
        /* corrupt value — start with no ratings */
      }
    }
    if (rawCompare) {
      try {
        const parsed: unknown = JSON.parse(rawCompare);
        if (Array.isArray(parsed)) {
          patch.compare = parsed.filter((t): t is string => typeof t === "string").slice(0, MAX_COMPARE);
        }
      } catch {
        /* corrupt value — start with nothing selected */
      }
    }

    // Stored bare rather than as JSON — it is one short id, and coercing it
    // through `regionById` makes an unrecognised value harmless either way.
    if (rawRegion) patch.region = regionById(rawRegion).id;

    if (rawShortlist) {
      try {
        // Same coercion as recents, but uncapped: see readHits.
        patch.shortlist = readHits(JSON.parse(rawShortlist));
      } catch {
        /* corrupt value — start with an empty shortlist */
      }
    }

    if (rawBrowse) {
      try {
        const saved = JSON.parse(rawBrowse) as { browseKind?: string; browseSource?: string };
        // Resolved as a pair: a maker id is only meaningful inside its kind, so
        // a stored source from a kind that has since been re-shaped has to fall
        // back to the current kind's first list, not to a dangling id.
        const kind = kindById(saved.browseKind ?? "");
        patch.browseKind = kind.id;
        patch.browseSource = sourceById(kind, saved.browseSource ?? "").id;
      } catch {
        /* corrupt value — keep the default kind and list */
      }
    }

    if (Object.keys(patch).length) set(patch);
  },
}));
