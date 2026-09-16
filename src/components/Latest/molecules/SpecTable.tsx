"use client";

import type { SpecGroup } from "@/lib/Latest/types";

/**
 * The full sheet: every group, every row.
 *
 * Marked up as a **description list**, because that is what a spec sheet is.
 * The alternative — two runs of `<div>`s that merely sit beside each other —
 * looks identical and loses the label/value relationship entirely for anyone
 * reading with a screen reader, which is the population that most needs the
 * structure.
 *
 * The layout collapses to a single column under 520px and becomes two columns
 * above it. That threshold is not arbitrary: a "Peak brightness" label and a
 * "1000 nits full screen, 1600 nits peak HDR" value cannot share a line on a
 * 360px screen without one of them wrapping to three words a line, and a value
 * that ragged is harder to read than a stacked pair.
 */
export function SpecTable({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section
          key={group.title}
          className="rounded-[14px] border border-border bg-panel px-4 pb-1.5 pt-3"
        >
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
            {group.title}
          </h3>

          <dl className="mt-1.5">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-border py-2.5 last:border-b-0 min-[520px]:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"
              >
                <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[.13em] text-ink-soft">
                  {item.label}
                </dt>
                <dd className="min-w-0 break-words text-[13px] leading-relaxed text-text">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
