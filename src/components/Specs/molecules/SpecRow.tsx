"use client";

import { PART_SEP } from "@/lib/Specs/wikitext";

/**
 * One specification: its label, and what the source says it is.
 *
 * A value holding several variants — a phone sold in three sizes, a car with
 * four engines — arrives as a `PART_SEP`-joined run and is broken back into a
 * list here. That is the whole reason this isn't a one-line `<dd>`: rendering
 * "S24: 4000 mAh · S24+: 4900 mAh · S24 Ultra: 5000 mAh" as one paragraph is
 * readable on a desktop and a wall of text on a phone, where most of this will
 * be read.
 *
 * Marked up as a description list pair, which is what a spec sheet *is*, so the
 * label/value relationship survives for a screen reader rather than being two
 * unrelated runs of text that happen to sit next to each other.
 */
export function SpecRow({ label, value }: { label: string; value: string }) {
  const parts = value.split(PART_SEP).filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-border py-2.5 last:border-b-0 min-[520px]:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)]">
      <dt className="font-mono text-[10px] uppercase leading-relaxed tracking-[.13em] text-ink-soft">
        {label}
      </dt>
      <dd className="min-w-0 text-[13px] leading-relaxed text-text">
        {parts.length > 1 ? (
          <ul className="flex flex-col gap-1">
            {parts.map((part, i) => (
              <li key={`${part}-${i}`} className="break-words">
                {part}
              </li>
            ))}
          </ul>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  );
}
