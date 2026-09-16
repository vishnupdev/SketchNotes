"use client";

import { useLatestStore } from "@/store/useLatestStore";
import { brandsWithProducts, productsByBrand } from "@/lib/Latest/catalog";
import { CATEGORY_LABELS } from "@/lib/Latest/categories";
import { Chip, ChipRail } from "@/components/Latest/atoms/Chip";
import { ProductRow } from "@/components/Latest/molecules/ProductRow";
import { PanelNote } from "@/components/Latest/molecules/PanelNote";

/**
 * Everything, arranged by who makes it.
 *
 * Two states in one panel: the directory of makers, and one maker's products.
 * They are not separate tabs because they are one question asked at two depths
 * — "who is here" and "what has this one shipped" — and a reader comparing two
 * makers moves between them constantly.
 *
 * The directory is **ordered by how many products each maker has**, not
 * alphabetically. A brand directory sorted A–Z buries Apple, Samsung and Nvidia
 * behind whoever happens to start with "A", and the makers with the widest
 * range are precisely the ones somebody browsing is most likely to want. The
 * count is drawn on every chip, so the ordering explains itself rather than
 * looking arbitrary.
 */
export function BrandsPanel() {
  const brandId = useLatestStore((s) => s.brandId);
  const setBrand = useLatestStore((s) => s.setBrand);
  const openProduct = useLatestStore((s) => s.openProduct);
  const openId = useLatestStore((s) => s.openId);
  const saved = useLatestStore((s) => s.saved);
  const toggleSaved = useLatestStore((s) => s.toggleSaved);

  const brands = brandsWithProducts();
  const active = brands.find((b) => b.id === brandId) ?? null;
  const products = active ? productsByBrand(active.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {brands.length} makers — widest range first
        </h3>

        <ChipRail label="Maker">
          {brands.map((brand) => (
            <Chip
              key={brand.id}
              selected={brand.id === active?.id}
              onClick={() => setBrand(brand.id === active?.id ? null : brand.id)}
              count={brand.count}
            >
              {brand.name}
            </Chip>
          ))}
        </ChipRail>
      </div>

      {!active ? (
        <PanelNote title="Pick a maker">
          Every product in the catalogue, grouped by who makes it. The figure on each chip is how
          many of its products are listed here — tap one to see them, newest first, across every
          kind it builds.
        </PanelNote>
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-bold">{active.name}</h3>
            <p className="text-[11.5px] text-ink-soft">
              {active.country && `${active.country} · `}
              {active.count} {active.count === 1 ? "product" : "products"} ·{" "}
              {active.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}
            </p>
          </div>

          <ul className="rounded-[14px] border border-border bg-panel px-2">
            {products.map((product) => (
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

          <p className="text-[11px] leading-snug text-ink-soft">
            Newest first, across every kind {active.name} builds. This is what the catalogue holds
            for them — not their whole range.
          </p>
        </section>
      )}
    </div>
  );
}
