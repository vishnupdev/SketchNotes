"use client";

import { useLatestStore } from "@/store/useLatestStore";
import { productById } from "@/lib/Latest/catalog";
import { CATEGORY_LABELS } from "@/lib/Latest/categories";
import { ageLabel, priceLabel, releaseLabel, sourceHost } from "@/lib/Latest/format";
import { CATALOG_REVIEWED } from "@/lib/Latest/types";
import { reviewedLabel } from "@/lib/Latest/format";
import { SpecTable } from "@/components/Latest/molecules/SpecTable";
import { PanelNote } from "@/components/Latest/molecules/PanelNote";
import { SaveButton } from "@/components/Latest/atoms/SaveButton";
import { ExternalLinkIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * One product, completely.
 *
 * The order of the page is the order the questions get asked: **what is it**
 * (name, maker, kind, date, price), **why would I care** (the handful of
 * genuine distinctions), **what is it made of** (the sheet), and **who says so**
 * (the source).
 *
 * The highlights sit above the sheet rather than below it because a
 * specification table answers "what are the numbers" and never answers "what is
 * different about this one" — and the second question is the one a reader
 * browsing a category actually arrived with. They are written as distinctions
 * against the product's own siblings, not as marketing: "5.64 mm, the thinnest
 * iPhone made" is a fact a reader can check, and "stunning design" is not.
 *
 * The source line is not a footnote. Every figure above it is the
 * manufacturer's published specification, and the link is how a reader
 * confirms this app copied it correctly — which is the only thing that makes a
 * hand-maintained catalogue trustworthy rather than merely convenient.
 */
export function SheetPanel() {
  const openId = useLatestStore((s) => s.openId);
  const saved = useLatestStore((s) => s.saved);
  const toggleSaved = useLatestStore((s) => s.toggleSaved);
  const setTab = useLatestStore((s) => s.setTab);

  const product = openId ? productById(openId) : null;

  if (!product) {
    return (
      <PanelNote
        title="Nothing open yet"
        action={
          <button
            type="button"
            onClick={() => setTab("new")}
            className="tint rounded-full border border-border px-3.5 py-1.5 text-[12px] hover:border-accent hover:text-accent"
          >
            Browse what&rsquo;s new
          </button>
        }
      >
        Pick a product from <b className="font-semibold text-text">New</b> or{" "}
        <b className="font-semibold text-text">Brands</b> and its full specification lands here —
        every row the maker publishes, grouped, with the source page linked at the bottom.
      </PanelNote>
    );
  }

  const age = ageLabel(product.released);

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
              {product.brand.name} · {CATEGORY_LABELS[product.category]}
            </p>
            <h2 className="mt-1 text-[21px] font-extrabold leading-tight tracking-tight">
              {product.name}
            </h2>
          </div>
          <SaveButton
            saved={saved.includes(product.id)}
            onToggle={() => toggleSaved(product.id)}
            name={product.name}
          />
        </div>

        <p className="text-[13px] leading-relaxed text-ink-soft">{product.summary}</p>

        {/* A description list rather than a row of divs: these are four
            label/value pairs, and marking them up as what they are is what
            keeps the pairing for a screen reader. */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-[14px] border border-border bg-panel px-4 py-3 min-[520px]:grid-cols-4">
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              Released
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold">{releaseLabel(product.released)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">Age</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold">{age}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              Launch price
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold">{priceLabel(product.priceUsd)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
              Status
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold">
              {product.status === "shipping" ? "Shipping" : "Announced"}
            </dd>
          </div>
        </dl>
      </header>

      <section className="rounded-[14px] border border-border bg-panel px-4 py-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-accent">
          What sets it apart
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {product.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2 text-[12.5px] leading-relaxed">
              <span aria-hidden="true" className="flex-none text-accent">
                —
              </span>
              <span className="min-w-0">{highlight}</span>
            </li>
          ))}
        </ul>
      </section>

      <SpecTable groups={product.specs} />

      <footer className="rounded-[14px] border border-border bg-panel px-4 py-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Source</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
          Every figure above is {product.brand.name}&rsquo;s own published specification. Read it at
          the source and check this sheet against it:
        </p>
        <a
          href={product.source}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] hover:border-accent hover:text-accent"
        >
          {sourceHost(product.source)}
          <ExternalLinkIcon size={13} aria-hidden="true" />
        </a>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">
          Catalogue last reviewed {reviewedLabel(CATALOG_REVIEWED)}. Launch price is what the maker
          announced, in US dollars, for the cheapest configuration — it is not a live quote, and
          what a shop charges today will differ.
        </p>
      </footer>
    </article>
  );
}
