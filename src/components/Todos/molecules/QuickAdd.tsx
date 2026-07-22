"use client";

import { useState } from "react";
import { useTodoMutations } from "@/hooks/useTodos";
import { PlusIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * One-line task creator bound to a specific due date (or unscheduled). Submits
 * on Enter or the add button and clears itself, so many tasks can be typed in a
 * row without opening the full editor.
 */
export function QuickAdd({ due, placeholder = "Add a task…" }: { due: number | null; placeholder?: string }) {
  const { create } = useTodoMutations();
  const [title, setTitle] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    create.mutate({ title: trimmed, due, priority: "medium" });
    setTitle("");
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-panel px-2.5 py-2 focus-within:border-accent">
      <PlusIcon size={18} className="flex-none text-ink-soft" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-soft"
      />
      {title.trim() && (
        <button
          type="button"
          onClick={submit}
          className="flex-none rounded-lg bg-accent px-3 py-1 text-[12.5px] font-semibold text-white hover:brightness-110"
        >
          Add
        </button>
      )}
    </div>
  );
}
