"use client";

import { scoreProduct } from "@/lib/Specs/score";
import { cx } from "@/lib/utils";
import type { MeasureId, ProductRecord } from "@/lib/Specs/types";

/**
 * Several products' spec scores, axis by axis.
 *
 * ## Why this shape and not a radar chart
 *
 * A radar is the reflex for "several things across several axes" and is the
 * wrong answer twice over. Its area grows with the *square* of the values, so it
 * exaggerates every difference; and the shape it draws depends on the order the
 * axes happen to sit in, which is arbitrary here. Two products can swap places
 * visually by reordering a list.
 *
 * ## Why one hue and not a colour per product
 *
 * This workspace is deliberately single-accent: every one of its two dozen
 * themes carries exactly one, and rule #6 forbids inventing colours in a
 * component. A five-colour categorical palette would have to be added to every
 * theme and checked for colour-blind separation in each — and it would buy
 * nothing, because **identity here is carried by the column header, not by the
 * colour**. So each cell is a bar in the one accent hue: magnitude by length,
 * identity by position. That is also what keeps it readable for a colour-blind
 * reader with no second encoding bolted on.
 *
 * Every cell prints its number as well as drawing it, so nothing is conveyed by
 * length alone either, and the text always sits on the plain panel rather than
 * on a shaded fill — which is what guarantees its contrast in all 24 themes
 * without a per-theme check.
 *
 * Only axes **some** product answers are drawn, and a leader is marked only when
 * two or more products answer that axis — one number is not a comparison.
 */
export function ScoreGrid({ products }: { products: ProductRecord[] }) {
  const scored = products.map((product) => ({
    product,
    score: scoreProduct(product.measures, product.category),
  }));

  // The axes in play, in the order the first product that has them lists them.
  const axisIds: MeasureId[] = [];
  for (const { score } of scored) {
    for (const axis of score.axes) if (!axisIds.includes(axis.id)) axisIds.push(axis.id);
  }

  const rows = axisIds
    .map((id) => {
      const cells = scored.map(({ score }) => score.axes.find((a) => a.id === id) ?? null);
      const stated = cells.filter((c) => c?.score !== null && c?.score !== undefined);
      if (!stated.length) return null;

      const best = Math.max(...stated.map((c) => c!.score as number));
      // A tie is not a win. Marking the first of two equal bars would be false.
      const leaders = stated.filter((c) => c!.score === best).length;

      return {
        id,
        label: cells.find((c) => c)?.label ?? id,
        cells: cells.map((cell) => ({
          score: cell?.score ?? null,
          reading: cell?.reading ?? null,
          leads: stated.length > 1 && leaders === 1 && cell?.score === best,
        })),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) return null;

  // Products of different kinds are scored on different bands entirely, so an
  // axis they happen to share is not the same scale. Saying so is cheaper than
  // silently drawing a misleading row.
  const kinds = new Set(products.map((p) => p.category));

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        Scores, axis by axis
      </h3>

      <div className="scroll-slim overflow-x-auto rounded-[14px] border border-border bg-panel">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <caption className="sr-only">
            Spec score per axis for {products.map((p) => p.name).join(", ")}, each out of 100
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-panel px-3 py-2.5 text-left font-mono text-[9.5px] uppercase tracking-[.13em] text-ink-soft"
              >
                Axis
              </th>
              {scored.map(({ product, score }) => (
                <th key={product.title} scope="col" className="min-w-[8rem] px-3 py-2.5 text-left">
                  <span className="block text-[12px] font-semibold">{product.name}</span>
                  <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft">
                    {score.overall === null ? "not scored" : `${score.overall} overall`}
                  </span>
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
                  <td key={`${row.id}-${i}`} className="px-3 py-2 align-middle">
                    {cell.score === null ? (
                      <span className="text-ink-soft">—</span>
                    ) : (
                      <>
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cx(
                              "font-mono text-[11.5px] tabular-nums",
                              cell.leads ? "font-bold text-accent" : "text-text",
                            )}
                          >
                            {cell.score}
                          </span>
                          <span className="truncate text-[10.5px] text-ink-soft">{cell.reading}</span>
                        </span>
                        {/* The bar is decorative — the number above it is the
                            accessible value, and the row header names the axis. */}
                        <span
                          aria-hidden="true"
                          className="mt-1 block h-1.5 overflow-hidden rounded-full bg-border"
                        >
                          <span
                            className={cx("block h-full rounded-full", cell.leads ? "bg-accent" : "bg-ink-soft")}
                            style={{ width: `${cell.score}%`, transition: "var(--fx)" }}
                          />
                        </span>
                        {cell.leads && <span className="sr-only"> — highest of these</span>}
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-snug text-ink-soft">
        Each axis is scored 0–100 against a published band for that kind of product, so a bar is
        &ldquo;where this sits on the scale&rdquo;, not a share of anything. A dash means that sheet
        does not state the measure. Ties and single-answer rows are left unmarked.
        {kinds.size > 1 && (
          <>
            {" "}
            <b className="font-semibold text-text">
              These are {kinds.size} different kinds of product
            </b>
            , and each kind is scored against its own bands — so read down a column, not across a
            row.
          </>
        )}
      </p>
    </section>
  );
}
