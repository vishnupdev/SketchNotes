/**
 * The catalogue — every curated product, and the handful of questions the app
 * asks of them.
 *
 * The product data lives in `products/`, split by category so that no single
 * file grows past the point where a reader could check it against the makers'
 * specification pages. This module is the only thing that assembles them, and
 * it is where the *ordering* rule lives, which is the part that matters most:
 * a "latest products" app is defined by its sort order far more than by its
 * contents, and getting it wrong is invisible — a list sorted by insertion
 * order looks exactly like a list sorted by date.
 *
 * Everything here is pure and synchronous. The catalogue ships in the bundle
 * rather than behind a request, which is what lets the app work offline, and
 * it is small enough (a few tens of KB of text) for that to be the right trade.
 */

import { brandById } from "./brands";
import { CATEGORIES } from "./categories";
import { PHONES } from "./products/phones";
import { LAPTOPS } from "./products/laptops";
import { MONITORS, TVS } from "./products/displays";
import { CPUS, GPUS } from "./products/silicon";
import { AUDIO, CAMERAS, CONSOLES, TABLETS, WATCHES } from "./products/devices";
import type { Brand, CategoryId, Product, ProductView } from "./types";

/** Every curated product, in no particular order — {@link allProducts} sorts. */
const RAW: Product[] = [
  ...PHONES,
  ...LAPTOPS,
  ...TVS,
  ...MONITORS,
  ...GPUS,
  ...CPUS,
  ...TABLETS,
  ...CONSOLES,
  ...WATCHES,
  ...AUDIO,
  ...CAMERAS,
];

/**
 * Newest first, and ties broken by name rather than left to chance.
 *
 * `released` is `YYYY-MM`, which sorts correctly as a string — that is the
 * whole reason for the format. The name tiebreak is not cosmetic: without it
 * two products released the same month would order by their position in the
 * source files, so adding a product would silently reshuffle unrelated rows.
 */
const byNewest = (a: Product, b: Product): number =>
  b.released.localeCompare(a.released) || a.name.localeCompare(b.name);

/** Attach the brand a row needs to draw itself. */
const withBrand = (product: Product): ProductView => ({
  ...product,
  brand: brandById(product.brandId),
});

/** Every product, newest first. */
export const allProducts = (): ProductView[] => [...RAW].sort(byNewest).map(withBrand);

/** One category's products, newest first. */
export const productsByCategory = (category: CategoryId): ProductView[] =>
  RAW.filter((p) => p.category === category)
    .sort(byNewest)
    .map(withBrand);

/** One brand's products, newest first, across every category. */
export const productsByBrand = (brandId: string): ProductView[] =>
  RAW.filter((p) => p.brandId === brandId)
    .sort(byNewest)
    .map(withBrand);

/** One product by id, or null — the id may come from a stale saved item. */
export function productById(id: string): ProductView | null {
  const found = RAW.find((p) => p.id === id);
  return found ? withBrand(found) : null;
}

/**
 * The brands that actually have products, with the categories they appear in.
 *
 * Derived from the catalogue rather than read from `brands.ts`, so the Brands
 * tab can never show a maker with nothing behind it — a brand row that opens
 * onto an empty list is the kind of small broken promise that makes a directory
 * feel unmaintained.
 *
 * Ordered by how many products each has, then by name: the makers with the
 * widest range are the ones a browser is most likely to be looking for, and an
 * alphabetical list would bury them behind whoever happens to start with "A".
 */
export function brandsWithProducts(): (Brand & { count: number; categories: CategoryId[] })[] {
  const counts = new Map<string, { count: number; categories: Set<CategoryId> }>();

  for (const product of RAW) {
    const entry = counts.get(product.brandId) ?? { count: 0, categories: new Set<CategoryId>() };
    entry.count += 1;
    entry.categories.add(product.category);
    counts.set(product.brandId, entry);
  }

  // Category order follows CATEGORIES rather than insertion, so a brand's chips
  // read in the same order everywhere they appear in the app.
  const rank = new Map(CATEGORIES.map((c, i) => [c.id, i]));

  return [...counts.entries()]
    .map(([id, { count, categories }]) => ({
      ...brandById(id),
      count,
      categories: [...categories].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0)),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Free-text search across the catalogue.
 *
 * Matches the product name, its brand, its summary and its category label —
 * not the full spec sheet. Searching the sheet sounds more useful and is not:
 * "120" appears in a refresh rate, a battery figure, a price and a model
 * number, so every query would match nearly everything, and a search that
 * always matches is indistinguishable from one that is broken.
 */
export function searchCatalog(query: string): ProductView[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];

  return allProducts().filter((product) => {
    const haystack = [
      product.name,
      product.brand.name,
      product.summary,
      product.category,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

/** How many products the catalogue holds — shown so its size is never a mystery. */
export const CATALOG_SIZE = RAW.length;
