"use client";

import { useSpecsStore } from "@/store/useSpecsStore";
import { useProduct } from "@/hooks/useSpecs";
import { REGIONS, regionById, storeQuery, storesFor } from "@/lib/Specs/stores";
import { StoreRow } from "@/components/Specs/molecules/StoreRow";
import { PanelNote } from "@/components/Specs/molecules/PanelNote";
import { cx } from "@/lib/utils";

/**
 * Where to buy it, in whichever country you are buying it in.
 *
 * This panel deliberately quotes **no live prices**, and says so on screen
 * rather than leaving a reader to wonder why the column is missing. The reason
 * is written out in full in `lib/Specs/stores.ts`: no retailer publishes prices
 * without a credential, and the only keyless alternative is scraping, which
 * breaks constantly and yields a number the app could not stand behind. A wrong
 * price on a large purchase is worse than no price, so the app sends you to the
 * shop and lets the shop quote itself.
 *
 * The one figure it does state is the **launch price**, because that comes off
 * the spec sheet with a date attached — a historical fact, not a live claim,
 * and labelled as such.
 */
export function PricesPanel() {
  const openTitle = useSpecsStore((s) => s.openTitle);
  const setTab = useSpecsStore((s) => s.setTab);
  const regionId = useSpecsStore((s) => s.region);
  const setRegion = useSpecsStore((s) => s.setRegion);

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
        Open a product and this tab lists the shops that sell it, in whichever country you are
        buying in.
      </PanelNote>
    );
  }

  if (error) {
    return (
      <PanelNote title="Couldn’t load that product" tone="alert">
        {error.message}
      </PanelNote>
    );
  }

  if (isPending || !product) {
    return <PanelNote title="Reading the sheet…">The shop links are built from its name.</PanelNote>;
  }

  const region = regionById(regionId);
  const stores = storesFor(region);
  const term = storeQuery(product.name, product.maker);

  // The launch price, where the article stated one. It lives in the Overview
  // group as "Launch price"; finding it here rather than re-parsing keeps one
  // reading of the sheet.
  const launch = product.groups
    .flatMap((group) => group.fields)
    .find((field) => field.key === "price");

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Buying the {product.name}
        </h3>

        <div className="rounded-[14px] border border-border bg-panel p-4">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            <b className="font-semibold text-text">This app does not quote live prices.</b> No shop
            publishes them without a registered key, and the only way to get a number without one is
            to scrape the page — which breaks within days and gives you a figure that may be stale,
            for the wrong variant, or from a marketplace seller. On a purchase this size a wrong
            price is worse than no price, so every row below opens that shop&rsquo;s own results for
            this product, where the number is current by definition.
          </p>

          {launch && (
            <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-[.13em] text-ink-soft">
                Launch price
              </span>
              <br />
              <span className="text-text">{launch.value}</span>
              <span className="text-ink-soft">
                {" "}
                — what it cost when new, quoted from the spec sheet. Not what it costs today.
              </span>
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Shopping in
        </h3>
        <div
          role="tablist"
          aria-label="Country whose shops are listed"
          className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
        >
          {REGIONS.map((option) => {
            const selected = option.id === region.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRegion(option.id)}
                className={cx(
                  "h-8 flex-none rounded-full border px-3.5 text-[12px]",
                  selected
                    ? "border-accent bg-accent text-on-accent"
                    : "tint border-border hover:border-accent hover:text-accent",
                )}
                style={{ transition: "var(--fx)" }}
              >
                <span aria-hidden="true">{option.flag}</span> {option.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {region.name} — {stores.length} places to check
        </h3>
        <ul className="rounded-[14px] border border-border bg-panel px-2">
          {stores.map((store) => (
            <StoreRow
              key={store.id}
              name={store.name}
              note={store.note}
              href={store.search(term)}
            />
          ))}
        </ul>
        <p className="text-[11px] leading-snug text-ink-soft">
          Each link searches that shop for <b className="font-semibold text-text">“{term}”</b> — the
          product and its maker, without the article&rsquo;s own bracketed notes, which no retailer
          has heard of. A search rather than a product page on purpose: product identifiers differ
          per shop, per country and per variant, so a search is the one link that stays correct.
          Nothing about what you looked at is sent anywhere until you tap.
        </p>
      </section>
    </div>
  );
}
