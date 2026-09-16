import { NextResponse } from "next/server";
import { findSimilar } from "@/lib/Specs/source";
import type { RelatedProduct } from "@/lib/Specs/types";

/**
 * Products worth comparing one product against.
 *
 *   GET /api/specs/similar?title=IPhone%2015%20Pro
 *       &related=IPhone%2014%20Pro|predecessor,IPhone%2016%20Pro|successor
 *       &like=smartphone%20by%20Apple
 *
 * The relation rows come *from the caller* rather than being re-read here: the
 * page already has them, on the sheet it is looking at, and re-fetching the
 * article to recover facts the client is holding would double the upstream
 * traffic to learn nothing new.
 */

/** `Title|relation` pairs, as the client packs them. */
function parseRelated(raw: string): RelatedProduct[] {
  const relations = new Set(["predecessor", "successor", "related", "sibling"]);

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((entry) => {
      const bar = entry.lastIndexOf("|");
      const title = (bar < 0 ? entry : entry.slice(0, bar)).trim();
      const relation = bar < 0 ? "related" : entry.slice(bar + 1).trim();
      return {
        title,
        relation: (relations.has(relation) ? relation : "related") as RelatedProduct["relation"],
      };
    })
    .filter((r) => r.title.length > 0);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = params.get("title")?.trim() ?? "";
  const like = params.get("like")?.trim() ?? "";
  const related = parseRelated(params.get("related") ?? "");

  if (!title) {
    return NextResponse.json({ error: "Name a product to compare against." }, { status: 400 });
  }

  try {
    const similar = await findSimilar(title, related, like);
    return NextResponse.json(
      { similar },
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
