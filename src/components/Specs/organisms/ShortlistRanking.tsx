"use client";

import { useState } from "react";
import { useSpecsStore } from "@/store/useSpecsStore";
import { useProducts } from "@/hooks/useSpecs";
import { lowerIsBetter, measureLabel } from "@/lib/Specs/measure";
import { exportComparison } from "@/lib/Specs/export";
import { ExportBar } from "@/components/Specs/molecules/ExportBar";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { cx } from "@/lib/utils";
import type { MeasureId, ProductHit, ProductRecord } from "@/lib/Specs/types";

/**
 * Ranking the shortlist by any measure it states — and taking it with you.
 *
 * ## Why this is possible here and nowhere else
 *
 * "Show me phones over 5000 mAh" is the feature this app most obviously wants
 * and cannot have: a measure only exists once a sheet has been *fetched and
 * parsed*, so filtering a maker's ninety handsets would mean ninety article
 * requests to answer one question. That is a crawler with a datastore, not a
 * lookup tool, and building one by accident inside a browse tab would be a
 * quiet architectural mistake.
 *
 * A shortlist is the case where the cost is already paid. These three or five
 * sheets are fetched the moment the list renders, cached for the session, and
 * shared with every other view — so sorting them by battery costs *nothing*,
 * and it happens to be the exact moment someone wants ranking: when they have
 * narrowed the field and have to choose.
 *
 * ## What it refuses to do
 *
 * A product whose sheet does not state the measure is **listed at the bottom,
 * not dropped**. Sorting it away would silently answer "which of these has the
 * biggest battery" with a shorter list than the one you built, and the thing
 * you were considering would vanish for the crime of having a thin article.
 */
export function ShortlistRanking() {
  const shortlist = useSpecsStore((s) => s.shortlist);
  const openProduct = useSpecsStore((s) => s.openProduct);

  const [sortBy, setSortBy] = useState<MeasureId | null>(null);

  // The same cache entries every other view uses: a product already opened
  // costs no request when it joins the list.
  const columns = useProducts(shortlist.map((s) => s.title));
  const records = columns.map((c) => c.data).filter((r): r is ProductRecord => !!r);
  const loading = columns.some((c) => c.isPending);

  if (shortlist.length < 2) return null;

  // Only measures at least one sheet states can be sorted on; offering an empty
  // axis would be a control that does nothing.
  const axes: MeasureId[] = [];
  for (const record of records) {
    for (const measure of record.measures) if (!axes.includes(measure.id)) axes.push(measure.id);
  }

  const valueOf = (record: ProductRecord): number | null =>
    sortBy ? (record.measures.find((m) => m.id === sortBy)?.value ?? null) : null;

  const readingOf = (record: ProductRecord): string | null =>
    sortBy ? (record.measures.find((m) => m.id === sortBy)?.reading ?? null) : null;

  const ranked = sortBy
    ? [...records].sort((a, b) => {
        const left = valueOf(a);
        const right = valueOf(b);
        // Unstated sinks to the bottom whichever way the axis runs, rather than
        // winning a "lowest weight" sort by having no weight at all.
        if (left === null && right === null) return a.name.localeCompare(b.name);
        if (left === null) return 1;
        if (right === null) return -1;
        return lowerIsBetter(sortBy) ? left - right : right - left;
      })
    : records;

  const asHit = (record: ProductRecord): ProductHit => ({
    title: record.title,
    name: record.name,
    description: record.description,
    image: record.image,
  });

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        Rank the shortlist
      </h3>

      {loading && (
        <PanelNote title="Reading the sheets…">
          Once they are in, sorting is instant — the figures are already here.
        </PanelNote>
      )}

      {!loading && axes.length === 0 && (
        <PanelNote title="Nothing measurable in common">
          None of these sheets states a figure this app knows how to read, so there is nothing to
          rank them by. Their full specifications are still on each one&rsquo;s own sheet.
        </PanelNote>
      )}

      {!loading && axes.length > 0 && (
        <>
          <div
            role="tablist"
            aria-label="Rank the shortlist by"
            className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sortBy === null}
              onClick={() => setSortBy(null)}
              className={cx(
                "h-7 flex-none rounded-full border px-3 text-[11.5px]",
                sortBy === null
                  ? "border-accent text-accent"
                  : "tint border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
              style={{ transition: "var(--fx)" }}
            >
              As added
            </button>
            {axes.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={sortBy === id}
                onClick={() => setSortBy(id)}
                className={cx(
                  "h-7 flex-none rounded-full border px-3 text-[11.5px]",
                  sortBy === id
                    ? "border-accent text-accent"
                    : "tint border-border text-ink-soft hover:border-accent hover:text-accent",
                )}
                style={{ transition: "var(--fx)" }}
              >
                {measureLabel(id)}
              </button>
            ))}
          </div>

          <ol className="rounded-[14px] border border-border bg-panel px-2">
            {ranked.map((record, i) => {
              const reading = readingOf(record);
              return (
                <li
                  key={record.title}
                  className="flex items-center gap-2 border-b border-border py-1 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="w-5 flex-none text-center font-mono text-[11px] tabular-nums text-ink-soft"
                  >
                    {sortBy ? i + 1 : "·"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openProduct(asHit(record))}
                    className="tint min-w-0 flex-1 rounded-[10px] px-2 py-2 text-left hover:text-accent"
                  >
                    <span className="block truncate text-[13px] font-semibold">{record.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                      {record.description}
                    </span>
                  </button>
                  <span className="flex-none pr-2 font-mono text-[12px] tabular-nums">
                    {sortBy ? (
                      reading ?? <span className="text-[10.5px] text-ink-soft">not stated</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="text-[11px] leading-snug text-ink-soft">
            {sortBy ? (
              <>
                Ranked by {measureLabel(sortBy).toLowerCase()},{" "}
                {lowerIsBetter(sortBy) ? "smallest" : "largest"} first. A sheet that does not state
                it sits at the bottom rather than being dropped — it is still on your shortlist.
              </>
            ) : (
              <>
                These sheets are already loaded, so ranking them costs nothing. Sorting a whole
                maker&rsquo;s catalogue this way would not — a measure only exists once a sheet has
                been read, and that would be a request per product.
              </>
            )}
          </p>

          {records.length > 1 && (
            <ExportBar
              build={(format) => exportComparison(ranked, format)}
              name={`shortlist ${new Date().toISOString().slice(0, 10)}`}
              label="your shortlist"
            />
          )}
        </>
      )}
    </section>
  );
}
