import { NextResponse } from "next/server";

/**
 * Exchange-rate proxy for the Convert app.
 *
 *   GET /api/rates            → rates against EUR
 *   GET /api/rates?base=INR   → rates against INR
 *
 * Server-side for the usual two reasons — the browser never talks to a third
 * party, and our origin is the only thing the service worker has to cache — plus
 * one specific to money: the upstream is rate-limited per caller, and proxying
 * turns "every visitor" into "this deployment".
 *
 * The upstream (Frankfurter, European Central Bank reference rates) needs no API
 * key, which is why it is the one used. ECB publishes once a working day, so the
 * response is cached for six hours: asking more often cannot produce a different
 * answer.
 */

export const revalidate = 21_600; // 6h — the ECB updates once a working day

const UPSTREAM = "https://api.frankfurter.app/latest";

/** Currencies offered in the picker, with the symbol and name shown beside them. */
export interface RatesResponse {
  base: string;
  /** ISO date the rates were published (not fetched). */
  date: string;
  /** code → units of that currency per 1 unit of `base`. Includes `base` at 1. */
  rates: Record<string, number>;
}

const CODE_RE = /^[A-Z]{3}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = (searchParams.get("base") || "EUR").toUpperCase();

  if (!CODE_RE.test(base)) {
    return NextResponse.json({ error: "Base must be a three-letter code." }, { status: 400 });
  }

  try {
    const res = await fetch(`${UPSTREAM}?from=${base}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!res.ok) {
      // A 404 here means the upstream does not carry that currency, which is a
      // bad request from the client's side rather than an outage on ours.
      const status = res.status === 404 ? 400 : 502;
      return NextResponse.json(
        { error: status === 400 ? `No rates published for ${base}.` : "Rates are unavailable." },
        { status },
      );
    }

    const data = (await res.json()) as { base?: string; date?: string; rates?: Record<string, number> };
    if (!data.rates || typeof data.date !== "string") {
      return NextResponse.json({ error: "Rates are unavailable." }, { status: 502 });
    }

    const payload: RatesResponse = {
      base,
      date: data.date,
      // The upstream omits the base from its own table; including it at exactly 1
      // means the client can convert any pair with one uniform lookup instead of
      // special-casing "converting from the base".
      rates: { ...data.rates, [base]: 1 },
    };

    return NextResponse.json(payload, {
      headers: {
        // Let the CDN and the service worker hold it for the same six hours, and
        // keep serving yesterday's rates for a day while a refetch happens
        // behind it — a day-old ECB rate is worth far more than an error.
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Rates are unavailable." }, { status: 502 });
  }
}
