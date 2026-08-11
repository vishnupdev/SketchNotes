import type { ReactNode } from "react";

interface DetailTileProps {
  icon: ReactNode;
  /** What the figure is, e.g. "Population". */
  label: string;
  /** The figure itself. */
  value: ReactNode;
  /** Optional qualifier under the value — a unit, a caveat, a year. */
  note?: string;
}

/**
 * One fact in the country details grid.
 *
 * A `<dl>` row rather than a generic box: the grid is a list of term/definition
 * pairs, and marking it up as one is what lets a screen reader announce
 * "Population — 1.44 billion" instead of two unrelated strings.
 */
export function DetailTile({ icon, label, value, note }: DetailTileProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-panel p-3.5">
      <span aria-hidden className="mt-0.5 flex-none text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">{label}</dt>
        <dd className="mt-1 text-[14px] font-semibold leading-snug">{value}</dd>
        {note && <dd className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{note}</dd>}
      </div>
    </div>
  );
}
