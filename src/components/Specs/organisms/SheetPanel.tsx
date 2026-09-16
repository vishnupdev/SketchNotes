"use client";

import { useState } from "react";
import { useSpecsStore } from "@/store/useSpecsStore";
import { exportSheet } from "@/lib/Specs/export";
import { useProduct } from "@/hooks/useSpecs";
import { ProductMissingError } from "@/lib/Specs/client";
import { ProductHead } from "@/components/Specs/molecules/ProductHead";
import { ImageStrip } from "@/components/Specs/molecules/ImageStrip";
import { SpecRow } from "@/components/Specs/molecules/SpecRow";
import { ExportBar } from "@/components/Specs/molecules/ExportBar";
import { SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";

/**
 * The spec sheet itself: every specification the source states, grouped and in
 * the source's own order.
 *
 * Nothing is hidden behind a "show more". The app exists to answer "what is
 * this thing actually made of", and a sheet that folds two thirds of itself
 * away has answered a different, easier question. The grouping is what makes
 * the full list readable instead (see `lib/Specs/categories.ts`).
 */
export function SheetPanel() {
  const openTitle = useSpecsStore((s) => s.openTitle);
  // Local, not in the store: a filter is about the sheet you are reading right
  // now, and one left on from a product three lookups ago would hide most of
  // the next sheet for no reason a reader could see.
  const [filter, setFilter] = useState("");
  const setTab = useSpecsStore((s) => s.setTab);
  const { data: product, isPending, error } = useProduct(openTitle);

  if (!openTitle) {
    return (
      <PanelNote
        title="No product open yet"
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
        Search for something on the Find tab and its full sheet appears here — every specification
        the source states, grouped and in its own order.
      </PanelNote>
    );
  }

  if (error) {
    // The two "there is nothing to show" outcomes are genuinely different
    // answers, and a reader can act on each: a wrong name is worth retyping, an
    // article with no table never will be, whatever they type.
    if (error instanceof ProductMissingError) {
      return (
        <PanelNote
          title={error.reason === "no-specs" ? "That article has no spec table" : "No article by that name"}
          action={
            <button
              type="button"
              onClick={() => setTab("find")}
              className="tint h-8 rounded-[10px] border border-border px-3 text-[12px] font-semibold hover:border-accent hover:text-accent"
            >
              Search again
            </button>
          }
        >
          {error.reason === "no-specs"
            ? `“${openTitle}” has an article, but nobody has added a specification table to it — so there is nothing here to show. A specific model often has one where the product line does not: try “Classic 350” rather than “Classic”.`
            : `Nothing is filed under “${openTitle}”. Try the model name as it is sold.`}
        </PanelNote>
      );
    }

    return (
      <PanelNote title="Couldn’t load that sheet" tone="alert">
        {error.message}
      </PanelNote>
    );
  }

  // Checked after the error branch so a failure is reported rather than left
  // looking like a load that never finishes.
  if (isPending || !product) {
    return (
      <PanelNote title="Reading the sheet…">
        Fetching the specification table for “{openTitle}”.
      </PanelNote>
    );
  }

  // Matched on the label *and* the value, so "5000" finds the battery row and
  // "wireless" finds charging — a spec sheet is searched by what a row says at
  // least as often as by what it is called.
  const needle = filter.trim().toLowerCase();
  const groups = needle
    ? product.groups
        .map((group) => ({
          ...group,
          fields: group.fields.filter(
            (field) =>
              field.label.toLowerCase().includes(needle) || field.value.toLowerCase().includes(needle),
          ),
        }))
        .filter((group) => group.fields.length > 0)
    : product.groups;

  const shown = groups.reduce((n, group) => n + group.fields.length, 0);
  const total = product.groups.reduce((n, group) => n + group.fields.length, 0);

  return (
    <article className="flex flex-col gap-5">
      <ProductHead product={product} />

      <ImageStrip images={product.images} name={product.name} />

      {total > 8 && (
        /* A search box is a control, not part of the printed document. */
        <div data-print="hide" className="flex flex-col gap-1.5">
          <label
            htmlFor="specs-filter"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Find in this sheet
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              <SearchIcon size={15} aria-hidden="true" />
            </span>
            <input
              id="specs-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="battery, 120 Hz, wireless…"
              autoComplete="off"
              className="h-9 w-full rounded-[10px] border border-border bg-paper pl-9 pr-3 text-[13px] focus:border-accent focus:outline-none"
            />
          </div>
          <p aria-live="polite" className="text-[11px] text-ink-soft">
            {needle
              ? `${shown} of ${total} specifications match “${filter.trim()}”.`
              : `${total} specifications on this sheet.`}
          </p>
        </div>
      )}

      {needle && shown === 0 && (
        <PanelNote title={`Nothing on this sheet mentions “${filter.trim()}”`}>
          The search covers both the name of a specification and its value. This sheet may simply
          not state it — what an article carries varies a great deal from product to product.
        </PanelNote>
      )}

      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-1.5">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            {group.title}
          </h3>
          <dl className="rounded-[14px] border border-border bg-panel px-4 py-1">
            {group.fields.map((field) => (
              <SpecRow key={field.key} label={field.label} value={field.value} />
            ))}
          </dl>
        </section>
      ))}

      <ExportBar
        build={(format) => exportSheet(product, format)}
        name={product.name}
        label="this sheet"
      />
    </article>
  );
}
