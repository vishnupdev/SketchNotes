"use client";

import { useEffect, useState } from "react";
import { useSnippetsStore } from "@/store/useSnippetsStore";
import { LANGUAGES, guessLanguage } from "@/lib/Snippets/highlight";
import { MAX_BODY, type Snippet } from "@/lib/Snippets/types";
import { CodeBlock } from "@/components/SketchNotes/molecules/CodeBlock";
import {
  ChevronLeftIcon,
  DuplicateIcon,
  EyeIcon,
  PenIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Edit one snippet.
 *
 * Writes straight through to the store on every keystroke rather than holding a
 * draft and offering a Save button. There is no failure mode that a draft would
 * protect against — the store is the only copy, storage is local and instant — and
 * an unsaved-changes state is a thing to lose work in. Delete asks first, because
 * that is the one action here that is not undoable.
 *
 * The preview toggle exists because the editor has to be a plain `<textarea>`
 * (anything else breaks selection, undo and mobile keyboards), and a plain
 * textarea cannot show highlighting. Rather than fake a highlighted editor with an
 * overlay — which desynchronises on every scroll — you can just look at it.
 */
export function SnippetEditor({ snippet }: { snippet: Snippet }) {
  const update = useSnippetsStore((s) => s.update);
  const setTags = useSnippetsStore((s) => s.setTags);
  const remove = useSnippetsStore((s) => s.remove);
  const duplicate = useSnippetsStore((s) => s.duplicate);
  const edit = useSnippetsStore((s) => s.edit);

  const [tagDraft, setTagDraft] = useState(snippet.tags.join(", "));
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Follow a switch to a different snippet (duplicate, say) rather than showing
  // the previous one's tags.
  useEffect(() => {
    setTagDraft(snippet.tags.join(", "));
    setConfirmDelete(false);
  }, [snippet.id, snippet.tags]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => edit(null)}
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
        >
          <ChevronLeftIcon size={15} />
          All snippets
        </button>

        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            title={preview ? "Back to editing" : "Preview with highlighting"}
            className="tint grid size-9 place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
          >
            {preview ? <PenIcon size={15} /> : <EyeIcon size={15} />}
          </button>
          <button
            type="button"
            onClick={() => duplicate(snippet.id)}
            title="Duplicate this snippet"
            aria-label="Duplicate this snippet"
            className="tint grid size-9 place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
          >
            <DuplicateIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => (confirmDelete ? remove(snippet.id) : setConfirmDelete(true))}
            className={cx(
              "tint inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
              confirmDelete
                ? "border-danger bg-danger text-on-accent"
                : "border-border bg-panel text-ink-soft hover:border-danger hover:text-danger",
            )}
          >
            <TrashSmallIcon size={14} />
            {confirmDelete ? "Really delete" : "Delete"}
          </button>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[180px] flex-1">
          <label
            htmlFor="snippet-title"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Title
          </label>
          <input
            id="snippet-title"
            type="text"
            value={snippet.title}
            onChange={(e) => update(snippet.id, { title: e.target.value })}
            placeholder="What this is for"
            className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[14px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="w-[140px] flex-none">
          <label
            htmlFor="snippet-language"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            Language
          </label>
          <select
            id="snippet-language"
            value={snippet.language}
            onChange={(e) => update(snippet.id, { language: e.target.value })}
            className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2 py-2 text-[12.5px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="snippet-tags"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Tags
        </label>
        <input
          id="snippet-tags"
          type="text"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          // Committed on blur rather than per keystroke: parsing mid-word would
          // split "auth" into "a", "au", "aut" as it was typed.
          onBlur={() => setTags(snippet.id, tagDraft)}
          placeholder="api, auth, jwt"
          spellCheck={false}
          className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-1.5 font-mono text-[12.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <p className="mt-1 text-[11px] text-ink-soft">
          Separated by commas or spaces. Up to eight. Search them with{" "}
          <code className="font-mono">#tag</code>.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor="snippet-body"
            className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
          >
            {preview ? "Preview" : "Code"}
          </label>
          <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
            {snippet.body.length.toLocaleString()} / {MAX_BODY.toLocaleString()}
          </span>
        </div>

        {preview ? (
          <div className="mt-1">
            <CodeBlock code={snippet.body} language={snippet.language} lineNumbers />
          </div>
        ) : (
          <textarea
            id="snippet-body"
            value={snippet.body}
            onChange={(e) => update(snippet.id, { body: e.target.value })}
            onPaste={(e) => {
              // A paste into an empty, untitled snippet is almost always the
              // first thing that happens to it — so that is the moment to guess
              // the language, while there is no user choice to override.
              if (snippet.body.trim()) return;
              const text = e.clipboardData.getData("text");
              if (text) update(snippet.id, { language: guessLanguage(text) });
            }}
            rows={16}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste the code you keep looking up"
            className="mt-1 w-full resize-y rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 font-mono text-[12.5px] leading-[1.55] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        )}
      </div>
    </div>
  );
}
