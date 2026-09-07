"use client";

/**
 * The row of symbols a phone keyboard makes expensive.
 *
 * Not a full keypad: the digits are already on every keyboard there is, and a
 * grid of them would only push the tape off a small screen. What a mobile
 * keyboard genuinely costs you is `^`, `(`, `%` and the function names — each
 * two taps and a mode switch away — so those are what this offers, inserted at
 * the caret rather than appended, so it works mid-line as well as at the end.
 */
interface KeyBarProps {
  keys: string[];
  /** Called with the text to insert at the caret. */
  onInsert: (text: string) => void;
  /** Names the row for assistive tech, since the labels are bare symbols. */
  label: string;
}

export function KeyBar({ keys, onInsert, label }: KeyBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          // The caret must stay in the textarea — a button that took focus
          // would insert at the start of the line on the next tap.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(key)}
          aria-label={`Insert ${key}`}
          className="min-w-11 rounded-[10px] border border-border bg-panel px-2.5 py-2 font-mono text-[13px] text-ink-soft hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
