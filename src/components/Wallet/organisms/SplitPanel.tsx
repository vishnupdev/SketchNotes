"use client";

import { useMemo, useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { formatAmount, parseAmount } from "@/lib/Wallet/types";
import { splitBill, type Payer } from "@/lib/Wallet/split";
import { PlusIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { uid } from "@/lib/utils";
import { cx } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  /** What they paid, as typed. */
  paid: string;
  shares: number;
}

const newRow = (name: string): Row => ({ id: uid(), name, paid: "", shares: 1 });

/**
 * Split a bill and say who pays whom.
 *
 * Deliberately *not* persisted, unlike the rest of the app. A split is a
 * five-minute conversation at a table, not a record — and keeping half-finished
 * ones around would mean an app that greets you with last month's dinner. The
 * ledger is for what you spent; this is for working out what you owe.
 *
 * The one thing it does that a mental calculation does not is assign the
 * remainder. See `lib/Wallet/split.ts` — every last minor unit is given to
 * someone, and the panel says who, because "we'll round it" is where these
 * conversations actually stall.
 */
export function SplitPanel() {
  const currency = useWalletStore((s) => s.currency);

  const [rows, setRows] = useState<Row[]>(() => [newRow("Me"), newRow("")]);
  const [total, setTotal] = useState("");

  const payers: Payer[] = useMemo(
    () =>
      rows.map((r, i) => ({
        id: r.id,
        name: r.name.trim() || `Person ${i + 1}`,
        paid: parseAmount(r.paid) ?? 0,
        shares: r.shares,
      })),
    [rows],
  );

  const typedTotal = parseAmount(total);
  const result = useMemo(
    () => splitBill(payers, typedTotal ?? undefined),
    [payers, typedTotal],
  );

  const nameOf = (id: string) => payers.find((p) => p.id === id)?.name ?? "someone";
  const paidSoFar = payers.reduce((n, p) => n + p.paid, 0);
  const unaccounted = result.total - paidSoFar;

  const patch = (id: string, next: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-border bg-panel p-3">
        <label
          htmlFor="split-total"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Bill total
        </label>
        <input
          id="split-total"
          type="text"
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder={`Leave empty to use the sum of what everyone paid`}
          className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-3 py-2.5 text-[22px] font-bold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
          {typedTotal === null
            ? `Using ${formatAmount(paidSoFar, currency)} — the sum of what everyone has paid.`
            : unaccounted === 0
              ? "Everything paid for is accounted for."
              : unaccounted > 0
                ? `${formatAmount(unaccounted, currency)} of the bill is still unpaid.`
                : `${formatAmount(-unaccounted, currency)} more has been paid than the bill.`}
        </p>
      </div>

      <section aria-labelledby="split-people" className="flex flex-col gap-2">
        <h2
          id="split-people"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Who was there
        </h2>

        {rows.map((row, i) => (
          <div key={row.id} className="flex items-end gap-2 rounded-[14px] border border-border bg-panel p-2.5">
            <div className="min-w-0 flex-1">
              <label htmlFor={`split-name-${row.id}`} className="sr-only">
                Name of person {i + 1}
              </label>
              <input
                id={`split-name-${row.id}`}
                type="text"
                value={row.name}
                onChange={(e) => patch(row.id, { name: e.target.value })}
                placeholder={`Person ${i + 1}`}
                className="w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[13px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="w-[92px] flex-none">
              <label
                htmlFor={`split-paid-${row.id}`}
                className="font-mono text-[9px] uppercase tracking-[.1em] text-ink-soft"
              >
                Paid
              </label>
              <input
                id={`split-paid-${row.id}`}
                type="text"
                inputMode="decimal"
                value={row.paid}
                onChange={(e) => patch(row.id, { paid: e.target.value })}
                placeholder="0"
                className="w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2 py-2 text-[13px] tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="w-[74px] flex-none">
              <label
                htmlFor={`split-shares-${row.id}`}
                className="font-mono text-[9px] uppercase tracking-[.1em] text-ink-soft"
              >
                Shares
              </label>
              <input
                id={`split-shares-${row.id}`}
                type="number"
                min={0}
                max={20}
                step={1}
                value={row.shares}
                onChange={(e) =>
                  patch(row.id, { shares: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })
                }
                className="w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2 py-2 text-[13px] tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <button
              type="button"
              onClick={() => setRows((rs) => (rs.length > 2 ? rs.filter((r) => r.id !== row.id) : rs))}
              disabled={rows.length <= 2}
              aria-label={`Remove ${row.name.trim() || `person ${i + 1}`}`}
              className="tint mb-1.5 grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-danger disabled:opacity-30"
            >
              <TrashSmallIcon size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((rs) => (rs.length < 20 ? [...rs, newRow("")] : rs))}
          disabled={rows.length >= 20}
          className="tint inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <PlusIcon size={14} />
          Add a person
        </button>
        <p className="text-[11px] leading-snug text-ink-soft">
          Shares weight the split — 2 for someone who had twice as much, 0 for someone who is not
          paying. Equal shares are the default.
        </p>
      </section>

      <section
        aria-labelledby="split-result"
        className="rounded-[14px] border border-accent/40 bg-accent-soft p-3"
      >
        <h2
          id="split-result"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Settling up
        </h2>

        <ul className="mt-2 flex flex-col gap-1">
          {payers.map((p) => (
            <li key={p.id} className="flex items-baseline gap-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              <span className="flex-none font-mono tabular-nums text-ink-soft">
                owes {formatAmount(result.owed[p.id] ?? 0, currency)}
                {result.roundedUp.includes(p.id) && (
                  <span title="Absorbed a rounding remainder"> +</span>
                )}
              </span>
              <span
                className={cx(
                  "w-[86px] flex-none text-right font-mono font-semibold tabular-nums",
                  (result.balance[p.id] ?? 0) === 0
                    ? "text-ink-soft"
                    : (result.balance[p.id] ?? 0) > 0
                      ? "text-accent"
                      : "text-danger",
                )}
              >
                {(result.balance[p.id] ?? 0) === 0
                  ? "square"
                  : (result.balance[p.id] ?? 0) > 0
                    ? `+${formatAmount(result.balance[p.id], currency)}`
                    : `−${formatAmount(-result.balance[p.id], currency)}`}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-border pt-2">
          {result.settlements.length === 0 ? (
            <p className="text-[13px] font-semibold">
              {result.total === 0 ? "Enter a total to split." : "Everyone is square — no transfers needed."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {result.settlements.map((s, i) => (
                <li key={i} className="text-[13.5px] font-semibold">
                  <b>{nameOf(s.from)}</b> pays <b>{nameOf(s.to)}</b>{" "}
                  <span className="font-mono tabular-nums text-accent">
                    {formatAmount(s.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {result.roundedUp.length > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-ink-soft">
            The total does not divide exactly, so{" "}
            {[...new Set(result.roundedUp)].map(nameOf).join(", ")} covers the odd{" "}
            {result.roundedUp.length === 1 ? "unit" : `${result.roundedUp.length} units`}.
          </p>
        )}
      </section>
    </div>
  );
}
