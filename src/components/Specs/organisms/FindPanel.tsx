"use client";

import { useSpecsStore } from "@/store/useSpecsStore";
import { useProductSearch } from "@/hooks/useSpecs";
import { ProductRow } from "@/components/Specs/molecules/ProductRow";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { BrowsePanel } from "@/components/Specs/organisms/BrowsePanel";
import { ShortlistPanel } from "@/components/Specs/organisms/ShortlistPanel";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { SearchIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Finding a product, and returning to one you have already looked at.
 *
 * Two ways in, because there are two kinds of visitor. One knows the model and
 * types it; the other wants to see what there is, and for them a search box is
 * a wall. {@link BrowsePanel} answers the second and takes the place a row of
 * example chips used to hold — it does the same job (a way in with no name to
 * type) with real lists instead of six suggestions.
 *
 * The search runs on submit, never per keystroke. The upstream is a shared
 * public service (see `lib/Specs/source.ts`), and typing "iphone 15 pro" into a
 * search-as-you-type box is thirteen requests to answer one question.
 */
export function FindPanel() {
  const query = useSpecsStore((s) => s.query);
  const term = useSpecsStore((s) => s.term);
  const setQuery = useSpecsStore((s) => s.setQuery);
  const submitQuery = useSpecsStore((s) => s.submitQuery);
  const openProduct = useSpecsStore((s) => s.openProduct);
  const openTitle = useSpecsStore((s) => s.openTitle);
  const recent = useSpecsStore((s) => s.recent);
  const forget = useSpecsStore((s) => s.forget);

  const { data: results, isFetching, error } = useProductSearch(term);

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuery(query);
        }}
        className="flex flex-col gap-2"
      >
        <label
          htmlFor="specs-search"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Name a product
        </label>
        <div className="flex gap-2">
          <input
            id="specs-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A phone, a car, a camera, a console…"
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-paper px-3 text-[13px] focus:border-accent focus:outline-none"
          />
          <PrimaryButton type="submit" disabled={query.trim().length < 2}>
            <SearchIcon size={15} aria-hidden="true" />
            Search
          </PrimaryButton>
        </div>
        <p className="text-[11px] leading-snug text-ink-soft">
          Anything with an encyclopedia article: phones, laptops, cameras, consoles, graphics cards,
          cars, motorcycles, aircraft. Model names work better than brands — “Galaxy S24” finds a
          sheet, “Samsung” finds a company.
        </p>
      </form>

      {!term && <BrowsePanel />}

      {term && (
        <section aria-busy={isFetching} className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            {isFetching ? "Searching…" : `Results for “${term}”`}
          </h3>

          {error && (
            <PanelNote title="That search didn’t get through" tone="alert">
              {error.message} Looking up a product needs a connection — sheets you have already
              opened stay readable offline.
            </PanelNote>
          )}

          {!error && !isFetching && results?.length === 0 && (
            <PanelNote title={`Nothing found for “${term}”`}>
              Try the model name as it is sold — “Pixel 9 Pro” rather than “Google phone” — or a
              generation, like “Corolla E210”. Not every product has an article: mid-range
              appliances and most accessories have none, and this app can only show what has been
              written down somewhere public.
            </PanelNote>
          )}

          {!!results?.length && (
            <ul className="rounded-[14px] border border-border bg-panel px-2">
              {results.map((hit) => (
                <ProductRow
                  key={hit.title}
                  name={hit.name}
                  detail={hit.description}
                  image={hit.image}
                  selected={hit.title === openTitle}
                  onOpen={() => openProduct(hit)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <ShortlistPanel />

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Opened before
          </h3>
          <ul className="rounded-[14px] border border-border bg-panel px-2">
            {recent.map((hit) => (
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
                    onClick={() => forget(hit.title)}
                    title={`Forget ${hit.name}`}
                    aria-label={`Forget ${hit.name}`}
                    className="tint grid size-9 flex-none place-items-center rounded-[10px] text-ink-soft hover:text-accent"
                  >
                    <TrashSmallIcon size={15} />
                  </button>
                }
              />
            ))}
          </ul>
          <p className="text-[11px] leading-snug text-ink-soft">
            This list is kept in this browser and goes nowhere. Sheets you have opened are also
            cached, so they open again without a connection.
          </p>
        </section>
      )}
    </div>
  );
}
