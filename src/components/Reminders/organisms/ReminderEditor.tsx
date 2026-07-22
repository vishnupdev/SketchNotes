"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { DEFAULT_SOUND, REPEATS, REPEAT_LABEL, type Repeat, type SoundId } from "@/lib/Reminders/types";
import { fromLocalInput, nextQuarterHour, toLocalInput } from "@/lib/Reminders/format";
import { useReminders, useReminderMutations } from "@/hooks/useReminders";
import { useReminderStore } from "@/store/useReminderStore";
import { SoundPicker } from "@/components/Reminders/molecules/SoundPicker";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { CloseIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Modal for creating or editing a reminder. Driven by the store's `editor`
 * target: no id means "create" (defaulting to the next quarter-hour), an id
 * means "edit".
 */
export function ReminderEditor() {
  const editor = useReminderStore((s) => s.editor);
  const closeEditor = useReminderStore((s) => s.closeEditor);
  const { data: reminders = [] } = useReminders();
  const { create, update } = useReminderMutations();

  const open = editor !== null;
  const existing = editor?.reminderId
    ? reminders.find((r) => r.id === editor.reminderId) ?? null
    : null;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [fireAt, setFireAt] = useState<number | null>(null);
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [sound, setSound] = useState<SoundId>(DEFAULT_SOUND);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? "");
    setNotes(existing?.notes ?? "");
    setFireAt(existing ? existing.fireAt : nextQuarterHour(Date.now()));
    setRepeat(existing?.repeat ?? "none");
    setSound(existing?.sound ?? DEFAULT_SOUND);
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

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
  const canSave = trimmed.length > 0 && fireAt != null;

  const submit = async () => {
    if (!canSave || fireAt == null) return;
    if (existing) {
      // Re-arm on save so an edited past reminder can fire again.
      await update.mutateAsync({
        id: existing.id,
        patch: { title: trimmed, notes: notes.trim(), fireAt, repeat, sound, firedAt: null, enabled: true },
      });
    } else {
      await create.mutateAsync({ title: trimmed, notes: notes.trim(), fireAt, repeat, sound });
    }
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
        aria-label={existing ? "Edit reminder" : "New reminder"}
        className="relative max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-2xl border border-border bg-panel p-5 shadow-panel min-[520px]:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">{existing ? "Edit reminder" : "New reminder"}</h2>
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
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Remind me to…"
            className="h-10 w-full rounded-xl border border-border bg-paper px-3 text-[14px] outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add detail (optional)"
            className="w-full resize-none rounded-xl border border-border bg-paper px-3 py-2 text-[13.5px] outline-none placeholder:text-ink-soft focus:border-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Date &amp; time</span>
          <input
            type="datetime-local"
            value={fireAt != null ? toLocalInput(fireAt) : ""}
            onChange={(e) => setFireAt(fromLocalInput(e.target.value))}
            className="h-10 w-full rounded-xl border border-border bg-paper px-3 text-[13.5px] outline-none focus:border-accent"
          />
        </label>

        <div className="mt-3">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Repeat</span>
          <div className="inline-flex w-full gap-1 rounded-xl border border-border bg-paper p-1">
            {REPEATS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRepeat(r)}
                aria-current={repeat === r}
                className={cx(
                  "flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors",
                  repeat === r ? "bg-accent text-white" : "text-ink-soft hover:text-text",
                )}
              >
                {REPEAT_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Notification sound</span>
          <SoundPicker value={sound} onChange={setSound} />
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
            {existing ? "Save" : "Add reminder"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
