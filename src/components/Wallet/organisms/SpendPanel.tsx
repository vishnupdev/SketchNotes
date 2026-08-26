"use client";

import { useMemo, useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  dayKey,
  dayLabel,
  formatAmount,
  groupByDay,
  parseAmount,
} from "@/lib/Wallet/types";
import { CheckIcon, PlusIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** Every category except income, which has its own toggle. */
const SPEND_CATEGORIES = CATEGORIES.filter((c) => c.id !== "income");

/** Days of history shown in the list. Older entries live in the Month tab. */
const RECENT_DAYS = 14;

/**
 * Log a spend, and see the last fortnight.
 *
 * The entry form is the app. If logging a coffee takes more than about four
 * seconds, nobody logs the coffee, and a spend tracker with gaps in it is worse
 * than none — it produces confident totals that are wrong. So: the amount field is
 * focused and numeric, the category is one tap from a visible grid rather than a
 * dropdown, the note is optional, and the date defaults to today and is tucked
 * away. Nothing is required except a number and a tap.
 */
export function SpendPanel() {
  const expenses = useWalletStore((s) => s.expenses);
  const currency = useWalletStore((s) => s.currency);
  const add = useWalletStore((s) => s.add);
  const remove = useWalletStore((s) => s.remove);
  const ready = useWalletStore((s) => s.ready);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("food");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(dayKey());
  const [income, setIncome] = useState(false);
  const [saved, setSaved] = useState(false);

  const minor = parseAmount(amount);
  const canSave = minor !== null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minor === null) return;
    const ok = add({
      amount: minor,
      categoryId: income ? "income" : categoryId,
      note,
      day,
      income,
    });
    if (!ok) return;
    // Keep the category and the date: the next entry is usually the same kind on
    // the same day. Clear the amount and note, which never repeat.
    setAmount("");
    setNote("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const recent = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS);
    const floor = dayKey(cutoff);
    return groupByDay(expenses.filter((e) => e.day >= floor));
  }, [expenses]);

  const today = useMemo(() => {
    const key = dayKey();
    return expenses
      .filter((e) => e.day === key && !e.income)
      .reduce((n, e) => n + e.amount, 0);
  }, [expenses]);

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-3">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="wallet-amount"
              className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
            >
              {income ? "Money in" : "Amount"}
            </label>
            <input
              id="wallet-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoComplete="off"
              aria-invalid={(amount !== "" && !canSave) || undefined}
              className={cx(
                "mt-0.5 w-full rounded-[10px] border-[1.5px] bg-paper px-3 py-2.5 text-[26px] font-bold tabular-nums outline-none",
                amount !== "" && !canSave
                  ? "border-danger text-danger"
                  : "border-border focus:border-accent focus:ring-2 focus:ring-accent/25",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={!canSave}
            className="tint mb-0.5 inline-flex flex-none items-center gap-1.5 rounded-[12px] bg-accent px-4 py-3 text-[13px] font-bold text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            {saved ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
            {saved ? "Saved" : "Add"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIncome(false)}
            aria-pressed={!income}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
              !income ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper text-ink-soft",
            )}
          >
            Spent
          </button>
          <button
            type="button"
            onClick={() => setIncome(true)}
            aria-pressed={income}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
              income ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper text-ink-soft",
            )}
          >
            Received
          </button>

          <label htmlFor="wallet-day" className="sr-only">
            Date
          </label>
          <input
            id="wallet-day"
            type="date"
            value={day}
            max={dayKey()}
            onChange={(e) => setDay(e.target.value || dayKey())}
            className="ml-auto rounded-full border border-border bg-paper px-2.5 py-1.5 font-mono text-[11.5px] hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        {!income && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              Category
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SPEND_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={c.id === categoryId}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                    c.id === categoryId
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-paper text-ink-soft hover:text-text",
                  )}
                >
                  <span aria-hidden>{c.mark}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="wallet-note" className="sr-only">
            Note
          </label>
          <input
            id="wallet-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note — optional"
            className="w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </form>

      <p className="text-center text-[13px] text-ink-soft">
        Spent today: <b className="text-[15px] font-bold text-text">{formatAmount(today, currency)}</b>
      </p>

      <section aria-labelledby="wallet-recent" className="flex flex-col gap-2.5">
        <h2
          id="wallet-recent"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Last {RECENT_DAYS} days
        </h2>

        {recent.length === 0 ? (
          <p className="rounded-[14px] border border-border bg-panel px-4 py-8 text-center text-[13.5px] leading-relaxed text-ink-soft">
            {ready
              ? "Nothing logged yet. Type an amount, tap a category, and press Add."
              : "Opening your ledger…"}
          </p>
        ) : (
          recent.map((group) => (
            <div key={group.day} className="rounded-[14px] border border-border bg-panel">
              <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
                <h3 className="text-[12.5px] font-bold">{dayLabel(group.day)}</h3>
                <span className="font-mono text-[12px] font-semibold tabular-nums">
                  {formatAmount(group.total, currency)}
                </span>
              </div>
              <ul>
                {group.items.map((item) => {
                  const category = CATEGORY_BY_ID[item.categoryId];
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <span aria-hidden className="text-[16px]">
                        {category?.mark ?? "•"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">
                          {item.note || category?.label || item.categoryId}
                        </span>
                        {item.note && (
                          <span className="block truncate text-[11px] text-ink-soft">
                            {category?.label}
                          </span>
                        )}
                      </span>
                      <span
                        className={cx(
                          "flex-none font-mono text-[13px] font-semibold tabular-nums",
                          item.income ? "text-accent" : "text-text",
                        )}
                      >
                        {item.income ? "+" : "−"}
                        {formatAmount(item.amount, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Delete ${item.note || category?.label || "entry"}`}
                        className="tint grid size-7 flex-none place-items-center rounded-lg text-ink-soft hover:text-danger"
                      >
                        <TrashSmallIcon size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
