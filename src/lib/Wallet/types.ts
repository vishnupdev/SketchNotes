/**
 * Wallet: the record shape, the categories, and the roll-ups.
 *
 * One decision drives the whole file: **amounts are integers in minor units**
 * (paise, cents), never floats. `0.1 + 0.2` is not `0.3` in binary floating point,
 * and a spend tracker that quietly loses a paisa per entry is worse than no
 * tracker — you cannot tell whether the total is wrong or your memory is. Entry
 * and display convert at the edges; everything in between is whole numbers.
 */

export interface Expense {
  id: string;
  /** Minor units — 1250 is 12.50. Always an integer. */
  amount: number;
  categoryId: string;
  /** What it was, in the user's words. Optional. */
  note: string;
  /** Local calendar day as `YYYY-MM-DD`, not a timestamp — see `dayKey`. */
  day: string;
  createdAt: number;
  /** Income rather than spending. Kept as a flag so one list holds both. */
  income: boolean;
}

export interface Category {
  id: string;
  label: string;
  /** Emoji marker — cheap, universal, and needs no icon per category. */
  mark: string;
}

/**
 * The default categories, chosen to cover ordinary spending in about ten buckets.
 *
 * Ten is the number that matters. Too few and everything lands in "other"; too
 * many and choosing one is slower than typing the note, which is what kills the
 * habit of logging at all.
 */
export const CATEGORIES: Category[] = [
  { id: "food", label: "Food & drink", mark: "🍽️" },
  { id: "groceries", label: "Groceries", mark: "🛒" },
  { id: "transport", label: "Transport", mark: "🚌" },
  { id: "bills", label: "Bills & rent", mark: "🧾" },
  { id: "shopping", label: "Shopping", mark: "🛍️" },
  { id: "health", label: "Health", mark: "💊" },
  { id: "fun", label: "Fun", mark: "🎬" },
  { id: "travel", label: "Travel", mark: "✈️" },
  { id: "gifts", label: "Gifts", mark: "🎁" },
  { id: "other", label: "Other", mark: "•" },
  { id: "income", label: "Income", mark: "💰" },
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/** Local calendar day for a date, as `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The `YYYY-MM` a day belongs to. */
export const monthKey = (day: string): string => day.slice(0, 7);

/** A month key rendered for a heading, e.g. "August 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Step a month key by `delta` months. */
export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** A day key rendered for a group heading — "Today" where that is true. */
export function dayLabel(day: string): string {
  const today = dayKey();
  if (day === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === dayKey(yesterday)) return "Yesterday";

  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/* ------------------------------ parsing ------------------------------- */

/**
 * Read a typed amount into minor units.
 *
 * Rounds rather than truncates, so "12.999" becomes 1300 and not 1299 — a
 * truncating parser makes a third decimal place silently disappear downwards,
 * which shows up as a total that is a few units light and no obvious reason why.
 *
 * Returns null for anything that is not a positive amount. Zero is rejected: an
 * entry of nothing is a mis-tap, not a record.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s_]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const minor = Math.round(value * 100);
  // Guard against an absurd paste becoming an unreadable total.
  return minor > 0 && minor <= 1e12 ? minor : null;
}

/** Format minor units as money, using the browser's own locale rules. */
export function formatAmount(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      // Whole amounts read better without ".00" in a dense list.
      minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

/** The bare number, for an input field. */
export const toInput = (minor: number): string =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);

/* ----------------------------- roll-ups ------------------------------- */

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  /** Share of the month's spending, 0–1. */
  share: number;
}

export interface MonthSummary {
  key: string;
  spent: number;
  earned: number;
  /** earned − spent. Negative means the month is running at a loss. */
  net: number;
  count: number;
  byCategory: CategoryTotal[];
  /** Mean spend per day *elapsed*, not per day in the month — see below. */
  perDay: number;
  days: { day: string; total: number }[];
}

/**
 * Roll a month up.
 *
 * `perDay` divides by days *elapsed* in the current month rather than by the
 * month's length. Dividing by 31 on the 3rd produces a daily average that looks
 * reassuringly tiny and is meaningless; dividing by 3 answers the question people
 * are actually asking, which is "am I on track".
 */
export function summarizeMonth(expenses: Expense[], key: string): MonthSummary {
  const inMonth = expenses.filter((e) => monthKey(e.day) === key);

  let spent = 0;
  let earned = 0;
  const byCategory = new Map<string, { total: number; count: number }>();
  const byDay = new Map<string, number>();

  for (const e of inMonth) {
    if (e.income) {
      earned += e.amount;
    } else {
      spent += e.amount;
      const row = byCategory.get(e.categoryId) ?? { total: 0, count: 0 };
      byCategory.set(e.categoryId, { total: row.total + e.amount, count: row.count + 1 });
      byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.amount);
    }
  }

  const categories: CategoryTotal[] = [...byCategory.entries()]
    .map(([id, { total, count }]) => ({
      category: CATEGORY_BY_ID[id] ?? { id, label: id, mark: "•" },
      total,
      count,
      share: spent > 0 ? total / spent : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const now = new Date();
  const isCurrentMonth = key === dayKey(now).slice(0, 7);
  const [year, month] = key.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  return {
    key,
    spent,
    earned,
    net: earned - spent,
    count: inMonth.length,
    byCategory: categories,
    perDay: elapsed > 0 ? Math.round(spent / elapsed) : 0,
    days: [...byDay.entries()].map(([day, total]) => ({ day, total })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** Group expenses into day buckets, newest day first. */
export function groupByDay(expenses: Expense[]): { day: string; total: number; items: Expense[] }[] {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const bucket = groups.get(e.day);
    if (bucket) bucket.push(e);
    else groups.set(e.day, [e]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({
      day,
      // Income offsets the day's total, so a day heading reads as net movement.
      total: items.reduce((n, e) => n + (e.income ? -e.amount : e.amount), 0),
      items: items.sort((a, b) => b.createdAt - a.createdAt),
    }));
}

/** Currencies offered for the wallet's own display. */
export const WALLET_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD", "JPY"];
