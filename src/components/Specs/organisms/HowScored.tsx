"use client";

import { useState } from "react";
import { publishedBands, UNSCORED_REASON } from "@/lib/Specs/score";
import type { ProductCategory } from "@/lib/Specs/types";

/**
 * The scoring method, shown to the reader rather than asserted at them.
 *
 * This app's whole claim about its score is that it is *arithmetic over
 * published bands* — reproducible by hand, and disagreeable-with on the
 * evidence. Until now those bands existed only in `lib/Specs/score.ts`, which
 * makes the claim true of the repository and merely a promise to anybody
 * actually reading a number. A transparent score that cannot be inspected from
 * the screen it appears on is asking for trust while calling itself
 * transparency.
 *
 * So every band is here: both endpoints, the share of the total each axis
 * carries, which direction counts as better, and the caveat where the measure
 * is only a proxy. Collapsed by default — it is the working, not the answer,
 * and someone who wants the answer should not have to scroll past the method to
 * reach it.
 */
export function HowScored({ category, categoryLabel }: { category: ProductCategory; categoryLabel: string }) {
  const [open, setOpen] = useState(false);

  const bands = publishedBands(category);
  const unscored = UNSCORED_REASON[category];

  // Nothing to show for a category with neither bands nor a stated reason.
  if (!bands.length && !unscored) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((on) => !on)}
        aria-expanded={open}
        aria-controls="specs-method"
        className="tint flex items-center justify-between gap-3 rounded-[14px] border border-border bg-panel px-4 py-3 text-left hover:border-accent"
      >
        <span>
          <span className="block text-[13px] font-semibold">
            How a {categoryLabel.toLowerCase()} is scored
          </span>
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">
            {bands.length
              ? `${bands.length} axes, every band written out — check the working`
              : "Why this kind of product carries no score"}
          </span>
        </span>
        <span aria-hidden="true" className="flex-none font-mono text-[11px] text-ink-soft">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div id="specs-method" className="flex flex-col gap-2">
          {!bands.length && unscored && (
            <p className="rounded-[14px] border border-border bg-panel px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
              {unscored}
            </p>
          )}

          {!!bands.length && (
            <>
              <dl className="rounded-[14px] border border-border bg-panel px-4 py-1">
                {bands.map((axis) => (
                  <div key={axis.id} className="border-b border-border py-2.5 last:border-b-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[.13em] text-ink-soft">
                        {axis.label}
                      </dt>
                      <dd className="font-mono text-[11.5px] tabular-nums text-text">
                        {axis.worst} <span className="text-ink-soft">→</span> {axis.best}
                        <span className="ml-2 text-ink-soft">
                          {Math.round(axis.share * 100)}% of the score
                        </span>
                      </dd>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                      {axis.lowerBetter
                        ? "Smaller is better, so the scale runs downwards."
                        : "Larger is better."}
                      {axis.caveat ? ` ${axis.caveat}` : ""}
                    </p>
                  </div>
                ))}
              </dl>

              <p className="text-[11px] leading-relaxed text-ink-soft">
                A stated measure is placed on its scale — at or past an endpoint it scores 100 or 0 —
                and the axes the sheet answers are averaged by the shares above, re-weighted among
                themselves so a missing measure neither helps nor hurts.{" "}
                <b className="font-semibold text-text">Anything the sheet omits scores nothing, not
                zero</b>, because absence is not a claim; how much was actually measured is the line
                above the dial. Measures whose direction is ambiguous are left out of the score
                entirely — a bigger screen is not a better screen — and{" "}
                <b className="font-semibold text-text">this is a measure of what the maker claims</b>,
                not of what the thing is like to own.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
