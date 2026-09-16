"use client";

import { useProduct } from "@/hooks/useSpecs";
import { diffMeasures, summariseDiff, type ChangeKind } from "@/lib/Specs/compare";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { cx } from "@/lib/utils";
import type { ProductRecord } from "@/lib/Specs/types";

/**
 * A word for each kind of change, so nothing is carried by colour alone.
 *
 * "better" and "worse" rather than "up" and "down", because the percentage
 * beside them already says which way the *number* went and the two do not
 * always agree: a phone gaining 6% of its weight is "+6%" and worse. Labelling
 * that row "down" while showing "+6%" is the one pairing guaranteed to be
 * misread.
 *
 * This is a per-measure judgement the app is willing to make — heavier is worse,
 * more battery is better — and quite separate from the overall "worth
 * upgrading" verdict it deliberately refuses to give.
 */
const KIND_LABEL: Record<ChangeKind, string> = {
  improved: "better",
  reduced: "worse",
  same: "same",
  added: "new",
  dropped: "gone",
};

/**
 * What changed between this product and the one it replaced.
 *
 * This answers the question most product lookups are really asking — *is it
 * worth upgrading* — and it is cheap to answer well, because the article
 * already names its own predecessor and the measures are already normalised.
 *
 * Three decisions keep it honest:
 *
 *  - **It never gives a verdict.** No "worth it" or "skip it": it lists what
 *    moved and by how much, and the reader decides. A spec sheet cannot know
 *    what you use a phone for.
 *  - **"Up" is not always "better", and the wording knows it.** A heavier phone
 *    is a bigger number and a worse outcome, so direction of *change* and
 *    direction of *improvement* are tracked separately (see `lib/Specs/compare.ts`).
 *  - **Unchanged measures are listed, not hidden.** "The battery is the same"
 *    is an answer someone is looking for; leaving it out would read as "not
 *    stated", which is a different and wrong claim.
 */
export function WhatChanged({ product }: { product: ProductRecord }) {
  // The article's own word for what this replaced — editorial, not inferred.
  const previousTitle = product.relatives.find((r) => r.relation === "predecessor")?.title ?? null;
  const { data: previous, isPending, error } = useProduct(previousTitle);

  if (!previousTitle) return null;

  if (error) {
    // Not an alert: the sheet beside it is fine, and one failed extra lookup is
    // not something to shout about.
    return (
      <PanelNote title={`Couldn’t load the ${previousTitle}`}>
        This product replaced the {previousTitle}, but its sheet didn’t load, so there is nothing to
        compare against.
      </PanelNote>
    );
  }

  if (isPending || !previous) {
    return <PanelNote title={`Comparing with the ${previousTitle}…`}>Reading the older sheet.</PanelNote>;
  }

  const changes = diffMeasures(product.measures, previous.measures);
  if (!changes.length) return null;

  const moved = changes.filter((c) => c.kind !== "same");
  const unchanged = changes.filter((c) => c.kind === "same");

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
        What changed since the {previous.name}
      </h3>

      <div className="rounded-[14px] border border-border bg-panel px-4 py-1">
        <p className="border-b border-border py-2.5 text-[12px] leading-relaxed text-ink-soft">
          {summariseDiff(changes)} Against the {previous.name}, which this one replaced according to
          its own article.
        </p>

        <ul>
          {[...moved, ...unchanged].map((change) => (
            <li
              key={change.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0"
            >
              <span className="font-mono text-[10px] uppercase tracking-[.13em] text-ink-soft">
                {change.label}
              </span>

              <span className="flex items-baseline gap-2 font-mono text-[12px] tabular-nums">
                {/* An unchanged measure is one value, not a transition. Drawing
                    "8 GB → 8 GB" with the first struck through says something
                    was removed, and the two readings can differ in wording
                    ("120 Hz" against "120 hz") while meaning the same number —
                    which makes the arrow look like a change that isn't one. */}
                {change.kind === "same" ? (
                  <span className="text-ink-soft">{change.to ?? change.from}</span>
                ) : (
                  <>
                    {change.from && <span className="text-ink-soft line-through">{change.from}</span>}
                    {change.from && change.to && (
                      <span aria-hidden="true" className="text-ink-soft">
                        →
                      </span>
                    )}
                    {change.to && <span className="text-text">{change.to}</span>}
                  </>
                )}

                <span
                  className={cx(
                    "rounded-[6px] px-1.5 py-0.5 text-[9.5px] uppercase tracking-[.08em]",
                    change.kind === "improved" && "bg-accent-soft text-accent",
                    change.kind === "reduced" && "border border-border text-text",
                    change.kind === "same" && "text-ink-soft",
                    (change.kind === "added" || change.kind === "dropped") &&
                      "border border-border text-ink-soft",
                  )}
                >
                  {KIND_LABEL[change.kind]}
                  {change.percent !== null && change.kind !== "same" && (
                    <> {change.percent > 0 ? "+" : ""}{Math.round(change.percent)}%</>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] leading-snug text-ink-soft">
        The percentage is how much the <i>number</i> moved; the word beside it is whether that is an
        improvement — not the same thing, which is why a phone that gained 6% of its weight reads
        &ldquo;worse +6%&rdquo;. Release year is left out, since a successor is newer by definition,
        and a figure moving less than half a percent counts as unchanged because that is below the
        sources&rsquo; own rounding. Whether any of it is worth paying for is not a question this app
        answers.
      </p>
    </section>
  );
}
