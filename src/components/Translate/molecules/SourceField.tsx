"use client";

import { CloseIcon } from "@/components/SketchNotes/atoms/icons";

interface SourceFieldProps {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
  maxLength: number;
  /** Accessible name for the textarea (the current source language). */
  label: string;
}

/**
 * The text-to-translate input: an auto-sizing textarea with a live character
 * count and a clear button. Mobile-first — full width, comfortable tap targets.
 */
export function SourceField({ value, onChange, onClear, maxLength, label }: SourceFieldProps) {
  return (
    <div className="relative flex min-h-[180px] flex-col rounded-2xl border border-border bg-panel p-4 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
      <label htmlFor="translate-source" className="sr-only">
        Text to translate ({label})
      </label>
      <textarea
        id="translate-source"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder="Enter text to translate…"
        rows={6}
        spellCheck={false}
        autoComplete="off"
        className="w-full flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-text outline-none placeholder:text-ink-soft"
      />
      <div className="mt-2 flex items-center justify-between pt-1">
        <span className="font-mono text-[11px] text-ink-soft" aria-live="polite">
          {value.length}/{maxLength}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseIcon size={13} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
