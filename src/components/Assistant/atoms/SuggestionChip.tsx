"use client";

interface SuggestionChipProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/** Tappable follow-up question. Sized for comfortable thumbs on mobile. */
export function SuggestionChip({ label, onClick, disabled }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border bg-paper px-3.5 py-2 text-left text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
