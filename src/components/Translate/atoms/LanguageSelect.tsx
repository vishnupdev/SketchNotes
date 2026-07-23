"use client";

import { AUTO, LANGUAGES } from "@/lib/Translate/languages";
import { cx } from "@/lib/utils";

interface LanguageSelectProps {
  /** Accessible name for the control (e.g. "Translate from"). */
  label: string;
  value: string;
  onChange: (code: string) => void;
  /** Include the "Detect language" option (source side only). */
  includeAuto?: boolean;
  /** When auto-detect resolved a language, show it appended to "Detect". */
  detectedLabel?: string;
  className?: string;
}

/**
 * A themed language picker built on a native `<select>` — keyboard-accessible
 * and mobile-friendly out of the box. Options come from the shared catalog so
 * the online and offline engines share one language list.
 */
export function LanguageSelect({
  label,
  value,
  onChange,
  includeAuto = false,
  detectedLabel,
  className,
}: LanguageSelectProps) {
  return (
    <div className={cx("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-border bg-panel py-2.5 pl-3.5 pr-9 text-[14px] font-semibold text-text outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
      >
        {includeAuto && (
          <option value={AUTO}>
            {detectedLabel ? `Detected: ${detectedLabel}` : "Detect language"}
          </option>
        )}
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
      {/* Caret — decorative; the native control owns the interaction. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
