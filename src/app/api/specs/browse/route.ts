import { NextResponse } from "next/server";
import { findSource } from "@/lib/Specs/catalog";
import { browseCategory, searchProducts } from "@/lib/Specs/source";

/**
 * A browsable list of products — the phones, the laptops, the Toyotas.
 *
 *   GET /api/specs/browse?kind=phones&source=samsung
 *
 * The kind and the source are *ids into this app's own catalogue*, never a
 * category name from the caller. That is deliberate: a category name taken off
 * the query string would let anyone use this route to enumerate any category on
 * the encyclopedia through our server and our cache. Ids resolve against
 * `lib/Specs/catalog.ts`, and an unknown one falls back to a real entry rather
 * than reaching the upstream at all.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { kind, source } = findSource(params.get("kind") ?? "", params.get("source") ?? "");

  try {
    // A maker with a verified category is enumerated; one without falls back to
    // the search that always resolves to something (see the catalogue's notes).
    const hits = source.category
      ? await browseCategory(source.category)
      : await searchProducts(source.search ?? source.name, 40);

    return NextResponse.json(
      { kind: kind.id, source: source.id, hits },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the product source." }, { status: 502 });
  }
}
