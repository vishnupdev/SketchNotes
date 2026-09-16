/**
 * The browser's side of the lookup: this app's own API routes, and nothing else.
 *
 * Every request here goes to this origin. That is what lets the service worker
 * replay a sheet you have already looked at while offline (see `public/sw.js`),
 * and it is why the upstream never sees a visitor's address.
 */

import { fetchJson } from "@/lib/net/fetch";
import type { ProductHit, ProductRecord, RelatedProduct } from "./types";

/** Products matching a typed query. */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<ProductHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const body = await fetchJson<{ hits: ProductHit[] }>(
    `/api/specs/search?q=${encodeURIComponent(term)}`,
    { signal, label: "Product search" },
  );
  return body.hits ?? [];
}

/**
 * Why a lookup came back empty, when the article side of it is the reason.
 * Carried on the error so the UI can say which of the two happened rather than
 * showing one "not found" for both.
 */
export type MissingReason = "no-article" | "no-specs";

export class ProductMissingError extends Error {
  readonly reason: MissingReason;
  constructor(reason: MissingReason, message: string) {
    super(message);
    this.name = "ProductMissingError";
    this.reason = reason;
  }
}

/**
 * Fill in anything a sheet is missing, so a record from an older version of
 * this app still renders.
 *
 * These responses are cached hard — half an hour in the browser, longer in the
 * service worker's DATA cache, and they survive a deploy. So the moment a field
 * is *added* to {@link ProductRecord}, every reader with a warm cache gets a
 * payload without it, and a component that trusted the type crashes on
 * `undefined`. That is not a hypothetical: adding the picture gallery did
 * exactly this, and the sheet died on `images.length` for anyone who had opened
 * a product in the previous half hour.
 *
 * The type is a promise about what the *current* server sends, and a cache
 * makes it a lie about what actually arrives. So the promise is made true here,
 * once, at the single point the data enters the app — rather than by teaching
 * every component to doubt its own props.
 */
export function reviveRecord(raw: ProductRecord): ProductRecord {
  const list = <T,>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

  return {
    ...raw,
    groups: list(raw.groups),
    measures: list(raw.measures),
    relatives: list(raw.relatives),
    images: list(raw.images),
    summary: raw.summary ?? "",
    description: raw.description ?? "",
    categoryLabel: raw.categoryLabel ?? "Product",
    maker: raw.maker ?? null,
    released: raw.released ?? null,
    image: raw.image ?? null,
    entityId: raw.entityId ?? null,
    // An older payload may predate the stamp entirely. Today's date would claim
    // a freshness it cannot support, so an absent one is left as the epoch and
    // reads as obviously old rather than as a confident lie.
    readAt: raw.readAt ?? new Date(0).toISOString(),
  };
}

/** One product's full sheet. */
export async function fetchProduct(title: string, signal?: AbortSignal): Promise<ProductRecord> {
  try {
    const body = await fetchJson<{ product: ProductRecord }>(
      `/api/specs/product?title=${encodeURIComponent(title)}`,
      { signal, label: "Spec sheet" },
    );
    return reviveRecord(body.product);
  } catch (error) {
    // `fetchJson` turns a 404 body's `error` into the thrown message, but drops
    // the `reason` beside it — so the distinction is re-derived from the text
    // the route wrote. Both phrasings live in `api/specs/product/route.ts`.
    if (error instanceof Error && /no specification table/i.test(error.message)) {
      throw new ProductMissingError("no-specs", error.message);
    }
    if (error instanceof Error && /^No article called/i.test(error.message)) {
      throw new ProductMissingError("no-article", error.message);
    }
    throw error;
  }
}

/**
 * The search phrase that finds a product's peers.
 *
 * The one-line description is the best available answer, because it is written
 * to the same shape for every product in the corpus — "2023 smartphone by
 * Apple", "2021 full-frame mirrorless camera". Dropping the leading year is
 * what turns it from a description of *this* product into a description of its
 * kind; keeping it would return only products launched the same year.
 */
export function likeQuery(product: ProductRecord): string {
  const kind = product.description.replace(/^\s*\d{4}\s+/, "").trim();
  if (kind) return kind;
  return [product.maker, product.categoryLabel].filter(Boolean).join(" ").trim();
}

/** Products worth comparing one against. */
export async function fetchSimilar(
  product: ProductRecord,
  signal?: AbortSignal,
): Promise<RelatedProduct[]> {
  const related = product.relatives
    .slice(0, 12)
    .map((r) => `${r.title}|${r.relation}`)
    .join(",");

  const params = new URLSearchParams({ title: product.title, like: likeQuery(product) });
  if (related) params.set("related", related);

  const body = await fetchJson<{ similar: RelatedProduct[] }>(`/api/specs/similar?${params}`, {
    signal,
    label: "Similar products",
  });
  return body.similar ?? [];
}

/**
 * A browsable list of products, by kind and maker.
 *
 * The ids go to this app's own route, which resolves them against the
 * catalogue — the browser never names a category, so the endpoint cannot be
 * used to enumerate arbitrary parts of the encyclopedia.
 */
export async function browseProducts(
  kind: string,
  source: string,
  signal?: AbortSignal,
): Promise<ProductHit[]> {
  const body = await fetchJson<{ hits: ProductHit[] }>(
    `/api/specs/browse?kind=${encodeURIComponent(kind)}&source=${encodeURIComponent(source)}`,
    { signal, label: "Product list" },
  );
  return body.hits ?? [];
}
