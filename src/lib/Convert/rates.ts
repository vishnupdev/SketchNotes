"use client";

import { fetchJson } from "@/lib/net/fetch";
import type { RatesResponse } from "@/app/api/rates/route";

/**
 * The currency side of Convert: the client half of `/api/rates`, plus the
 * currency list the picker is built from.
 *
 * Rates are the one thing in this app that needs a network, so the last answer is
 * kept and shown with its date. An offline conversion against yesterday's rate is
 * useful; an empty box is not — and the date is what stops the stale figure from
 * being mistaken for a live one.
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Every currency the ECB reference set covers, plus the base. Ordered with the
 * widely-held ones first — a picker sorted alphabetically puts the Australian
 * dollar above the US one, which is nobody's most likely choice.
 */
export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Pound sterling", symbol: "£" },
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese yen", symbol: "¥" },
  { code: "AUD", name: "Australian dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss franc", symbol: "Fr" },
  { code: "CNY", name: "Chinese yuan", symbol: "¥" },
  { code: "SGD", name: "Singapore dollar", symbol: "S$" },
  { code: "AED", name: "UAE dirham", symbol: "AED" },
  { code: "HKD", name: "Hong Kong dollar", symbol: "HK$" },
  { code: "NZD", name: "New Zealand dollar", symbol: "NZ$" },
  { code: "SEK", name: "Swedish krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian krone", symbol: "kr" },
  { code: "DKK", name: "Danish krone", symbol: "kr" },
  { code: "PLN", name: "Polish zloty", symbol: "zl" },
  { code: "CZK", name: "Czech koruna", symbol: "Kc" },
  { code: "HUF", name: "Hungarian forint", symbol: "Ft" },
  { code: "RON", name: "Romanian leu", symbol: "lei" },
  { code: "BGN", name: "Bulgarian lev", symbol: "lv" },
  { code: "TRY", name: "Turkish lira", symbol: "₺" },
  { code: "ILS", name: "Israeli shekel", symbol: "₪" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
  { code: "BRL", name: "Brazilian real", symbol: "R$" },
  { code: "MXN", name: "Mexican peso", symbol: "MX$" },
  { code: "KRW", name: "South Korean won", symbol: "₩" },
  { code: "MYR", name: "Malaysian ringgit", symbol: "RM" },
  { code: "THB", name: "Thai baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine peso", symbol: "₱" },
  { code: "ISK", name: "Icelandic krona", symbol: "kr" },
];

export const CURRENCY_BY_CODE: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

/** A rate table with the day it was published and whether it came off the wire. */
export interface RateTable {
  base: string;
  date: string;
  rates: Record<string, number>;
  /** When this table was fetched, so the UI can say how old it is. */
  fetchedAt: number;
}

export const fetchRates = async (base: string, signal?: AbortSignal): Promise<RateTable> => {
  const data = await fetchJson<RatesResponse>(`/api/rates?base=${encodeURIComponent(base)}`, {
    signal,
    label: "Rates",
  });
  return { base: data.base, date: data.date, rates: data.rates, fetchedAt: Date.now() };
};

/**
 * Convert between two currencies using a table quoted against some third one.
 *
 * Going through the table's base rather than requiring a table per source
 * currency is what lets one fetch serve every pair: dividing out the source rate
 * expresses the amount in the base, and multiplying by the target rate takes it
 * back out again. Returns null when the table is missing either leg.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  table: RateTable | null,
): number | null {
  if (!table) return null;
  const fromRate = table.rates[from];
  const toRate = table.rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

/** Money formatting for the result line, using the browser's own locale rules. */
export function formatMoney(value: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
    }).format(value);
  } catch {
    // An unknown code is not worth an error — show the number and the code.
    return `${value.toFixed(2)} ${code}`;
  }
}
