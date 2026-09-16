import { NextResponse } from "next/server";
import { fetchFeed } from "@/lib/Latest/source";

/**
 * Newly-listed products for one category of thing.
 *
 *   GET /api/latest/feed?category=phone&year=2026
 *
 * The category is an **id into this app's own catalogue**, never a category
 * name from the caller, and the year is coerced to a number in a sane range.
 * Both matter: a category name taken off the query string would let anyone use
 * this route to enumerate any part of the upstream encyclopedia through our
 * server and our cache. An unknown id resolves to a real entry rather than
 * reaching the upstream at all (see `lib/Latest/categories.ts`).
 *
 * A category the upstream cannot enumerate — televisions and monitors — is a
 * **200 with an empty list**, not an error. There is nothing wrong when a
 * reader opens the TV tab; the curated half is the answer there, and the panel
 * says so in words. Returning a 502 would make the offline banner and the retry
 * logic fire for a state that is entirely expected.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") ?? "";

  const rawYear = Number(params.get("year"));
  // Bounded rather than trusted: the year is interpolated into a category name,
  // and a caller-supplied string there is how an injection gets in. Anything
  // outside living memory of consumer electronics is simply dropped.
  const year =
    Number.isInteger(rawYear) && rawYear >= 1990 && rawYear <= 2100 ? rawYear : undefined;

  try {
    const items = await fetchFeed(category, year);

    return NextResponse.json(
      { category, year: year ?? null, items },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach the listings source." }, { status: 502 });
  }
}
