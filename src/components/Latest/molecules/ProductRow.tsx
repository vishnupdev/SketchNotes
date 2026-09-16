"use client";

import { CATEGORY_LABELS } from "@/lib/Latest/categories";
import { ageLabel, priceLabel, releaseLabel } from "@/lib/Latest/format";
import { SaveButton } from "@/components/Latest/atoms/SaveButton";
import { cx } from "@/lib/utils";
import type { ProductView } from "@/lib/Latest/types";

/**
 * One product in a list of them.
 *
 * The whole row opens the sheet, because that is the only thing anyone wants
 * from a row in a product list; the save control stays outside that hit area so
 * a thumb aiming for the row never lands on it.
 *
 * ## What each row has to carry, and why
 *
 * A list that shows only names makes the reader open every row to compare
 * anything, so each row carries the four facts a browsing decision actually
 * turns on — **brand, release date, how old it is, and the launch price** —
 * and nothing else. The age line is the one that is easy to dismiss and is the
 * reason the app exists: "September 2025" requires a reader to know today's
 * date and do arithmetic before they know whether they are looking at something
 * current, and "This month" does not.
 *
 * No product photographs. Every image here would be a manufacturer's press
 * render fetched from a third-party origin, which would mean a request per row
 * to somewhere this workspace does not otherwise talk to, a layout shift when
 * each lands, and a licensing question per picture. The brand initial in a
 * fixed-size tile costs nothing, shifts nothing, and is honest about being a
 * placeholder rather than a photograph.
 */
export function ProductRow({
  product,
  saved,
  onOpen,
  onToggleSave,
  selected,
  /** Draws the category alongside the brand — for lists that mix kinds. */
  showCategory = false,
}: {
  product: ProductView;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
  selected?: boolean;
  showCategory?: boolean;
}) {
  const age = ageLabel(product.released);

  return (
    /* gap-2 rather than gap-1: the row button and the save control are two
       adjacent touch targets, and 4px between them is below what an
       accessibility audit — and a thumb — asks for. */
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
        <span
          aria-hidden="true"
          className="grid size-11 flex-none place-items-center rounded-[9px] border border-border bg-panel font-mono text-[15px] font-semibold text-ink-soft"
        >
          {product.brand.name.slice(0, 1).toUpperCase()}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[13.5px] font-semibold">{product.name}</span>
            {product.status === "announced" && (
              <span className="flex-none rounded-full border border-accent px-1.5 font-mono text-[9px] uppercase tracking-[.1em] text-accent">
                Announced
              </span>
            )}
          </span>

          <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">
            {product.brand.name}
            {showCategory && ` · ${CATEGORY_LABELS[product.category]}`} · {releaseLabel(product.released)}
          </span>

          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px] text-ink-soft">
            <span className="font-mono">{priceLabel(product.priceUsd)}</span>
            {age && <span aria-hidden="true">·</span>}
            {age && <span>{age}</span>}
          </span>
        </span>
      </button>

      <SaveButton saved={saved} onToggle={onToggleSave} name={product.name} />
    </li>
  );
}
