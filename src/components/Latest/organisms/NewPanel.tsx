"use client";

import { useLatestStore } from "@/store/useLatestStore";
import { useFeed } from "@/hooks/useLatest";
import { CATEGORIES, categoryById, feedYears } from "@/lib/Latest/categories";
import { productsByCategory } from "@/lib/Latest/catalog";
import { CATALOG_REVIEWED } from "@/lib/Latest/types";
import { reviewedLabel } from "@/lib/Latest/format";
import { Chip, ChipRail } from "@/components/Latest/atoms/Chip";
import { ProductRow } from "@/components/Latest/molecules/ProductRow";
import { FeedRow } from "@/components/Latest/molecules/FeedRow";
import { PanelNote } from "@/components/Latest/molecules/PanelNote";

/**
 * What is new, by kind of product.
 *
 * The panel is two lists stacked, and keeping them visibly apart is the whole
 * design:
 *
 *  1. **The catalogue** — the curated products, newest first, each with a
 *     complete sheet behind it and the maker's own specification page linked
 *     from it. This is what the app is for.
 *  2. **Newly listed** — what an encyclopedia's "introduced in <year>"
 *     categories have gained, which keeps arriving long after anybody edited
 *     the catalogue. These are *links*, not sheets, and they are drawn as links
 *     (see {@link FeedRow}) so the difference is legible without reading a word
 *     of explanation.
 *
 * The second list is what stops the first from silently going stale, and the
 * heading above the first states the date it was last reviewed rather than
 * leaving a reader to assume.
 */
export function NewPanel() {
  const categoryId = useLatestStore((s) => s.category);
  const setCategory = useLatestStore((s) => s.setCategory);
  const feedYear = useLatestStore((s) => s.feedYear);
  const setFeedYear = useLatestStore((s) => s.setFeedYear);
  const openProduct = useLatestStore((s) => s.openProduct);
  const openId = useLatestStore((s) => s.openId);
  const saved = useLatestStore((s) => s.saved);
  const toggleSaved = useLatestStore((s) => s.toggleSaved);

  const category = categoryById(categoryId);
  const products = productsByCategory(category.id);
  const { data: feed, isFetching, error } = useFeed(category.id, feedYear);

  return (
    <div className="flex flex-col gap-4">
      <ChipRail label="Kind of product">
        {CATEGORIES.map((option) => (
          <Chip
            key={option.id}
            selected={option.id === category.id}
            onClick={() => setCategory(option.id)}
          >
            {option.name}
          </Chip>
        ))}
      </ChipRail>

      <p className="text-[11.5px] leading-snug text-ink-soft">{category.note}</p>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            {products.length} {category.plural} — full specifications
          </h3>
          <p className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft">
            Reviewed {reviewedLabel(CATALOG_REVIEWED)}
          </p>
        </div>

        {products.length === 0 ? (
          <PanelNote title={`No ${category.plural} listed yet`}>
            This kind has no products in the catalogue yet. The newly-listed rows below still
            work, and every other category has full sheets.
          </PanelNote>
        ) : (
          <ul className="rounded-[14px] border border-border bg-panel px-2">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                saved={saved.includes(product.id)}
                selected={product.id === openId}
                onOpen={() => openProduct(product.id)}
                onToggleSave={() => toggleSaved(product.id)}
              />
            ))}
          </ul>
        )}

        <p className="text-[11px] leading-snug text-ink-soft">
          Every figure on these sheets is the manufacturer&rsquo;s own published specification, and
          each sheet links the page it came from. Prices are the launch price, not a live quote.
        </p>
      </section>

      <section aria-busy={isFetching} className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Newly listed elsewhere
        </h3>

        {category.feed === null ? (
          <PanelNote title={`No live listings for ${category.plural}`}>{category.feedGap}</PanelNote>
        ) : (
          <>
            <ChipRail label="Year of introduction">
              {feedYears().map((year) => (
                <Chip
                  key={year}
                  size="sm"
                  selected={year === feedYear}
                  onClick={() => setFeedYear(year)}
                >
                  {year}
                </Chip>
              ))}
            </ChipRail>

            {error && (
              <PanelNote title="Couldn’t load the new listings" tone="alert">
                {error.message} The catalogue above needs no connection and is unaffected.
              </PanelNote>
            )}

            {!error && !isFetching && feed?.length === 0 && (
              <PanelNote title={`Nothing listed for ${feedYear}`}>
                No {category.plural} have been filed under that year yet. Try an earlier one — and
                note that the newest year fills up over its course rather than all at once.
              </PanelNote>
            )}

            {category.feed.scope && (
              <p className="text-[11px] leading-snug text-ink-soft">{category.feed.scope}</p>
            )}

            {!!feed?.length && (
              <>
                <ul className="rounded-[14px] border border-border bg-panel px-2">
                  {feed.map((item) => (
                    <FeedRow key={item.title} item={item} />
                  ))}
                </ul>
                <p className="text-[11px] leading-snug text-ink-soft">
                  <b className="font-semibold text-text">These are links, not sheets.</b> They come
                  from an open encyclopedia&rsquo;s own &ldquo;introduced in {feedYear}&rdquo;
                  category, so they keep arriving after the catalogue above was last reviewed — but
                  they carry a description rather than specifications. Open one to read it at the
                  source.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
