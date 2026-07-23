import { NextResponse } from "next/server";
import { AUTO, isKnownLanguage } from "@/lib/Translate/languages";
import type { OnlineTranslateResponse } from "@/lib/Translate/types";

// Live, per-request translation — never statically cached.
export const dynamic = "force-dynamic";

/** Hard cap so a single request can't build an absurd upstream URL. */
const MAX_CHARS = 5000;

/**
 * Some providers spell a few languages differently from our BCP-47 catalog.
 * Map our code → the upstream code just for the wire; the client only ever
 * sees our catalog codes.
 */
const UPSTREAM_CODE: Record<string, string> = {
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
};
const toUpstream = (code: string) => UPSTREAM_CODE[code] ?? code;

/** Reverse the map so the detected source echoes back in our catalog codes. */
const FROM_UPSTREAM: Record<string, string> = {
  "zh-CN": "zh",
  "zh-TW": "zh-Hant",
};
const fromUpstream = (code: string) => FROM_UPSTREAM[code] ?? code;

/**
 * Online translation proxy. Runs server-side so the browser talks only to our
 * origin (no third-party CORS, no key in the client). Supports auto source
 * detection and returns the language the provider detected.
 *
 *   GET /api/translate?q=hello&source=auto&target=es
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, MAX_CHARS);
  const source = searchParams.get("source") || AUTO;
  const target = searchParams.get("target") || "";

  if (!q.trim()) {
    return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });
  }
  if (!isKnownLanguage(target)) {
    return NextResponse.json({ error: "Unsupported target language." }, { status: 400 });
  }
  if (source !== AUTO && !isKnownLanguage(source)) {
    return NextResponse.json({ error: "Unsupported source language." }, { status: 400 });
  }
  if (source !== AUTO && source === target) {
    // Nothing to do — echo the input back as-is.
    const body: OnlineTranslateResponse = { text: q, detectedSource: source };
    return NextResponse.json(body);
  }

  const sl = source === AUTO ? "auto" : toUpstream(source);
  const tl = toUpstream(target);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
    `&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OneApp-Translate/1.0)" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Translation service responded ${res.status}.` },
        { status: 502 },
      );
    }

    // Shape: [ [ [translated, original, …], … ], …, detectedSourceCode, … ]
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return NextResponse.json({ error: "Unexpected translation response." }, { status: 502 });
    }

    const text = (data[0] as unknown[])
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
      .join("");
    const detected =
      typeof data[2] === "string" && data[2] ? fromUpstream(data[2]) : source === AUTO ? "en" : source;

    const body: OnlineTranslateResponse = { text, detectedSource: detected };
    return NextResponse.json(body, {
      // Identical text→pair requests can be reused briefly (e.g. re-typing).
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the translation service." },
      { status: 502 },
    );
  }
}
