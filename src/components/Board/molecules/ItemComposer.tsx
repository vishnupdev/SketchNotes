"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/SketchNotes/atoms/icons";

interface ItemComposerProps {
  /** Placeholder text — also the accessible name of the field. */
  placeholder: string;
  label: string;
  onAdd: (text: string) => void;
}

/**
 * The "add a row" field at the foot of a checklist or links section.
 *
 * The prompt bar can do this too ("add milk to groceries"), but typing straight
 * into the card is faster for a run of rows, and it keeps the app usable for
 * anyone who would rather not phrase every edit as a sentence. Submitting keeps
 * focus in the field so rows can be typed one after another.
 */
export function ItemComposer({ placeholder, label, onAdd }: ItemComposerProps) {
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  }

  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[13px] placeholder:text-ink-soft focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label={label}
        className="tint hover-pop grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-accent disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PlusIcon size={16} />
      </button>
    </form>
  );
}
