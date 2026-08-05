import { AUTO } from "./languages";
import { fetchJson } from "@/lib/net/fetch";
import type { OnlineTranslateResponse } from "./types";

/** A translation is short work — fail fast rather than hang on a dead link. */
const TRANSLATE_TIMEOUT_MS = 10_000;

/**
 * Online translation via our own `/api/translate` route (which proxies the
 * upstream provider server-side, avoiding browser CORS limits and keeping our
 * origin as the only host the client talks to).
 *
 * Requests are attempted even with no connection: a translation is
 * deterministic, so the service worker can replay a phrase translated earlier
 * from its cache. On a real miss this rejects with a {@link NetError} carrying a
 * ready-to-show message.
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
  return fetchJson<OnlineTranslateResponse>(`/api/translate?${params.toString()}`, {
    label: "Translation",
    timeoutMs: TRANSLATE_TIMEOUT_MS,
    signal,
  });
}
