"use client";

import { MAX_COMPARE, useSpecsStore } from "@/store/useSpecsStore";
import { ProductRow } from "@/components/Specs/molecules/ProductRow";
import { PinOffIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The products you are actually deciding between.
 *
 * Separate from "opened before" on purpose, and the distinction is the whole
 * point: recents are a trail the app keeps *for* you and trims when it gets
 * long, while a shortlist is something you chose, so nothing ever falls off it
 * silently. Opening a sheet you did not want is not a decision; keeping it is.
 *
 * "Compare these" is what it is for. It fills the comparison on the Similar tab
 * from the shortlist in one tap, which is the step that otherwise means finding
 * each product again and ticking it.
 */
export function ShortlistPanel() {
  const shortlist = useSpecsStore((s) => s.shortlist);
  const toggleShortlist = useSpecsStore((s) => s.toggleShortlist);
  const clearShortlist = useSpecsStore((s) => s.clearShortlist);
  const openProduct = useSpecsStore((s) => s.openProduct);
  const openTitle = useSpecsStore((s) => s.openTitle);
  const toggleCompare = useSpecsStore((s) => s.toggleCompare);
  const setTab = useSpecsStore((s) => s.setTab);

  if (!shortlist.length) return null;

  /**
   * Open the first, and put the rest beside it.
   *
   * A comparison is always *against* an open product, so the shortlist's first
   * entry becomes the sheet and the others become its columns. `openProduct`
   * clears any existing comparison, so the ticks have to be added after it.
   */
  const compareAll = () => {
    const [first, ...rest] = shortlist;
    openProduct(first);
    for (const product of rest.slice(0, MAX_COMPARE)) toggleCompare(product.title);
    setTab("similar");
  };

  const overflow = shortlist.length - 1 - MAX_COMPARE;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Shortlist — {shortlist.length}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {shortlist.length > 1 && (
            <button
              type="button"
              onClick={compareAll}
              className="tint h-7 rounded-[9px] border border-border px-2.5 text-[11px] font-semibold hover:border-accent hover:text-accent"
            >
              Compare these
            </button>
          )}
          <button
            type="button"
            onClick={clearShortlist}
            className="tint h-7 rounded-[9px] border border-border px-2.5 text-[11px] hover:border-accent hover:text-accent"
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="rounded-[14px] border border-border bg-panel px-2">
        {shortlist.map((hit) => (
          <ProductRow
            key={hit.title}
            name={hit.name}
            detail={hit.description}
            image={hit.image}
            selected={hit.title === openTitle}
            onOpen={() => openProduct(hit)}
            action={
              <button
                type="button"
                onClick={() => toggleShortlist(hit)}
                title={`Take ${hit.name} off the shortlist`}
                aria-label={`Take ${hit.name} off the shortlist`}
                className="tint grid size-9 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-accent"
              >
                <PinOffIcon size={15} />
              </button>
            }
          />
        ))}
      </ul>

      <p className="text-[11px] leading-snug text-ink-soft">
        Kept in this browser until you remove them — unlike the recents below, nothing drops off
        this list on its own.
        {overflow > 0 && (
          <>
            {" "}
            A comparison holds {MAX_COMPARE} products beside the one you open, so &ldquo;compare
            these&rdquo; will take the first {MAX_COMPARE + 1} and leave {overflow} out.
          </>
        )}
      </p>
    </section>
  );
}
