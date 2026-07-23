import { NextResponse } from "next/server";

// Recognition is inherently live (calls Google), so never cache the route.
export const dynamic = "force-dynamic";

const UPSTREAM = "https://inputtools.google.com/request?itc=ml-t-i0-handwrit&app=oneapp";

type InkTrace = [number[], number[], number[]];

interface RecognizeBody {
  ink?: InkTrace[];
  width?: number;
  height?: number;
}

/**
 * Handwriting recognition proxy. Forwards captured ink to Google Input Tools
 * server-side — this avoids browser CORS limits and keeps our origin as the
 * only host the client talks to — then returns just the candidate word list.
 *
 *   POST /api/ml-handwriting   { ink, width, height }  ->  { candidates: string[] }
 */
export async function POST(request: Request) {
  let body: RecognizeBody;
  try {
    body = (await request.json()) as RecognizeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.ink) || body.ink.length === 0) {
    return NextResponse.json({ error: "No strokes to recognize." }, { status: 400 });
  }

  const payload = {
    options: "enable_pre_space",
    requests: [
      {
        writing_guide: {
          writing_area_width: body.width ?? 400,
          writing_area_height: body.height ?? 300,
        },
        ink: body.ink,
        language: "ml",
      },
    ],
  };

  try {
    const res = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; OneApp-Malayalam/1.0)",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Recognition service responded ${res.status}.` },
        { status: 502 },
      );
    }

    // Shape: ["SUCCESS", [ [ "<id>", ["cand1", "cand2", …], … ] ] ]
    const data = (await res.json()) as unknown;
    let candidates: string[] = [];
    if (
      Array.isArray(data) &&
      data[0] === "SUCCESS" &&
      Array.isArray(data[1]) &&
      Array.isArray(data[1][0]) &&
      Array.isArray(data[1][0][1])
    ) {
      candidates = (data[1][0][1] as unknown[]).filter((c): c is string => typeof c === "string");
    }

    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the recognition service." },
      { status: 502 },
    );
  }
}
