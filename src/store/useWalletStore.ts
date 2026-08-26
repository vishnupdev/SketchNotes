"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import {
  CATEGORY_BY_ID,
  dayKey,
  WALLET_CURRENCIES,
  type Expense,
} from "@/lib/Wallet/types";

const ITEMS_KEY = "sknotes:wallet:items";
const PREFS_KEY = "sknotes:wallet:prefs";

export type WalletTool = "spend" | "month" | "split";

export const WALLET_TOOLS: WalletTool[] = ["spend", "month", "split"];

/** Years of daily logging fits well inside this; it is a runaway guard, not a budget. */
const MAX_EXPENSES = 20_000;

interface StoredPrefs {
  tool?: string;
  currency?: string;
  /** Monthly spending target in minor units, or 0 for none. */
  budget?: number;
  /** The month the summary is looking at. */
  month?: string;
}

interface WalletState {
  expenses: Expense[];
  tool: WalletTool;
  currency: string;
  budget: number;
  month: string;
  ready: boolean;

  setTool: (tool: WalletTool) => void;
  setCurrency: (currency: string) => void;
  setBudget: (minor: number) => void;
  setMonth: (month: string) => void;
  /** Add an entry. Returns false when the amount was not usable. */
  add: (entry: { amount: number; categoryId: string; note: string; day?: string; income?: boolean }) => boolean;
  update: (id: string, patch: Partial<Omit<Expense, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  hydrate: () => Promise<void>;
}

const isTool = (v: unknown): v is WalletTool => WALLET_TOOLS.includes(v as WalletTool);

/**
 * The wallet's ledger.
 *
 * Entries are kept newest-first in one array, and that order is maintained on
 * insert rather than re-sorted on read: the list is rendered on every keystroke of
 * the amount field, and sorting twenty thousand records each time would be felt.
 *
 * Amounts arrive here already in minor units — the parsing happens at the input,
 * so a component can never hand this store a float and have it half-work.
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  expenses: [],
  tool: "spend",
  currency: "INR",
  budget: 0,
  month: dayKey().slice(0, 7),
  ready: false,

  setTool: (tool) => {
    set({ tool });
    void persistPrefs(get());
  },

  setCurrency: (currency) => {
    if (!WALLET_CURRENCIES.includes(currency)) return;
    set({ currency });
    void persistPrefs(get());
  },

  setBudget: (budget) => {
    set({ budget: Math.max(0, Math.round(budget)) });
    void persistPrefs(get());
  },

  setMonth: (month) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    set({ month });
    void persistPrefs(get());
  },

  add: ({ amount, categoryId, note, day, income = false }) => {
    if (!Number.isInteger(amount) || amount <= 0) return false;
    if (!CATEGORY_BY_ID[categoryId]) return false;

    const entry: Expense = {
      id: uid(),
      amount,
      categoryId,
      note: note.trim().slice(0, 140),
      day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : dayKey(),
      createdAt: Date.now(),
      income,
    };

    // Newest first, and the day order maintained rather than re-sorted on read.
    const expenses = [entry, ...get().expenses].slice(0, MAX_EXPENSES);
    set({ expenses });
    void persistItems(expenses);
    return true;
  },

  update: (id, patch) => {
    const expenses = get().expenses.map((e) =>
      e.id === id
        ? {
            ...e,
            ...patch,
            amount:
              patch.amount !== undefined && Number.isInteger(patch.amount) && patch.amount > 0
                ? patch.amount
                : e.amount,
            note: (patch.note ?? e.note).slice(0, 140),
          }
        : e,
    );
    set({ expenses });
    void persistItems(expenses);
  },

  remove: (id) => {
    const expenses = get().expenses.filter((e) => e.id !== id);
    set({ expenses });
    void persistItems(expenses);
  },

  hydrate: async () => {
    const [rawItems, rawPrefs] = await Promise.all([sGet(ITEMS_KEY), sGet(PREFS_KEY)]);

    let expenses: Expense[] = [];
    try {
      if (rawItems) {
        const parsed = JSON.parse(rawItems) as unknown;
        if (Array.isArray(parsed)) {
          expenses = parsed
            .filter(isExpense)
            .slice(0, MAX_EXPENSES)
            .sort((a, b) => b.createdAt - a.createdAt);
        }
      }
    } catch {
      /* a corrupt ledger reads as empty rather than throwing on mount */
    }

    let prefs: StoredPrefs = {};
    try {
      if (rawPrefs) prefs = JSON.parse(rawPrefs) as StoredPrefs;
    } catch {
      /* defaults */
    }

    set({
      expenses,
      ready: true,
      tool: isTool(prefs.tool) ? prefs.tool : "spend",
      currency:
        typeof prefs.currency === "string" && WALLET_CURRENCIES.includes(prefs.currency)
          ? prefs.currency
          : "INR",
      budget: typeof prefs.budget === "number" && prefs.budget >= 0 ? Math.round(prefs.budget) : 0,
      // Always open on the current month, whatever was last viewed: coming back
      // tomorrow wanting last month is far rarer than wanting today.
      month: dayKey().slice(0, 7),
    });
  },
}));

/** Guard a stored record. An entry with a bad amount is dropped, not coerced. */
function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<Expense>;
  return (
    typeof e.id === "string" &&
    typeof e.amount === "number" &&
    Number.isFinite(e.amount) &&
    e.amount > 0 &&
    typeof e.categoryId === "string" &&
    typeof e.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.day) &&
    typeof e.createdAt === "number" &&
    typeof e.note === "string" &&
    typeof e.income === "boolean"
  );
}

const persistItems = (expenses: Expense[]): Promise<void> =>
  sSet(ITEMS_KEY, JSON.stringify(expenses));

const persistPrefs = (s: WalletState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: s.tool,
      currency: s.currency,
      budget: s.budget,
      month: s.month,
    } satisfies StoredPrefs),
  );
