"use client";

import { MAX_COMPARE, useSpecsStore } from "@/store/useSpecsStore";
import { useProduct, useProducts, useSimilar } from "@/hooks/useSpecs";
import { buildRows } from "@/lib/Specs/compare";
import { useState } from "react";
import { exportComparison } from "@/lib/Specs/export";
import { ProductRow } from "@/components/Specs/molecules/ProductRow";
import { ExportBar } from "@/components/Specs/molecules/ExportBar";
import { ScoreGrid } from "@/components/Specs/organisms/ScoreGrid";
import { WhatChanged } from "@/components/Specs/organisms/WhatChanged";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { CheckIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";
import type { ProductRecord, RelatedProduct } from "@/lib/Specs/types";

/** How the source framed a neighbour, as a word for the row's tag. */
const RELATION_BADGE: Record<RelatedProduct["relation"], string> = {
  predecessor: "replaced",
  successor: "replaced by",
  related: "related",
  sibling: "same kind",
};


/**
 * The neighbours of the open product, and a column-by-column comparison with
 * whichever of them you tick.
 *
 * Neighbours come in two strengths and the list says which: the ones the source
 * article itself names — what this replaced, what replaced it, what was sold
 * beside it — and, after them, other products of the same kind found by search.
 * The first group is editorial and the second is inferred, and conflating them
 * would present a guess with the same confidence as a fact.
 */
export function SimilarPanel() {
  const openTitle = useSpecsStore((s) => s.openTitle);
  const openProduct = useSpecsStore((s) => s.openProduct);
  const setTab = useSpecsStore((s) => s.setTab);
  const compare = useSpecsStore((s) => s.compare);
  const toggleCompare = useSpecsStore((s) => s.toggleCompare);
  const clearCompare = useSpecsStore((s) => s.clearCompare);

  // Off by default: the first question a comparison answers is "what are these
  // two", and hiding the rows they agree on answers a later one.
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const { data: product } = useProduct(openTitle);
  const { data: similar, isPending, error } = useSimilar(product);
  const columns = useProducts(product ? [product.title, ...compare] : []);

  if (!openTitle || !product) {
    return (
      <PanelNote
        title="Nothing to compare yet"
        action={
          <button
            type="button"
            onClick={() => setTab("find")}
            className="tint h-8 rounded-[10px] border border-border px-3 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Go to Find
          </button>
        }
      >
        Open a product first. This tab then shows what it replaced, what replaced it, and other
        products of the same kind — and puts any of them side by side with it.
      </PanelNote>
    );
  }

  const loaded = columns.every((c) => c.data);
  const records = columns.map((c) => c.data).filter((r): r is ProductRecord => !!r);
  const allRows = compare.length && loaded ? buildRows(records) : [];
  const rows = onlyDifferences ? allRows.filter((row) => row.differs) : allRows;
  const sameCount = allRows.length - allRows.filter((row) => row.differs).length;

  return (
    <div className="flex flex-col gap-5">
      <WhatChanged product={product} />

      <section className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Products like the {product.name}
        </h3>

        {isPending && <PanelNote title="Looking for neighbours…">Asking what sits beside it.</PanelNote>}

        {error && (
          <PanelNote title="Couldn’t look up neighbours" tone="alert">
            {error.message}
          </PanelNote>
        )}

        {!isPending && !error && similar?.length === 0 && (
          <PanelNote title="Nothing comparable found">
            The source article names no predecessor, successor or related model, and a search for
            others of its kind came back empty. Search for a rival by name on the Find tab and open
            it — you can still compare the two from there.
          </PanelNote>
        )}

        {!!similar?.length && (
          <ul className="rounded-[14px] border border-border bg-panel px-2">
            {similar.map((neighbour) => {
              const picked = compare.includes(neighbour.title);
              const full = !picked && compare.length >= MAX_COMPARE;
              return (
                <ProductRow
                  key={neighbour.title}
                  name={neighbour.title.replace(/\s*\([^)]*\)\s*$/, "")}
                  detail={neighbour.description}
                  image={neighbour.image ?? null}
                  badge={RELATION_BADGE[neighbour.relation]}
                  onOpen={() =>
                    openProduct({
                      title: neighbour.title,
                      name: neighbour.title.replace(/\s*\([^)]*\)\s*$/, ""),
                      description: neighbour.description ?? "",
                      image: neighbour.image ?? null,
                    })
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => toggleCompare(neighbour.title)}
                      disabled={full}
                      title={
                        full
                          ? `The comparison already holds ${MAX_COMPARE} products`
                          : picked
                            ? `Remove from the comparison`
                            : `Add to the comparison`
                      }
                      aria-label={
                        picked
                          ? `Remove ${neighbour.title} from the comparison`
                          : `Add ${neighbour.title} to the comparison`
                      }
                      aria-pressed={picked}
                      className={cx(
                        "grid size-9 flex-none place-items-center rounded-[10px] border disabled:opacity-35",
                        picked
                          ? "border-accent bg-accent text-on-accent"
                          : "tint border-border text-ink-soft hover:border-accent hover:text-accent",
                      )}
                    >
                      {picked ? <CheckIcon size={15} /> : <PlusIcon size={15} />}
                    </button>
                  }
                />
              );
            })}
          </ul>
        )}

        <p className="text-[11px] leading-snug text-ink-soft">
          Tap a row to open its sheet, or the button at its end to add it to the comparison below —
          up to {MAX_COMPARE} beside this one. “Replaced” and “replaced by” come from the article
          itself; “same kind” is this app’s own search for others like it.
        </p>
      </section>

      {compare.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              Side by side
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {sameCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyDifferences((on) => !on)}
                  aria-pressed={onlyDifferences}
                  className={cx(
                    "h-7 rounded-[9px] border px-2.5 text-[11px]",
                    onlyDifferences
                      ? "border-accent bg-accent text-on-accent"
                      : "tint border-border hover:border-accent hover:text-accent",
                  )}
                  style={{ transition: "var(--fx)" }}
                >
                  Differences only
                </button>
              )}
              <button
                type="button"
                onClick={clearCompare}
                className="tint h-7 rounded-[9px] border border-border px-2.5 text-[11px] hover:border-accent hover:text-accent"
              >
                Clear comparison
              </button>
            </div>
          </div>

          {!loaded && <PanelNote title="Reading the other sheets…">One request each, then the table fills in.</PanelNote>}

          {loaded && onlyDifferences && allRows.length > 0 && rows.length === 0 && (
            <PanelNote title="These agree on every measure">
              Every figure this app can read is the same across all of them. They may still differ
              in ways no number captures — look at the full sheets.
            </PanelNote>
          )}

          {loaded && allRows.length === 0 && (
            <PanelNote title="Nothing measurable in common">
              None of these sheets state a figure this app knows how to read, so there is nothing to
              line up. Their full specifications are still on each one’s own sheet.
            </PanelNote>
          )}

          {loaded && rows.length > 0 && (
            <>
              {/* The one element in this app allowed to scroll sideways: a
                  comparison of four products cannot be made narrower without
                  becoming a different thing (rule #3). */}
              <div className="scroll-slim overflow-x-auto rounded-[14px] border border-border bg-panel">
                <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
                  <caption className="sr-only">
                    {records.map((r) => r.name).join(", ")} compared measure by measure
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-panel px-3 py-2.5 text-left font-mono text-[9.5px] uppercase tracking-[.13em] text-ink-soft"
                      >
                        Measure
                      </th>
                      {records.map((record) => (
                        <th
                          key={record.title}
                          scope="col"
                          className="min-w-[7.5rem] px-3 py-2.5 text-left text-[12px] font-semibold"
                        >
                          {record.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-panel px-3 py-2 text-left font-mono text-[9.5px] font-normal uppercase tracking-[.13em] text-ink-soft"
                        >
                          {row.label}
                        </th>
                        {row.cells.map((cell, i) => (
                          <td
                            key={`${row.id}-${i}`}
                            className={cx(
                              "px-3 py-2 tabular-nums",
                              cell.best ? "font-semibold text-accent" : "text-text",
                            )}
                          >
                            {cell.reading ?? <span className="text-ink-soft">—</span>}
                            {cell.best && <span className="sr-only"> (highest of these)</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] leading-snug text-ink-soft">
                Accented figures lead their row; a tie and a row only one sheet answers are left
                unmarked. A dash means that sheet does not state the measure — not that the product
                lacks it. Each figure is the one this app read out of the source (the Rating tab
                names the row it came from), and units are normalised so the numbers compare.
                {sameCount > 0 && ` ${sameCount} of ${allRows.length} measures are identical across these.`}
              </p>

              <ScoreGrid products={records} />

              <ExportBar
                build={(format) => exportComparison(records, format)}
                name={records.map((r) => r.name).join(" vs ")}
                suffix="comparison"
                label="this comparison"
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
