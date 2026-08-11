"use client";

interface PromptChipProps {
  /** The example prompt. Also the visible label. */
  text: string;
  /** Run it, or drop it into the composer when it needs finishing. */
  onPick: (text: string) => void;
}

/**
 * A tappable example prompt. These are how the grammar is taught — the app has
 * no hidden vocabulary, so every chip is a literal, working command.
 *
 * A chip whose text ends in a space is a *stem* ("rename "): picking it fills the
 * composer and waits, rather than running something half-written.
 */
export function PromptChip({ text, onPick }: PromptChipProps) {
  const stem = text.endsWith(" ");
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      title={stem ? `Start typing: ${text.trim()}…` : `Run: ${text}`}
      className="tint hover-pop rounded-full border border-border bg-panel px-3 py-1.5 text-left font-mono text-[11.5px] text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {text.trim()}
      {stem && <span aria-hidden>…</span>}
    </button>
  );
}
