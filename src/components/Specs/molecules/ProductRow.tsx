"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * One product in a list of them — a search result, a recent sheet, or a
 * neighbour on the Similar tab.
 *
 * The whole row opens the sheet, because that is the only thing anyone wants
 * from a row of results; a trailing control (compare, forget) stays out of that
 * hit area so a thumb aiming for the row never lands on it.
 *
 * The thumbnail is fixed at 44×44 with explicit `width`/`height` attributes and
 * `loading="lazy"`. Both matter for rule #7: a list of twenty results would
 * otherwise fetch twenty images at once, and an image without dimensions shifts
 * every row beneath it when it lands.
 */
export function ProductRow({
  name,
  detail,
  image,
  badge,
  onOpen,
  action,
  selected,
}: {
  name: string;
  /** The one-line description, or whatever the list wants underneath. */
  detail?: string;
  image?: string | null;
  /** Small tag at the end of the name — how this product relates to the open one. */
  badge?: string;
  onOpen: () => void;
  /** Trailing control, e.g. a compare toggle. */
  action?: ReactNode;
  /** Draws the row as the one currently open. */
  selected?: boolean;
}) {
  return (
    /* `gap-2` rather than `gap-1`: the row button and its trailing control are
       two adjacent touch targets, and 4px between them is below the spacing an
       accessibility audit (and a thumb) asks for. */
    <li className="flex items-center gap-2 border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        aria-current={selected ? "true" : undefined}
        className={cx(
          "tint flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-2.5 text-left",
          selected ? "text-accent" : "hover:text-accent",
        )}
      >
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="size-11 flex-none rounded-[9px] border border-border bg-panel object-contain p-0.5"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 flex-none place-items-center rounded-[9px] border border-border bg-panel font-mono text-[15px] text-ink-soft"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[13.5px] font-semibold">{name}</span>
            {badge && (
              <span className="flex-none font-mono text-[9px] uppercase tracking-[.12em] text-ink-soft">
                {badge}
              </span>
            )}
          </span>
          {detail && <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{detail}</span>}
        </span>
      </button>
      {action}
    </li>
  );
}
