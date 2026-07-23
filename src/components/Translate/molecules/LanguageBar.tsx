"use client";

import { LanguageSelect } from "@/components/Translate/atoms/LanguageSelect";
import { SwapIcon } from "@/components/SketchNotes/atoms/icons";

interface LanguageBarProps {
  source: string;
  target: string;
  onSourceChange: (code: string) => void;
  onTargetChange: (code: string) => void;
  onSwap: () => void;
  /** Language resolved by auto-detect, shown on the source pill. */
  detectedLabel?: string;
  /** Disable swap when the source is still "Detect" and nothing is detected. */
  swapDisabled?: boolean;
}

/**
 * The from → to language row: two pickers with a swap button between them.
 * Reflows to keep the swap control centered on both mobile and desktop.
 */
export function LanguageBar({
  source,
  target,
  onSourceChange,
  onTargetChange,
  onSwap,
  detectedLabel,
  swapDisabled,
}: LanguageBarProps) {
  return (
    <div className="flex items-center gap-2">
      <LanguageSelect
        label="Translate from"
        value={source}
        onChange={onSourceChange}
        includeAuto
        detectedLabel={detectedLabel}
        className="min-w-0 flex-1"
      />
      <button
        type="button"
        onClick={onSwap}
        disabled={swapDisabled}
        aria-label="Swap languages"
        title="Swap languages"
        className="grid size-10 flex-none place-items-center rounded-xl border border-border bg-panel text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink-soft"
      >
        <SwapIcon size={18} />
      </button>
      <LanguageSelect
        label="Translate to"
        value={target}
        onChange={onTargetChange}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
