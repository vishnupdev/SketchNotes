"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { readNetworkStatus } from "@/lib/net/status";
import { AUTO } from "@/lib/Translate/languages";
import { translateOnline } from "@/lib/Translate/translate-api";
import {
  isOfflineTranslateSupported,
  offlineAvailability,
  translateOffline,
  type ProgressFn,
} from "@/lib/Translate/offline";
import type { TranslateMode, TranslationResult } from "@/lib/Translate/types";

interface UseTranslationArgs {
  /** Text to translate — debounce before passing so the query key is stable. */
  text: string;
  source: string;
  target: string;
  mode: TranslateMode;
  /** Reports on-device language-pack download progress (fraction 0..1). */
  onProgress?: ProgressFn;
}

/**
 * Translate `text` from `source` to `target`, caching each unique
 * (mode, source, target, text) result so repeated inputs are instant.
 *
 * Engine selection:
 * - `online`  — the network provider, falling back to an installed on-device
 *   model if there's no connection (the engine badge shows which one answered).
 * - `offline` — always on-device (may download a language pack; errors if the
 *   browser/pair can't serve it, so the UI can nudge the user to switch modes).
 * - `auto`    — on-device when the model is *already downloaded* for the pair
 *   (no surprise downloads in the default mode), otherwise the network provider.
 *   With auto-detect on, `auto` uses the network provider (reliable detection
 *   without provisioning an on-device detector) — except with no connection,
 *   where on-device detection is better than no translation at all.
 *
 * With no connection the network path is still attempted before giving up: the
 * service worker replays phrases translated earlier, which is often a hit.
 */
export function useTranslation({ text, source, target, mode, onProgress }: UseTranslationArgs) {
  const trimmed = text.trim();

  return useQuery<TranslationResult | null>({
    queryKey: queryKeys.translation(mode, source, target, trimmed),
    enabled: trimmed.length > 0 && !!target,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const offline = !readNetworkStatus().online;

      /** Is a pack already installed for this exact pair? */
      const packReady = async () =>
        isOfflineTranslateSupported() &&
        source !== AUTO &&
        (await offlineAvailability(source, target)) === "available";

      const onDevice = async (): Promise<TranslationResult> => {
        const r = await translateOffline(text, source, target, onProgress);
        return { text: r.text, engine: "offline", detectedSource: r.detectedSource };
      };
      const online = async (): Promise<TranslationResult> => {
        const r = await translateOnline(text, source, target, signal);
        return { text: r.text, engine: "online", detectedSource: r.detectedSource };
      };

      if (mode === "offline") return onDevice();

      // auto: on-device when it can answer without a download — and with no
      // connection, on-device is worth trying even for auto-detect.
      if (mode === "auto" && (offline ? isOfflineTranslateSupported() : await packReady())) {
        try {
          return await onDevice();
        } catch {
          /* fall through to the network provider */
        }
      }

      try {
        return await online();
      } catch (error) {
        // No connection and nothing cached: an installed on-device pack is the
        // last thing that can still answer.
        if (offline && (await packReady())) {
          try {
            return await onDevice();
          } catch {
            /* report the original network failure instead */
          }
        }
        throw error;
      }
    },
  });
}
