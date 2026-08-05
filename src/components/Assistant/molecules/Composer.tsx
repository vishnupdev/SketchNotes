"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/SketchNotes/atoms/icons";

const MAX_CHARS = 400;

interface ComposerProps {
  onSubmit: (question: string) => void;
  /** True while an answer is being composed — the field stays usable. */
  busy?: boolean;
}

/**
 * The question input: an auto-growing textarea plus a send button. Enter sends,
 * Shift+Enter adds a newline, and the field keeps focus so a conversation can be
 * held from the keyboard alone.
 */
export function Composer({ onSubmit, busy }: ComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the content, up to a few lines, then scroll internally.
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  const submit = () => {
    const question = value.trim();
    if (!question || busy) return;
    setValue("");
    onSubmit(question);
    ref.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border bg-panel p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
    >
      <label htmlFor="assistant-input" className="sr-only">
        Ask about this workspace
      </label>
      <textarea
        id="assistant-input"
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask what this workspace can do…"
        autoComplete="off"
        className="max-h-[132px] min-h-[42px] w-full flex-1 resize-none bg-transparent px-2.5 py-2.5 text-[15px] leading-snug text-text outline-none placeholder:text-ink-soft"
      />
      <button
        type="submit"
        disabled={!value.trim() || busy}
        aria-label="Send question"
        className="grid size-[42px] flex-none place-items-center rounded-xl bg-accent text-on-accent transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel disabled:opacity-40"
      >
        <SendIcon size={19} />
      </button>
    </form>
  );
}
