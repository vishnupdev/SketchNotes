"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslateStore } from "@/store/useTranslateStore";
import { useTranslation } from "@/hooks/useTranslation";
import { AUTO, languageLabel } from "@/lib/Translate/languages";
import { isOfflineTranslateSupported } from "@/lib/Translate/offline";
import { LanguageBar } from "@/components/Translate/molecules/LanguageBar";
import { SourceField } from "@/components/Translate/molecules/SourceField";
import { OutputField } from "@/components/Translate/molecules/OutputField";
import { ModeToggle } from "@/components/Translate/atoms/ModeToggle";

/** Matches the server route's cap so the input can never build an oversized URL. */
const MAX_CHARS = 5000;
const DEBOUNCE_MS = 450;

/**
 * The full translator: language pickers, engine mode, input and output. Wires
 * the persisted {@link useTranslateStore} to the {@link useTranslation} query,
 * debouncing keystrokes so each pause produces one cached translation. Handles
 * on-device language-pack download progress and graceful online fallback.
 */
export function TranslatorPanel() {
  const source = useTranslateStore((s) => s.source);
  const target = useTranslateStore((s) => s.target);
  const mode = useTranslateStore((s) => s.mode);
  const input = useTranslateStore((s) => s.input);
  const setSource = useTranslateStore((s) => s.setSource);
  const setTarget = useTranslateStore((s) => s.setTarget);
  const setMode = useTranslateStore((s) => s.setMode);
  const setInput = useTranslateStore((s) => s.setInput);
  const swap = useTranslateStore((s) => s.swap);
  const hydratePrefs = useTranslateStore((s) => s.hydratePrefs);

  // Adopt persisted language/mode choices once, after mount.
  useEffect(() => {
    hydratePrefs();
  }, [hydratePrefs]);

  // Whether this browser has the on-device translator (client-only check).
  const [offlineSupported, setOfflineSupported] = useState(true);
  useEffect(() => {
    setOfflineSupported(isOfflineTranslateSupported());
  }, []);

  // Debounce the input so the query key (and network/on-device work) only
  // updates when the user pauses.
  const [debounced, setDebounced] = useState(input);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  // On-device language-pack download progress (0..1), null when not downloading.
  const [download, setDownload] = useState<number | null>(null);
  const onProgress = useCallback((fraction: number) => {
    setDownload(fraction >= 1 ? null : fraction);
  }, []);

  const { data, isFetching, error } = useTranslation({
    text: debounced,
    source,
    target,
    mode,
    onProgress,
  });

  // Clear any lingering download indicator once a request settles.
  useEffect(() => {
    if (!isFetching) setDownload(null);
  }, [isFetching]);

  const output = data?.text ?? "";
  const engine = data?.engine;
  const detected = source === AUTO ? data?.detectedSource : undefined;
  const detectedLabel = detected ? languageLabel(detected) : undefined;

  const errorMessage = error instanceof Error ? error.message : error ? "Translation failed." : null;

  const swapDisabled = source === AUTO && !detected;

  const handleSwap = useCallback(() => {
    const swapped = swap(detected);
    // The old translation becomes the new source text so you can translate back.
    if (swapped && output) setInput(output);
  }, [swap, detected, output, setInput]);

  const targetLabel = useMemo(() => languageLabel(target), [target]);
  const sourceLabel = useMemo(
    () => (source === AUTO ? detectedLabel ?? "auto-detect" : languageLabel(source)),
    [source, detectedLabel],
  );

  const offlineForced = mode === "offline";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LanguageBar
          source={source}
          target={target}
          onSourceChange={setSource}
          onTargetChange={setTarget}
          onSwap={handleSwap}
          detectedLabel={detectedLabel}
          swapDisabled={swapDisabled}
        />
        <ModeToggle value={mode} onChange={setMode} offlineUnsupported={!offlineSupported} />
      </div>

      {/* On-device download progress. */}
      {download !== null && (
        <div className="rounded-xl border border-border bg-panel px-4 py-3" role="status">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink-soft">
            <span>Downloading on-device language pack…</span>
            <span className="font-mono">{Math.round(download * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(4, Math.round(download * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Offline mode chosen but unsupported — nudge back to a working mode. */}
      {offlineForced && !offlineSupported && (
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-[13px] text-ink-soft">
          On-device translation isn&apos;t available in this browser. Switch to{" "}
          <button
            type="button"
            onClick={() => setMode("auto")}
            className="font-semibold text-accent underline underline-offset-2"
          >
            Auto
          </button>{" "}
          or Online to translate over the network. On-device translation works in the latest
          Chrome / Edge.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <SourceField
          value={input}
          onChange={setInput}
          onClear={() => setInput("")}
          maxLength={MAX_CHARS}
          label={sourceLabel}
        />
        <OutputField
          text={output}
          isLoading={isFetching}
          error={errorMessage}
          engine={engine}
          label={targetLabel}
          hasInput={input.trim().length > 0}
        />
      </div>
    </div>
  );
}
