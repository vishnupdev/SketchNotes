"use client";

import { KEY_ARIA, KEY_GROUPS } from "@/lib/MalayalamWriter/keyboard";

interface MalayalamKeyboardProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
}

/**
 * Tappable Malayalam keyboard. Every glyph inserts itself at the document caret;
 * a control row provides space, backspace and newline. Fully offline. Keys are
 * real buttons, so the whole board is keyboard- and screen-reader navigable.
 */
export function MalayalamKeyboard({ onInsert, onBackspace }: MalayalamKeyboardProps) {
  return (
    <div className="flex flex-col gap-4">
      {KEY_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
            {group.label}
          </div>
          <div role="group" aria-label={group.label} className="flex flex-wrap gap-1.5">
            {group.keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onInsert(key)}
                aria-label={KEY_ARIA[key] ?? key}
                lang="ml"
                className="grid size-10 place-items-center rounded-lg border border-border bg-panel text-[18px] transition-colors hover:border-accent hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onInsert(" ")}
          className="h-10 flex-1 rounded-lg border border-border bg-panel text-[12px] font-semibold uppercase tracking-[.1em] text-ink-soft transition-colors hover:border-accent hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Space
        </button>
        <button
          type="button"
          onClick={() => onInsert("\n")}
          aria-label="New line"
          className="grid size-10 place-items-center rounded-lg border border-border bg-panel text-[16px] text-ink-soft transition-colors hover:border-accent hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ↵
        </button>
        <button
          type="button"
          onClick={onBackspace}
          aria-label="Backspace"
          className="grid size-10 place-items-center rounded-lg border border-border bg-panel text-[16px] text-ink-soft transition-colors hover:border-accent hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
