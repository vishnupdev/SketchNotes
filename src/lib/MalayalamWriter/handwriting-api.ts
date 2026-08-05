/**
 * Client helper for handwriting → Malayalam text recognition. Strokes captured
 * on the canvas are sent to our own `/api/ml-handwriting` route (which proxies
 * Google Input Tools) and a list of candidate words comes back. This is the one
 * online feature of the app; freehand ink never leaves the browser.
 */

import { NetError, fetchJson } from "@/lib/net/fetch";
import { readNetworkStatus } from "@/lib/net/status";

/** A single pen stroke: parallel arrays of x, y and timestamp samples. */
export type Stroke = { x: number[]; y: number[]; t: number[] };

interface RecognizeResponse {
  candidates?: string[];
  error?: string;
}

/** Ink is a POST, so nothing can answer it from cache — don't wait long. */
const RECOGNIZE_TIMEOUT_MS = 9000;

/**
 * Recognize the given strokes drawn inside a `width`×`height` area. Returns an
 * ordered list of candidate words (best first); empty if nothing was matched.
 *
 * Unlike the app's GET requests, this can't be served from the offline cache —
 * every recognition is a new question for the server — so with no connection it
 * fails immediately with a clear message instead of waiting for a timeout.
 */
export async function recognizeHandwriting(
  strokes: Stroke[],
  width: number,
  height: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!readNetworkStatus().online) {
    throw new NetError("offline", "You're offline — handwriting recognition needs a connection.");
  }

  const data = await fetchJson<RecognizeResponse>("/api/ml-handwriting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      width: Math.round(width),
      height: Math.round(height),
      ink: strokes.map((s) => [s.x, s.y, s.t]),
    }),
    label: "Recognition",
    timeoutMs: RECOGNIZE_TIMEOUT_MS,
    signal,
  });

  if (data.error) throw new Error(data.error);
  return data.candidates ?? [];
}
