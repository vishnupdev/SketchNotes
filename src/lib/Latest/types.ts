/**
 * Latest Tech's data model: what "a current product" is, and what has to be
 * true of it before this app will list it.
 *
 * The app answers a different question from Spec Analyser next door. That one
 * starts from a name you already have and reads whatever an encyclopedia
 * article happens to state about it. This one starts from *nothing* — "show me
 * the newest monitors", "what has LG shipped this year" — and has to answer
 * with a complete, comparable sheet for every row, in every category, or the
 * list is not worth browsing.
 *
 * That requirement is what shapes these types:
 *
 *  - **Every product carries its own `source`.** A figure on a sheet here is
 *    the manufacturer's published specification, and the link goes to the page
 *    that publishes it. Nothing is asserted without somewhere to check it.
 *  - **Every product carries `released` and the catalogue carries
 *    {@link CATALOG_REVIEWED}.** A "latest products" list that cannot say how
 *    fresh it is has the one failure a recency feature cannot survive, because
 *    a stale list still looks exactly like a current one.
 *  - **`specs` is a list of groups, not a flat map.** A TV's sheet and a GPU's
 *    sheet share no fields at all, so the shape has to be per-product rather
 *    than a schema every category is forced through.
 */

/**
 * The kinds of product this app tracks.
 *
 * Fixed rather than open-ended: each one has a hand-written spec vocabulary
 * (`categories.ts`) saying which rows a sheet of that kind should carry, and a
 * category with no vocabulary would list products whose sheets could not be
 * compared with each other — which is the whole point of the list.
 */
export type CategoryId =
  | "phone"
  | "laptop"
  | "tv"
  | "monitor"
  | "gpu"
  | "cpu"
  | "tablet"
  | "console"
  | "watch"
  | "audio"
  | "camera";

/** One row on a spec sheet. */
export interface SpecItem {
  label: string;
  value: string;
}

/** A titled run of related rows — one card on the sheet. */
export interface SpecGroup {
  title: string;
  items: SpecItem[];
}

/** A company whose products are listed here. */
export interface Brand {
  id: string;
  name: string;
  /** Where the company is based — context a brand row can carry for free. */
  country: string;
  /** The categories this brand actually has products in, filled in at load. */
  categories?: CategoryId[];
}

/**
 * One product, with the whole sheet.
 *
 * `priceUsd` is the **launch** price and is labelled as such everywhere it is
 * drawn. It is not a live quote and this app does not attempt one: no retailer
 * publishes current prices without a registered credential, and on a purchase
 * this size a wrong number is worse than no number. The launch figure is a
 * fact about the product with a date attached, which is a different and
 * honest claim.
 */
export interface Product {
  /** Stable slug — the id every lookup, deep link and saved item is keyed by. */
  id: string;
  name: string;
  /** Id into {@link Brand}. */
  brandId: string;
  category: CategoryId;
  /**
   * `YYYY-MM` — when it went on sale, or when it was announced for a product
   * that has been shown but has not shipped. {@link Product.status} says which.
   */
  released: string;
  status: "shipping" | "announced";
  /** Launch price in US dollars, or null where the maker published none. */
  priceUsd: number | null;
  /** One line: what it is, and who it is for. */
  summary: string;
  /** The few things that actually distinguish it from its own siblings. */
  highlights: string[];
  /** The full sheet, grouped. */
  specs: SpecGroup[];
  /** The maker's own specification page — where the figures above came from. */
  source: string;
}

/** A product with its brand resolved — what every list row actually draws. */
export interface ProductView extends Product {
  brand: Brand;
}

/**
 * One newly-listed product found live, rather than from the curated catalogue.
 *
 * Deliberately a *different shape* from {@link Product}, and drawn differently.
 * These come from an encyclopedia's "introduced in <year>" categories, so they
 * are genuinely current — they keep arriving after the curated snapshot was
 * written — but they carry a one-line description rather than a sheet. Giving
 * them the same type would let a row with no specifications be rendered as
 * though it had them, which is the one thing this app must not do.
 */
export interface FeedItem {
  /** Source-article title — stable, and this row's key. */
  title: string;
  /** Display name, with any bracketed disambiguator removed. */
  name: string;
  /** The source's own one-line description, e.g. "2026 smartphone by Apple". */
  description: string;
  image: string | null;
  /** The article this row came from, so the reader can go and read it. */
  url: string;
}

/**
 * When the curated half of the catalogue was last read against the makers'
 * published specifications.
 *
 * Shown on screen, not just kept here. A recency feature that cannot state its
 * own recency is the failure mode this app exists to avoid — a six-month-old
 * list of "the latest" looks identical to a current one until someone acts on
 * it.
 */
export const CATALOG_REVIEWED = "2026-09-16";
