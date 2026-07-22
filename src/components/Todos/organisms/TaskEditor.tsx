"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/lib/Todos/types";
import { startOfDay } from "@/lib/Todos/dates";
import { useTodos, useTodoMutations } from "@/hooks/useTodos";
import { useTodoStore } from "@/store/useTodoStore";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { PriorityFlag } from "@/components/Todos/atoms/PriorityFlag";
import { CloseIcon } from "@/components/SketchNotes/atoms/icons";

/** Local-date → `yyyy-mm-dd` for a native date input. */
function toDateInput(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** `yyyy-mm-dd` → local start-of-day epoch, or null if blank/invalid. */
function fromDateInput(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

/**
 * Modal for creating or editing a task. Driven by the store's `editor` target:
 * an `undefined` id means "create" (optionally pre-dated), a set id means "edit".
 */
export function TaskEditor() {
  const editor = useTodoStore((s) => s.editor);
  const closeEditor = useTodoStore((s) => s.closeEditor);
  const { data: tasks = [] } = useTodos();
  const { create, update } = useTodoMutations();

  const open = editor !== null;
  const existing = editor?.taskId ? tasks.find((t) => t.id === editor.taskId) ?? null : null;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Seed the form whenever the target changes (open, or switch task).
  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? "");
    setNotes(existing?.notes ?? "");
    setPriority(existing?.priority ?? "medium");
    // New tasks default to today unless a specific date was passed in.
    setDue(existing ? existing.due : editor?.due ?? startOfDay(Date.now()));
    // Focus the title on the next frame so the field is mounted.
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeEditor]);

  if (!open) return null;

  const trimmed = title.trim();
  const canSave = trimmed.length > 0;

  const submit = async () => {
    if (!canSave) return;
    const payload = { title: trimmed, notes: notes.trim(), priority, due };
    if (existing) await update.mutateAsync({ id: existing.id, patch: payload });
    else await create.mutateAsync(payload);
    closeEditor();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 min-[520px]:items-center min-[520px]:p-5">
      <button
        aria-label="Close editor"
        onClick={closeEditor}
        className="absolute inset-0 cursor-default bg-[rgba(15,20,26,.55)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Edit task" : "New task"}
        className="relative w-full max-w-[440px] rounded-t-2xl border border-border bg-panel p-5 shadow-panel min-[520px]:rounded-2xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">{existing ? "Edit task" : "New task"}</h2>
          <button
            aria-label="Close"
            onClick={closeEditor}
            className="tint -mr-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="What needs doing?"
            className="h-10 w-full rounded-xl border border-border bg-paper px-3 text-[14px] outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add detail (optional)"
            className="w-full resize-none rounded-xl border border-border bg-paper px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </label>

        <div className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <div>
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Due date</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={due != null ? toDateInput(due) : ""}
                onChange={(e) => setDue(fromDateInput(e.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-paper px-3 text-[13.5px] outline-none focus:border-accent"
              />
              {due != null && (
                <button
                  type="button"
                  aria-label="Clear due date"
                  onClick={() => setDue(null)}
                  className="tint grid size-9 flex-none place-items-center rounded-lg text-ink-soft hover:text-danger"
                >
                  <CloseIcon size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Priority</span>
            <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-paper p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  aria-current={priority === p}
                  className={cx(
                    "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors",
                    priority === p ? "bg-accent-soft" : "text-ink-soft hover:text-text",
                  )}
                >
                  <PriorityFlag priority={p} size={12} />
                  <span className={priority === p ? "text-text" : ""}>{PRIORITY_LABEL[p]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeEditor}
            className="tint rounded-[10px] border border-border px-4 py-2 text-[13px] font-semibold hover:border-accent"
          >
            Cancel
          </button>
          <PrimaryButton onClick={submit} disabled={!canSave} className="px-5">
            {existing ? "Save" : "Add task"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
