"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { CATEGORY_BY_ID, UNIT_CATEGORIES } from "@/lib/Convert/units";
import { CURRENCY_BY_CODE, fetchRates, type RateTable } from "@/lib/Convert/rates";

const PREFS_KEY = "sknotes:convert:prefs";
const RATES_KEY = "sknotes:convert:rates";

export type ConvertTool = "units" | "currency";

export const CONVERT_TOOLS: ConvertTool[] = ["units", "currency"];

/** What the picker state looks like on disk. All fields optional — it is untrusted. */
interface StoredPrefs {
  tool?: string;
  category?: string;
  /** Remembered per category, so switching back restores the pair you had. */
  pairs?: Record<string, [string, string]>;
  amount?: string;
  currencyFrom?: string;
  currencyTo?: string;
}

interface ConvertState {
  tool: ConvertTool;
  category: string;
  /** Chosen unit pair per category id. */
  pairs: Record<string, [string, string]>;
  /** The typed amount, kept as a string so "1." and "0.0" survive editing. */
  amount: string;

  currencyFrom: string;
  currencyTo: string;
  /** Last rate table, persisted so an offline conversion still has something. */
  rates: RateTable | null;
  ratesLoading: boolean;
  ratesError: string | null;

  setTool: (tool: ConvertTool) => void;
  setCategory: (category: string) => void;
  setPair: (from: string, to: string) => void;
  swapUnits: () => void;
  setAmount: (amount: string) => void;
  setCurrencies: (from: string, to: string) => void;
  swapCurrencies: () => void;
  /** Fetch a fresh table for the current source currency. */
  loadRates: (force?: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
}

const isTool = (v: unknown): v is ConvertTool => CONVERT_TOOLS.includes(v as ConvertTool);

/** Six hours — the ECB publishes daily, so anything younger is the same answer. */
const RATES_TTL_MS = 6 * 60 * 60 * 1000;

/** The pair a category opens with, before the user has chosen one. */
const defaultPair = (categoryId: string): [string, string] =>
  CATEGORY_BY_ID[categoryId]?.defaults ?? UNIT_CATEGORIES[0].defaults;

/**
 * Convert's state: which conversion is on screen, and the pair chosen for it.
 *
 * The pair is remembered **per category** rather than globally, because the
 * choices are not interchangeable — coming back to Length wants metres-to-feet
 * again, not whatever pair Temperature happened to leave behind.
 *
 * Rates are persisted alongside the preferences for a plainer reason: they are the
 * only part of this app that needs a network, and a currency conversion against a
 * rate from this morning is worth having on a train. Their publish date travels
 * with them so the UI can never present a stale figure as a live one.
 */
export const useConvertStore = create<ConvertState>((set, get) => ({
  tool: "units",
  category: "length",
  pairs: {},
  amount: "1",
  currencyFrom: "USD",
  currencyTo: "INR",
  rates: null,
  ratesLoading: false,
  ratesError: null,

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },

  setCategory: (category) => {
    if (!CATEGORY_BY_ID[category]) return;
    set({ category });
    void persist(get());
  },

  setPair: (from, to) => {
    const { category, pairs } = get();
    set({ pairs: { ...pairs, [category]: [from, to] } });
    void persist(get());
  },

  swapUnits: () => {
    const { category, pairs } = get();
    const [from, to] = pairs[category] ?? defaultPair(category);
    set({ pairs: { ...pairs, [category]: [to, from] } });
    void persist(get());
  },

  setAmount: (amount) => {
    // Capped so a runaway paste can't be persisted, and so the number parser is
    // never handed a megabyte of digits.
    set({ amount: amount.slice(0, 32) });
    void persist(get());
  },

  setCurrencies: (currencyFrom, currencyTo) => {
    if (!CURRENCY_BY_CODE[currencyFrom] || !CURRENCY_BY_CODE[currencyTo]) return;
    const changedBase = currencyFrom !== get().currencyFrom;
    set({ currencyFrom, currencyTo });
    void persist(get());
    // A table is quoted against one currency; changing the source needs a new
    // one. Changing the target does not — the existing table already has it.
    if (changedBase) void get().loadRates();
  },

  swapCurrencies: () => {
    const { currencyFrom, currencyTo } = get();
    get().setCurrencies(currencyTo, currencyFrom);
  },

  loadRates: async (force = false) => {
    const { currencyFrom, rates, ratesLoading } = get();
    if (ratesLoading) return;

    const fresh =
      rates &&
      rates.base === currencyFrom &&
      Date.now() - rates.fetchedAt < RATES_TTL_MS;
    if (fresh && !force) return;

    set({ ratesLoading: true, ratesError: null });
    try {
      const table = await fetchRates(currencyFrom);
      set({ rates: table, ratesLoading: false, ratesError: null });
      void sSet(RATES_KEY, JSON.stringify(table));
    } catch {
      // Keep whatever table we already had — a stale rate beats no rate, and the
      // panel labels it with its date either way.
      set({
        ratesLoading: false,
        ratesError:
          rates && rates.base === currencyFrom
            ? "Showing the last saved rates — the live ones could not be reached."
            : "Rates could not be reached. Connect and try again.",
      });
    }
  },

  hydrate: async () => {
    const [rawPrefs, rawRates] = await Promise.all([sGet(PREFS_KEY), sGet(RATES_KEY)]);

    let prefs: StoredPrefs = {};
    try {
      if (rawPrefs) prefs = JSON.parse(rawPrefs) as StoredPrefs;
    } catch {
      /* corrupt prefs are simply the defaults */
    }

    let rates: RateTable | null = null;
    try {
      if (rawRates) {
        const parsed = JSON.parse(rawRates) as RateTable;
        // Guard the shape: a table without rates would break every lookup.
        if (parsed?.rates && typeof parsed.base === "string") rates = parsed;
      }
    } catch {
      /* corrupt table: fetch a new one */
    }

    const category =
      typeof prefs.category === "string" && CATEGORY_BY_ID[prefs.category]
        ? prefs.category
        : "length";

    set({
      tool: isTool(prefs.tool) ? prefs.tool : "units",
      category,
      pairs: sanitizePairs(prefs.pairs),
      amount: typeof prefs.amount === "string" ? prefs.amount.slice(0, 32) : "1",
      currencyFrom:
        prefs.currencyFrom && CURRENCY_BY_CODE[prefs.currencyFrom] ? prefs.currencyFrom : "USD",
      currencyTo: prefs.currencyTo && CURRENCY_BY_CODE[prefs.currencyTo] ? prefs.currencyTo : "INR",
      rates,
    });
  },
}));

/** Drop any stored pair naming a category or unit that no longer exists. */
function sanitizePairs(raw: unknown): Record<string, [string, string]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, [string, string]> = {};
  for (const [categoryId, pair] of Object.entries(raw as Record<string, unknown>)) {
    const category = CATEGORY_BY_ID[categoryId];
    if (!category || !Array.isArray(pair) || pair.length !== 2) continue;
    const [from, to] = pair as [unknown, unknown];
    const has = (id: unknown) => category.units.some((u) => u.id === id);
    if (typeof from === "string" && typeof to === "string" && has(from) && has(to)) {
      out[categoryId] = [from, to];
    }
  }
  return out;
}

/** One write for the whole picker state — it is a few dozen bytes. */
const persist = (s: ConvertState): Promise<void> => {
  const prefs: StoredPrefs = {
    tool: s.tool,
    category: s.category,
    pairs: s.pairs,
    amount: s.amount,
    currencyFrom: s.currencyFrom,
    currencyTo: s.currencyTo,
  };
  return sSet(PREFS_KEY, JSON.stringify(prefs));
};

/** The unit pair for the category currently on screen. */
export const activePair = (s: ConvertState): [string, string] =>
  s.pairs[s.category] ?? defaultPair(s.category);
