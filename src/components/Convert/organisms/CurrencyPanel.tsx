"use client";

import { useEffect, useMemo } from "react";
import { useConvertStore } from "@/store/useConvertStore";
import { parseAmount } from "@/lib/Convert/units";
import {
  CURRENCIES,
  CURRENCY_BY_CODE,
  convertCurrency,
  formatMoney,
} from "@/lib/Convert/rates";
import { ConvertRow, SwapButton, type RowOption } from "@/components/Convert/molecules/ConvertRow";
import { RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, timeAgo } from "@/lib/utils";

/** A handful of amounts worth seeing at a glance — the "how much is 100 of these". */
const QUICK_AMOUNTS = [1, 10, 100, 1000];

const OPTIONS: RowOption[] = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

/**
 * Currency conversion against European Central Bank reference rates.
 *
 * The one design decision worth stating: **the date is part of the answer.** ECB
 * rates are published once a working day, this app caches them for offline use,
 * and a figure from Friday shown on Monday with no date is a lie by omission. So
 * the publish date sits under the result permanently rather than appearing only
 * when something has gone wrong, and the "last saved rates" case says so plainly.
 */
export function CurrencyPanel() {
  const amount = useConvertStore((s) => s.amount);
  const setAmount = useConvertStore((s) => s.setAmount);
  const from = useConvertStore((s) => s.currencyFrom);
  const to = useConvertStore((s) => s.currencyTo);
  const setCurrencies = useConvertStore((s) => s.setCurrencies);
  const swap = useConvertStore((s) => s.swapCurrencies);
  const rates = useConvertStore((s) => s.rates);
  const loading = useConvertStore((s) => s.ratesLoading);
  const error = useConvertStore((s) => s.ratesError);
  const loadRates = useConvertStore((s) => s.loadRates);

  // Fetch on arrival. `loadRates` no-ops when the cached table is both fresh and
  // for the right base, so opening the tab repeatedly costs nothing.
  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const parsed = parseAmount(amount);
  const invalid = amount.trim() !== "" && Number.isNaN(parsed);

  const result = invalid ? null : convertCurrency(parsed, from, to, rates);
  const unitRate = convertCurrency(1, from, to, rates);

  const quick = useMemo(
    () =>
      QUICK_AMOUNTS.map((n) => ({ n, value: convertCurrency(n, from, to, rates) })).filter(
        (row): row is { n: number; value: number } => row.value !== null,
      ),
    [from, rates, to],
  );

  const fromSymbol = CURRENCY_BY_CODE[from]?.symbol ?? from;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <ConvertRow
          label="From"
          value={amount}
          onValue={setAmount}
          unit={from}
          onUnit={(code) => setCurrencies(code, to)}
          options={OPTIONS}
          invalid={invalid}
          hint={invalid ? "That is not a number." : `${fromSymbol} ${CURRENCY_BY_CODE[from]?.name ?? from}`}
        />

        <SwapButton onClick={swap} label="Swap the two currencies" />

        <ConvertRow
          label="To"
          value={result === null ? "" : result.toFixed(2)}
          unit={to}
          onUnit={(code) => setCurrencies(from, code)}
          options={OPTIONS}
          readOnly
          hint={
            unitRate !== null
              ? `1 ${from} = ${unitRate.toFixed(4)} ${to}`
              : loading
                ? "Fetching today's rates…"
                : "No rates yet."
          }
        />
      </div>

      {result !== null && (
        <p className="text-center text-[19px] font-bold tabular-nums">{formatMoney(result, to)}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border bg-panel px-3 py-2.5">
        <p className="min-w-0 text-[11.5px] leading-snug text-ink-soft">
          {rates ? (
            <>
              Rates published <b className="font-semibold text-text">{rates.date}</b>, fetched{" "}
              {timeAgo(rates.fetchedAt)}. European Central Bank reference rates.
            </>
          ) : (
            "European Central Bank reference rates, published each working day."
          )}
        </p>
        <button
          type="button"
          onClick={() => void loadRates(true)}
          disabled={loading}
          className="tint inline-flex flex-none items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[.1em] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <span className={cx(loading && "animate-spin")}>
            <RefreshIcon size={13} />
          </span>
          {loading ? "Fetching" : "Refresh"}
        </button>
      </div>

      {error && (
        <p role="status" className="text-[12.5px] leading-relaxed text-ink-soft">
          {error}
        </p>
      )}

      {quick.length > 0 && (
        <section
          aria-labelledby="convert-quick"
          className="rounded-[14px] border border-border bg-panel p-3"
        >
          <h2
            id="convert-quick"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            At a glance
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 min-[480px]:grid-cols-4">
            {quick.map(({ n, value }) => (
              <div key={n}>
                <dt className="font-mono text-[10.5px] uppercase tracking-[.08em] text-ink-soft">
                  {fromSymbol}
                  {n.toLocaleString()}
                </dt>
                <dd className="text-[13.5px] font-semibold tabular-nums">
                  {formatMoney(value, to)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
