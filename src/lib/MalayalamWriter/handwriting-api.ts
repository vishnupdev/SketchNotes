/**
 * Client helper for handwriting → Malayalam text recognition. Strokes captured
 * on the canvas are sent to our own `/api/ml-handwriting` route (which proxies
 * Google Input Tools) and a list of candidate words comes back. This is the one
 * online feature of the app; freehand ink never leaves the browser.
 */

/** A single pen stroke: parallel arrays of x, y and timestamp samples. */
export type Stroke = { x: number[]; y: number[]; t: number[] };

interface RecognizeResponse {
  candidates?: string[];
  error?: string;
}

/**
 * Recognize the given strokes drawn inside a `width`×`height` area. Returns an
 * ordered list of candidate words (best first); empty if nothing was matched.
 */
export async function recognizeHandwriting(
  strokes: Stroke[],
  width: number,
  height: number,
): Promise<string[]> {
  const res = await fetch("/api/ml-handwriting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      width: Math.round(width),
      height: Math.round(height),
      ink: strokes.map((s) => [s.x, s.y, s.t]),
    }),
  });
  if (!res.ok) throw new Error(`Recognition failed (${res.status})`);
  const data = (await res.json()) as RecognizeResponse;
  if (data.error) throw new Error(data.error);
  return data.candidates ?? [];
}
