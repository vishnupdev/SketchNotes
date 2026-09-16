import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/Specs/source";

/**
 * Product search for the Spec Analyser app.
 *
 *   GET /api/specs/search?q=galaxy%20s24
 *
 * A proxy rather than a direct call from the browser, for the same three
 * reasons as every other upstream in this workspace: the page then talks only
 * to this origin, the response is cacheable for every visitor rather than per
 * browser, and the descriptive User-Agent the upstream's etiquette asks for is
 * set somewhere a client can't strip it.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ error: "Type at least two characters to search." }, { status: 400 });
  }

  try {
    const hits = await searchProducts(query);
    return NextResponse.json(
      { hits },
      {
        headers: {
          // Which articles exist, and their one-line descriptions, change on a
          // scale of weeks — and a repeated search should cost nothing.
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the product source." }, { status: 502 });
  }
}
