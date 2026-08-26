"use client";

import { useMemo, useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import {
  dayKey,
  formatAmount,
  monthLabel,
  parseAmount,
  shiftMonth,
  summarizeMonth,
  WALLET_CURRENCIES,
} from "@/lib/Wallet/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
} from "@/components/SketchNotes/atoms/icons";
import { downloadText } from "@/lib/export-text";
import { cx } from "@/lib/utils";

/**
 * Where the month went.
 *
 * The category bars are the point. A list of totals tells you what you spent; the
 * bars tell you the *shape* of the month, which is the thing you can act on — one
 * category at 60% is a different problem from six at 15%. They are drawn as plain
 * divs sized by percentage rather than a chart library: it is one bar per row, and
 * a charting dependency for that would be pure bundle cost (rule #7).
 *
 * The optional budget line is deliberately not a limit that blocks anything. It
 * draws a marker and says how much is left; a tracker that nags is a tracker people
 * stop opening.
 */
export function MonthPanel() {
  const expenses = useWalletStore((s) => s.expenses);
  const currency = useWalletStore((s) => s.currency);
  const setCurrency = useWalletStore((s) => s.setCurrency);
  const month = useWalletStore((s) => s.month);
  const setMonth = useWalletStore((s) => s.setMonth);
  const budget = useWalletStore((s) => s.budget);
  const setBudget = useWalletStore((s) => s.setBudget);

  const [budgetDraft, setBudgetDraft] = useState(budget ? String(budget / 100) : "");

  const summary = useMemo(() => summarizeMonth(expenses, month), [expenses, month]);

  const thisMonth = dayKey().slice(0, 7);
  const atLatest = month >= thisMonth;

  const budgetLeft = budget > 0 ? budget - summary.spent : null;
  const budgetShare = budget > 0 ? Math.min(1, summary.spent / budget) : 0;

  /** CSV of the month, for a spreadsheet or an accountant. */
  const exportCsv = () => {
    const rows = expenses
      .filter((e) => e.day.startsWith(month))
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((e) =>
        [
          e.day,
          e.income ? "income" : "expense",
          e.categoryId,
          // Quotes doubled and the field wrapped, so a note containing a comma
          // cannot shift every column after it.
          `"${e.note.replace(/"/g, '""')}"`,
          (e.amount / 100).toFixed(2),
          currency,
        ].join(","),
      );
    const csv = ["date,kind,category,note,amount,currency", ...rows].join("\n");
    downloadText(csv, `wallet-${month}.csv`, "text/csv");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
          className="tint grid size-9 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">
          {monthLabel(month)}
        </h2>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={atLatest}
          aria-label="Next month"
          className="tint grid size-9 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent disabled:opacity-35"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-4">
        {[
          { label: "Spent", value: formatAmount(summary.spent, currency), strong: true },
          { label: "Received", value: formatAmount(summary.earned, currency) },
          {
            label: "Net",
            value: `${summary.net < 0 ? "−" : "+"}${formatAmount(Math.abs(summary.net), currency)}`,
          },
          { label: "A day so far", value: formatAmount(summary.perDay, currency) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[14px] border border-border bg-panel px-3 py-2.5">
            <div className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              {stat.label}
            </div>
            <div
              className={cx(
                "mt-0.5 truncate tabular-nums",
                stat.strong ? "text-[19px] font-extrabold" : "text-[15px] font-bold",
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <section aria-labelledby="wallet-budget" className="rounded-[14px] border border-border bg-panel p-3">
        <h3
          id="wallet-budget"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Monthly target
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={budgetDraft}
            onChange={(e) => setBudgetDraft(e.target.value)}
            onBlur={() => {
              const parsed = parseAmount(budgetDraft);
              setBudget(parsed ?? 0);
              if (!parsed) setBudgetDraft("");
            }}
            placeholder="No target"
            aria-label="Monthly spending target"
            className="w-[130px] flex-none rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[14px] font-semibold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          {budgetLeft !== null && (
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug">
              {budgetLeft >= 0 ? (
                <>
                  <b className="font-bold text-accent">{formatAmount(budgetLeft, currency)}</b> left
                  this month.
                </>
              ) : (
                <>
                  <b className="font-bold text-danger">
                    {formatAmount(-budgetLeft, currency)} over
                  </b>{" "}
                  the target.
                </>
              )}
            </p>
          )}
        </div>
        {budget > 0 && (
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-paper"
            role="img"
            aria-label={`${Math.round(budgetShare * 100)} percent of the target spent`}
          >
            <div
              className={cx("h-full rounded-full", budgetLeft! < 0 ? "bg-danger" : "bg-accent")}
              style={{ width: `${Math.max(2, budgetShare * 100)}%` }}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="wallet-cats" className="rounded-[14px] border border-border bg-panel p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="wallet-cats"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Where it went
          </h3>
          <span className="flex items-center gap-1.5">
            <label htmlFor="wallet-currency" className="sr-only">
              Currency
            </label>
            <select
              id="wallet-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-border bg-paper px-2 py-1 font-mono text-[11px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {WALLET_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCsv}
              disabled={summary.count === 0}
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.1em] hover:border-accent hover:text-accent disabled:opacity-40"
            >
              <DownloadIcon size={12} />
              CSV
            </button>
          </span>
        </div>

        {summary.byCategory.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-soft">Nothing spent in this month.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {summary.byCategory.map(({ category, total, count, share }) => (
              <li key={category.id}>
                <div className="flex items-baseline gap-2">
                  <span aria-hidden className="flex-none text-[14px]">
                    {category.mark}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {category.label}
                  </span>
                  <span className="flex-none font-mono text-[10.5px] tabular-nums text-ink-soft">
                    {count}× · {Math.round(share * 100)}%
                  </span>
                  <span className="flex-none font-mono text-[13px] font-semibold tabular-nums">
                    {formatAmount(total, currency)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(2, share * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary.days.length > 1 && (
        <section aria-labelledby="wallet-days" className="rounded-[14px] border border-border bg-panel p-3">
          <h3
            id="wallet-days"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Day by day
          </h3>
          {/* A bar per day that had spending. Heights are relative to the biggest
              day, so the shape of the month is readable at any scale. */}
          <div className="mt-2 flex h-20 items-end gap-[3px]">
            {summary.days.map(({ day, total }) => {
              const peak = Math.max(...summary.days.map((d) => d.total));
              const height = peak > 0 ? Math.max(4, (total / peak) * 100) : 4;
              return (
                <div
                  key={day}
                  title={`${day} · ${formatAmount(total, currency)}`}
                  className="min-w-[3px] flex-1 rounded-t-[3px] bg-accent"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
            Tallest bar: {formatAmount(Math.max(...summary.days.map((d) => d.total)), currency)}
          </p>
        </section>
      )}
    </div>
  );
}
