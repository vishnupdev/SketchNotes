import { NextResponse } from "next/server";
import { fetchProduct, NoArticleError, NoSpecsError } from "@/lib/Specs/source";

/**
 * One product's full specification sheet.
 *
 *   GET /api/specs/product?title=IPhone%2015%20Pro
 *
 * The two "no data" outcomes are answered separately and with 404 rather than
 * 502, because they are facts about the request and not failures of the
 * service: there is no article by that name, or there is one and it carries no
 * specification table. The app says which, since "no article" means try another
 * spelling and "no table" means this product's page simply never had one — and
 * a single "not found" would leave a reader guessing between them.
 */
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title")?.trim() ?? "";

  if (!title) {
    return NextResponse.json({ error: "Name a product to look up." }, { status: 400 });
  }

  try {
    const product = await fetchProduct(title);
    return NextResponse.json(
      { product },
      {
        headers: {
          // A shipped product's specifications are settled facts; the sheet
          // carries the time it was read, so a cached one is never misleading.
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    if (error instanceof NoSpecsError) {
      return NextResponse.json({ error: error.message, reason: "no-specs" }, { status: 404 });
    }
    if (error instanceof NoArticleError) {
      return NextResponse.json({ error: error.message, reason: "no-article" }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not reach the product source." }, { status: 502 });
  }
}
