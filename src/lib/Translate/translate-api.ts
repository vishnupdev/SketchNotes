import { AUTO } from "./languages";
import type { OnlineTranslateResponse } from "./types";

/**
 * Online translation via our own `/api/translate` route (which proxies the
 * upstream provider server-side, avoiding browser CORS limits and keeping our
 * origin as the only host the client talks to).
 */
export async function translateOnline(
  text: string,
  source: string,
  target: string,
  signal?: AbortSignal,
): Promise<OnlineTranslateResponse> {
  const params = new URLSearchParams({
    q: text,
    source: source || AUTO,
    target,
  });
  const res = await fetch(`/api/translate?${params.toString()}`, { signal });
  if (!res.ok) {
    let message = `Translation request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(message);
  }
  return (await res.json()) as OnlineTranslateResponse;
}
