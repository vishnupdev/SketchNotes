"use client";

import { useLatestStore } from "@/store/useLatestStore";
import { productById, searchCatalog } from "@/lib/Latest/catalog";
import { ProductRow } from "@/components/Latest/molecules/ProductRow";
import { PanelNote } from "@/components/Latest/molecules/PanelNote";
import { SearchIcon } from "@/components/SketchNotes/atoms/icons";
import type { ProductView } from "@/lib/Latest/types";

/**
 * Search the catalogue, and the shortlist you are deciding from.
 *
 * The two share a panel because they are the same activity at two stages —
 * finding a candidate, and keeping it — and separating them would mean tabbing
 * back and forth to build a list of three products.
 *
 * The search is a plain input rather than a live-filtering one against the
 * network, because the catalogue is already in memory: there is no request to
 * debounce and no loading state to design, so filtering per keystroke is both
 * free and the better behaviour.
 *
 * Saved products are kept in this browser only, under `sknotes:latest:`. They
 * are never uploaded, and the panel says so — a "saved" list that quietly syncs
 * somewhere is a different product from one that does not.
 */
export function SavedPanel() {
  const query = useLatestStore((s) => s.query);
  const setQuery = useLatestStore((s) => s.setQuery);
  const saved = useLatestStore((s) => s.saved);
  const toggleSaved = useLatestStore((s) => s.toggleSaved);
  const clearSaved = useLatestStore((s) => s.clearSaved);
  const openProduct = useLatestStore((s) => s.openProduct);
  const openId = useLatestStore((s) => s.openId);

  const results = searchCatalog(query);
  const searching = query.trim().length >= 2;

  // An id that no longer resolves is dropped rather than drawn as a broken row:
  // a product can genuinely leave the catalogue between visits.
  const items = saved
    .map(productById)
    .filter((product): product is ProductView => product !== null);

  return (
    <div className="flex flex-col gap-4">
      <search className="flex flex-col gap-2">
        <label htmlFor="latest-search" className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Search the catalogue
        </label>
        <div className="flex items-center gap-2 rounded-[12px] border border-border bg-panel px-3">
          <SearchIcon size={16} aria-hidden="true" className="flex-none text-ink-soft" />
          <input
            id="latest-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A product, a maker, or a kind"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none placeholder:text-ink-soft"
          />
        </div>
      </search>

      {searching && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft" aria-live="polite">
            {results.length} {results.length === 1 ? "match" : "matches"} for &ldquo;{query.trim()}&rdquo;
          </h3>

          {results.length === 0 ? (
            <PanelNote title="Nothing matches that">
              The search covers product names, makers and kinds — not the specification rows, since
              a number like &ldquo;120&rdquo; appears in a refresh rate, a battery figure and a
              model number at once. Try a maker&rsquo;s name, or browse a category under{" "}
              <b className="font-semibold text-text">New</b>.
            </PanelNote>
          ) : (
            <ul className="rounded-[14px] border border-border bg-panel px-2">
              {results.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  saved={saved.includes(product.id)}
                  selected={product.id === openId}
                  onOpen={() => openProduct(product.id)}
                  onToggleSave={() => toggleSaved(product.id)}
                  showCategory
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Saved — {items.length}
          </h3>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearSaved}
              className="tint rounded-full border border-border px-3 py-1 text-[11px] hover:border-accent hover:text-accent"
            >
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <PanelNote title="Nothing saved yet">
            The bookmark on any product row keeps it here, so a shortlist survives moving between
            categories and closing the tab. It stays in this browser — nothing is uploaded.
          </PanelNote>
        ) : (
          <>
            <ul className="rounded-[14px] border border-border bg-panel px-2">
              {items.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  saved
                  selected={product.id === openId}
                  onOpen={() => openProduct(product.id)}
                  onToggleSave={() => toggleSaved(product.id)}
                  showCategory
                />
              ))}
            </ul>
            <p className="text-[11px] leading-snug text-ink-soft">
              In the order you saved them, and kept in this browser under{" "}
              <code className="font-mono text-[10.5px]">sknotes:latest:</code> — never uploaded.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
