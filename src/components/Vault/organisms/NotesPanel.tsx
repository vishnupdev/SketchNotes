"use client";

import { useState } from "react";
import { useVaultStore, type SecretNote } from "@/store/useVaultStore";
import { timeAgo } from "@/lib/utils";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PlusIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * The encrypted notes: recovery codes, licence keys, the answer to a security
 * question you made up.
 *
 * Bodies are **hidden until asked for**, one at a time. Not theatre: the most
 * likely way anything here leaks is somebody glancing at the screen or a
 * screen-share you forgot was running, and a list that renders every secret at
 * once is a list you cannot safely open in a meeting.
 */
export function NotesPanel() {
  const notes = useVaultStore((s) => s.notes);
  const saveNote = useVaultStore((s) => s.saveNote);
  const removeNote = useVaultStore((s) => s.removeNote);

  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {editing === "new" ? (
        <NoteForm
          onCancel={() => setEditing(null)}
          onSave={async (title, body) => {
            await saveNote({ title, body });
            setEditing(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="tint inline-flex items-center justify-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
        >
          <PlusIcon size={15} />
          New note
        </button>
      )}

      {notes.length === 0 && editing !== "new" && (
        <div className="rounded-[14px] border border-border bg-panel p-5 text-center">
          <p className="text-[14px] font-bold">Nothing kept yet</p>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[12.5px] leading-relaxed text-ink-soft">
            The obvious first thing: the recovery codes a site gives you when you turn on two-factor
            authentication. They are the one thing that gets you back in when the codes above are on
            a phone you have lost.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {notes.map((note) =>
          editing === note.id ? (
            <li key={note.id}>
              <NoteForm
                note={note}
                onCancel={() => setEditing(null)}
                onSave={async (title, body) => {
                  await saveNote({ id: note.id, title, body });
                  setEditing(null);
                }}
              />
            </li>
          ) : (
            <NoteRow
              key={note.id}
              note={note}
              onEdit={() => setEditing(note.id)}
              onRemove={() => void removeNote(note.id)}
            />
          ),
        )}
      </ul>
    </div>
  );
}

function NoteRow({
  note,
  onEdit,
  onRemove,
}: {
  note: SecretNote;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* nothing to report — the body can be revealed and selected */
    }
  };

  return (
    <li className="rounded-[14px] border border-border bg-panel p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold">{note.title}</div>
          <div className="text-[11.5px] text-ink-soft">Saved {timeAgo(note.updated)}</div>
        </div>

        <div className="flex flex-none gap-1.5">
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            aria-expanded={shown}
            aria-label={shown ? `Hide ${note.title}` : `Show ${note.title}`}
            className="tint grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-accent hover:text-accent"
          >
            <EyeIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={`Copy ${note.title}`}
            className="tint grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-accent hover:text-accent"
          >
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          </button>
          <button
            type="button"
            onClick={confirming ? onRemove : () => setConfirming(true)}
            aria-label={confirming ? `Confirm deleting ${note.title}` : `Delete ${note.title}`}
            className={`grid size-9 place-items-center rounded-full border text-ink-soft ${
              confirming ? "border-danger bg-danger text-on-accent" : "border-border hover:border-danger hover:text-danger"
            }`}
          >
            <TrashSmallIcon size={15} />
          </button>
        </div>
      </div>

      {shown && (
        <>
          <pre className="scroll-slim mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-paper p-3 font-mono text-[12.5px] leading-relaxed">
            {note.body}
          </pre>
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 text-[12.5px] font-semibold text-accent underline decoration-dotted"
          >
            Edit
          </button>
        </>
      )}
    </li>
  );
}

function NoteForm({
  note,
  onSave,
  onCancel,
}: {
  note?: SecretNote;
  onSave: (title: string, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (body.trim() === "" || saving) return;
        setSaving(true);
        await onSave(title, body);
        setSaving(false);
      }}
      className="flex flex-col gap-2.5 rounded-[14px] border border-accent/45 bg-panel p-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="GitHub recovery codes"
          autoFocus
          className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] outline-none focus-visible:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Body</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          className="scroll-slim w-full resize-y rounded-xl border border-border bg-paper px-3 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none focus-visible:border-accent"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={body.trim() === "" || saving}
          className="tint rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-on-accent disabled:opacity-45"
        >
          {saving ? "Encrypting…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
