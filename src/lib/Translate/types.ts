/** Shared types for the Translate app (client + `/api/translate` route). */

/**
 * How a translation is produced:
 * - `auto`   — prefer the on-device engine when it can handle the pair, else
 *              fall back to the network provider. The default.
 * - `offline` — force the on-device engine; error if the pair is unavailable.
 * - `online`  — force the network provider.
 */
export type TranslateMode = "auto" | "offline" | "online";

/** Which engine actually produced a result — surfaced to the user as a badge. */
export type TranslateEngine = "offline" | "online";

/** A completed translation plus provenance for the UI. */
export interface TranslationResult {
  text: string;
  engine: TranslateEngine;
  /** Resolved source language code (a real code even when the request was AUTO). */
  detectedSource: string;
}

/** Response shape of the `/api/translate` route. */
export interface OnlineTranslateResponse {
  text: string;
  /** Language the provider detected (echoes the request source if explicit). */
  detectedSource: string;
}
