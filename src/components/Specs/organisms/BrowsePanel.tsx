"use client";

import { useSpecsStore } from "@/store/useSpecsStore";
import { useBrowse } from "@/hooks/useSpecs";
import { BROWSE_KINDS, kindById, sourceById } from "@/lib/Specs/catalog";
import { ProductRow } from "@/components/Specs/molecules/ProductRow";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { cx } from "@/lib/utils";

/**
 * Browsing, for when you do not have a name to type.
 *
 * Two rows of chips — a kind, then a maker or a year — over a list. Search
 * answers "what are the specs of the thing I already named"; this answers
 * "show me the phones", which is a different question and cannot be reached
 * through a search box at all.
 *
 * The lists come from encyclopedia categories, which is what makes them
 * *enumerations* rather than guesses: "Samsung mobile phones" is a maintained
 * list of 117 handsets, not the top few results for a query. Where a maker has
 * no such category — Asus and Acer laptops, for instance — the catalogue falls
 * back to a search and the copy stops promising completeness.
 *
 * Ordered newest-first by the year in each product's own description, because
 * the API returns category members in the order their articles were *written*,
 * which is meaningless to a reader shopping for a phone.
 */
export function BrowsePanel() {
  const kindId = useSpecsStore((s) => s.browseKind);
  const sourceId = useSpecsStore((s) => s.browseSource);
  const setKind = useSpecsStore((s) => s.setBrowseKind);
  const setSource = useSpecsStore((s) => s.setBrowseSource);
  const openProduct = useSpecsStore((s) => s.openProduct);
  const openTitle = useSpecsStore((s) => s.openTitle);

  const kind = kindById(kindId);
  const source = sourceById(kind, sourceId);
  const { data: hits, isFetching, error } = useBrowse(kind.id, source.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Or browse by kind
        </h3>
        <div
          role="tablist"
          aria-label="Kind of product"
          className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
        >
          {BROWSE_KINDS.map((option) => {
            const selected = option.id === kind.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setKind(option.id)}
                className={cx(
                  "h-8 flex-none rounded-full border px-3.5 text-[12px]",
                  selected
                    ? "border-accent bg-accent text-on-accent"
                    : "tint border-border hover:border-accent hover:text-accent",
                )}
                style={{ transition: "var(--fx)" }}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="tablist"
          aria-label={`${kind.name} — maker or list`}
          className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
        >
          {kind.sources.map((option) => {
            const selected = option.id === source.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSource(option.id)}
                className={cx(
                  "h-7 flex-none rounded-full border px-3 text-[11.5px]",
                  selected
                    ? "border-accent text-accent"
                    : "tint border-border text-ink-soft hover:border-accent hover:text-accent",
                )}
                style={{ transition: "var(--fx)" }}
              >
                {option.name}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] leading-snug text-ink-soft">{kind.note}</p>
      </div>

      <section aria-busy={isFetching} className="flex flex-col gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {isFetching
            ? "Loading…"
            : `${source.name} ${kind.name.toLowerCase()}${hits?.length ? ` — ${hits.length}` : ""}`}
        </h4>

        {error && (
          <PanelNote title="Couldn’t load that list" tone="alert">
            {error.message} Browsing needs a connection — sheets you have already opened stay
            readable offline.
          </PanelNote>
        )}

        {!error && !isFetching && hits?.length === 0 && (
          <PanelNote title={`Nothing listed under ${source.name}`}>
            That list has no articles this app can show. Try another maker, or search for the exact
            model by name above.
          </PanelNote>
        )}

        {!!hits?.length && (
          <>
            <ul className="rounded-[14px] border border-border bg-panel px-2">
              {hits.map((hit) => (
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
            <p className="text-[11px] leading-snug text-ink-soft">
              {source.category ? (
                <>
                  Everything filed under the encyclopedia&rsquo;s{" "}
                  <b className="font-semibold text-text">{source.category}</b> category, newest
                  first. It is a maintained list rather than a search, so it is as complete as the
                  encyclopedia is.
                </>
              ) : (
                <>
                  <b className="font-semibold text-text">These are search results, not a list.</b>{" "}
                  {source.name} has no category of its own here, so this is the closest match rather
                  than every model — search by exact name above if you know it.
                </>
              )}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
