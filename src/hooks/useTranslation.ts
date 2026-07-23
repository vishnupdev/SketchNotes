"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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
 * - `online`  — always the network provider.
 * - `offline` — always on-device (may download a language pack; errors if the
 *   browser/pair can't serve it, so the UI can nudge the user to switch modes).
 * - `auto`    — on-device when the model is *already downloaded* for the pair
 *   (no surprise downloads in the default mode), otherwise the network provider.
 *   With auto-detect on, `auto` uses the network provider (reliable detection
 *   without provisioning an on-device detector).
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
      if (mode === "online") {
        const r = await translateOnline(text, source, target, signal);
        return { text: r.text, engine: "online", detectedSource: r.detectedSource };
      }

      if (mode === "offline") {
        const r = await translateOffline(text, source, target, onProgress);
        return { text: r.text, engine: "offline", detectedSource: r.detectedSource };
      }

      // auto: use on-device only when the pack is already present, else online.
      const canOfflineNow =
        isOfflineTranslateSupported() &&
        source !== AUTO &&
        (await offlineAvailability(source, target)) === "available";

      if (canOfflineNow) {
        try {
          const r = await translateOffline(text, source, target, onProgress);
          return { text: r.text, engine: "offline", detectedSource: r.detectedSource };
        } catch {
          /* fall through to the network provider */
        }
      }

      const r = await translateOnline(text, source, target, signal);
      return { text: r.text, engine: "online", detectedSource: r.detectedSource };
    },
  });
}
