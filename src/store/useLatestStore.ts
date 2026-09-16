"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { CATEGORIES, categoryById, feedYears } from "@/lib/Latest/categories";
import { productById } from "@/lib/Latest/catalog";
import type { CategoryId } from "@/lib/Latest/types";

const CATEGORY_KEY = "sknotes:latest:category";
const SAVED_KEY = "sknotes:latest:saved";
const BRAND_KEY = "sknotes:latest:brand";

export type LatestTab = "new" | "brands" | "sheet" | "saved";

export const LATEST_TABS: LatestTab[] = ["new", "brands", "sheet", "saved"];

/**
 * Latest Tech's client state.
 *
 * The one rule worth stating: **what is being looked at and what is saved are
 * separate concerns, and only the second is persisted as content.** The open
 * product is a session thing — reopening the app on a sheet you happened to be
 * reading last week is noise — while the saved list is a decision the user
 * made, and is kept. The chosen category and brand sit in between: they are
 * preferences rather than content, so they persist, but they are coerced back
 * to something valid on the way in, because an id from a category that has
 * since been renamed must not leave the app showing nothing.
 */
interface LatestState {
  tab: LatestTab;
  /** Which kind of product the New tab is showing. Persisted. */
  category: CategoryId;
  /** Which maker the Brands tab has open, or null for the directory. Persisted. */
  brandId: string | null;
  /** Which year of new listings the live half is showing, or null for all. */
  feedYear: number | null;
  /** The catalogue id of the sheet on screen, or null before one is opened. */
  openId: string | null;
  /** What is in the search box. Not persisted — a search is not a decision. */
  query: string;
  /** Catalogue ids the user chose to keep. Persisted. */
  saved: string[];

  setTab: (tab: LatestTab) => void;
  setCategory: (category: string) => void;
  setBrand: (brandId: string | null) => void;
  setFeedYear: (year: number | null) => void;
  setQuery: (query: string) => void;
  /** Open a product's sheet and move to it. */
  openProduct: (id: string) => void;
  /** Keep a product, or stop keeping it if it is already kept. */
  toggleSaved: (id: string) => void;
  clearSaved: () => void;
  /** Merge the persisted choices in after mount (avoids an SSR mismatch). */
  hydrate: () => Promise<void>;
}

/** Coerce an untrusted stored value into a category this build still has. */
const readCategory = (raw: unknown): CategoryId =>
  typeof raw === "string" ? categoryById(raw).id : CATEGORIES[0].id;

/**
 * Coerce an untrusted stored value into a list of catalogue ids.
 *
 * Ids that no longer resolve are dropped here rather than when the list is
 * drawn. A product can genuinely leave the catalogue — it is discontinued, or
 * its entry is renamed — and a saved list that keeps rendering a row for
 * something the app can no longer open is worse than one that quietly loses it.
 */
function readSaved(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || seen.has(value)) continue;
    if (!productById(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export const useLatestStore = create<LatestState>((set, get) => ({
  tab: "new",
  category: CATEGORIES[0].id,
  brandId: null,
  // The current year rather than "all": someone opening a "latest" app is
  // asking about now, and making them pick a year first would be asking them to
  // restate the question they arrived with.
  feedYear: feedYears()[1],
  openId: null,
  query: "",
  saved: [],

  setTab: (tab) => set({ tab }),

  setCategory: (category) => {
    const id = categoryById(category).id;
    set({ category: id });
    void sSet(CATEGORY_KEY, id);
  },

  setBrand: (brandId) => {
    set({ brandId });
    void sSet(BRAND_KEY, brandId ?? "");
  },

  setFeedYear: (feedYear) => set({ feedYear }),
  setQuery: (query) => set({ query: query.slice(0, 120) }),

  openProduct: (openId) => set({ openId, tab: "sheet" }),

  toggleSaved: (id) => {
    const current = get().saved;
    const saved = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    set({ saved });
    void sSet(SAVED_KEY, JSON.stringify(saved));
  },

  clearSaved: () => {
    set({ saved: [] });
    void sSet(SAVED_KEY, JSON.stringify([]));
  },

  hydrate: async () => {
    const [rawCategory, rawSaved, rawBrand] = await Promise.all([
      sGet(CATEGORY_KEY),
      sGet(SAVED_KEY),
      sGet(BRAND_KEY),
    ]);

    const patch: Partial<LatestState> = {};

    // Stored bare rather than as JSON — it is one short id, and coercing it
    // through `categoryById` makes an unrecognised value harmless either way.
    if (rawCategory) patch.category = readCategory(rawCategory);
    if (rawBrand) patch.brandId = rawBrand || null;

    if (rawSaved) {
      try {
        patch.saved = readSaved(JSON.parse(rawSaved));
      } catch {
        /* corrupt value — start with an empty list */
      }
    }

    if (Object.keys(patch).length) set(patch);
  },
}));
