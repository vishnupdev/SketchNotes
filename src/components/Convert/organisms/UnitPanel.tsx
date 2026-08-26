"use client";

import { useMemo } from "react";
import { activePair, useConvertStore } from "@/store/useConvertStore";
import {
  CATEGORY_BY_ID,
  UNIT_CATEGORIES,
  convertUnit,
  formatResult,
  parseAmount,
  unitById,
} from "@/lib/Convert/units";
import { ConvertRow, SwapButton, type RowOption } from "@/components/Convert/molecules/ConvertRow";
import { cx } from "@/lib/utils";

/**
 * Physical-unit conversion: pick a category, pick a pair, type a number.
 *
 * Two things it does that a calculator does not, and that are the reason to reach
 * for it rather than a search box:
 *
 *  - **The reference table.** Under the answer, the same input in *every* other
 *    unit of the category. Most of the time the unit you actually wanted is one
 *    you did not think to select, and reading it off a list is faster than
 *    changing the picker and looking again.
 *  - **The rate.** "1 m = 3.2808 ft" is the fact worth remembering; the specific
 *    answer usually is not.
 */
export function UnitPanel() {
  const categoryId = useConvertStore((s) => s.category);
  const setCategory = useConvertStore((s) => s.setCategory);
  const amount = useConvertStore((s) => s.amount);
  const setAmount = useConvertStore((s) => s.setAmount);
  const setPair = useConvertStore((s) => s.setPair);
  const swapUnits = useConvertStore((s) => s.swapUnits);
  const pair = useConvertStore(activePair);

  const category = CATEGORY_BY_ID[categoryId] ?? UNIT_CATEGORIES[0];
  const [fromId, toId] = pair;
  const from = unitById(category, fromId);
  const to = unitById(category, toId);

  const parsed = parseAmount(amount);
  const invalid = amount.trim() !== "" && Number.isNaN(parsed);

  const options: RowOption[] = useMemo(
    () => category.units.map((u) => ({ value: u.id, label: `${u.label} — ${u.name}` })),
    [category],
  );

  const result = invalid ? NaN : convertUnit(parsed, from, to);

  // The whole category at this input, for the table under the answer.
  const everyUnit = useMemo(
    () =>
      invalid
        ? []
        : category.units.map((u) => ({ unit: u, value: convertUnit(parsed, from, u) })),
    [category, from, invalid, parsed],
  );

  // The rate — one of the source unit, in the target unit. Meaningless for a
  // scale with an offset (1 °C is not "the rate" of anything), so it is only
  // shown for the linear categories.
  const linear = !from.to && !to.to;
  const rate = linear ? convertUnit(1, from, to) : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="What to convert"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {UNIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === categoryId}
            onClick={() => setCategory(c.id)}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              c.id === categoryId
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div>
        <ConvertRow
          label="From"
          value={amount}
          onValue={setAmount}
          unit={fromId}
          onUnit={(id) => setPair(id, toId)}
          options={options}
          invalid={invalid}
          hint={invalid ? "That is not a number." : from.name}
        />

        <SwapButton onClick={swapUnits} label="Swap the two units" />

        <ConvertRow
          label="To"
          value={invalid ? "" : formatResult(result)}
          unit={toId}
          onUnit={(id) => setPair(fromId, id)}
          options={options}
          readOnly
          hint={
            rate !== null
              ? `1 ${from.label} = ${formatResult(rate)} ${to.label}`
              : to.name
          }
        />
      </div>

      {everyUnit.length > 1 && (
        <section aria-labelledby="convert-all" className="rounded-[14px] border border-border bg-panel p-3">
          <h2
            id="convert-all"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            {formatResult(parsed)} {from.label} in every {category.label.toLowerCase()} unit
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 min-[480px]:grid-cols-[auto_1fr_auto_1fr]">
            {everyUnit.map(({ unit, value }) => (
              <div key={unit.id} className="contents">
                <dt
                  className={cx(
                    "font-mono text-[11.5px] uppercase tracking-[.08em]",
                    unit.id === toId ? "text-accent" : "text-ink-soft",
                  )}
                >
                  {unit.label}
                </dt>
                <dd
                  className={cx(
                    "truncate text-[13px] font-semibold tabular-nums",
                    unit.id === toId ? "text-accent" : "text-text",
                  )}
                  title={`${value}`}
                >
                  {formatResult(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
