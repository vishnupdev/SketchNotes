"use client";

import { useState } from "react";
import { transliterate } from "@/lib/MalayalamWriter/transliterate";

interface ManglishInputProps {
  /** Append recognized Malayalam text to the document. */
  onInsert: (text: string) => void;
}

/**
 * Type romanized "Manglish" and see the live Malayalam transliteration; the
 * Insert button (or Enter) pushes it into the document. Conversion is offline
 * and phonetic — see {@link transliterate}.
 */
export function ManglishInput({ onInsert }: ManglishInputProps) {
  const [raw, setRaw] = useState("");
  const preview = transliterate(raw);

  function insert() {
    const text = preview.trim();
    if (!text) return;
    onInsert(text + " ");
    setRaw("");
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="manglish" className="text-[12.5px] font-semibold text-ink-soft">
        Type in English letters (e.g. <span className="font-mono">namaskaaram</span>)
      </label>
      <textarea
        id="manglish"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          // Enter inserts; Shift+Enter keeps a newline for multi-line input.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            insert();
          }
        }}
        rows={2}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="namaskaaram, sukhamaano?"
        className="w-full resize-y rounded-xl border border-border bg-paper px-3.5 py-3 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent"
      />

      <div className="rounded-xl border border-border bg-panel px-3.5 py-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
          Preview
        </div>
        <div lang="ml" className="min-h-[1.6em] break-words text-[19px] leading-relaxed">
          {preview || <span className="text-ink-soft">…</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={insert}
          disabled={!preview.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110 disabled:opacity-40"
        >
          Insert into document
        </button>
        <button
          type="button"
          onClick={() => setRaw("")}
          disabled={!raw}
          className="rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
