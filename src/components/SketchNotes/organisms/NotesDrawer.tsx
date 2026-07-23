"use client";

import { useRef } from "react";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";
import { useNotesIndex } from "@/hooks/useNotes";
import { IconButton } from "@/components/SketchNotes/atoms/IconButton";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { NoteListItem } from "@/components/SketchNotes/molecules/NoteListItem";
import { CloseIcon, ImportIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";

/** Slide-in notes panel: list, create, import and delete. */
export function NotesDrawer() {
  const open = useEditorStore((s) => s.drawerOpen);
  const curId = useEditorStore((s) => s.curId);
  const storageOK = useEditorStore((s) => s.storageOK);
  const setDrawerOpen = useEditorStore((s) => s.setDrawerOpen);

  const { newNote, openNote, deleteNote, importNote } = useEditorCommands();
  const { data: notes = [] } = useNotesIndex();
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => setDrawerOpen(false);

  const handleOpen = (id: string) => {
    if (id === curId) {
      close();
      return;
    }
    void openNote(id).then(close);
  };

  return (
    <>
      <div
        onClick={close}
        className={cx(
          "fixed inset-0 z-[55] bg-[rgba(31,42,51,.42)] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Notes"
        inert={!open}
        className={cx(
          "fixed inset-y-0 left-0 z-[60] flex w-[min(84vw,320px)] flex-col bg-panel transition-transform duration-200 ease-out",
          open ? "translate-x-0 shadow-panel" : "-translate-x-[103%]",
        )}
        style={{
          padding:
            "calc(10px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom)) 10px",
        }}
      >
        <div className="flex items-center gap-1.5 px-0.5 pb-2.5 pl-1.5 pt-0.5">
          <h2 className="m-0 flex-1 font-hand text-[19px]">Notes</h2>
          <PrimaryButton
            className="h-[34px] px-[11px] text-[13px]"
            onClick={() => void newNote().then(close)}
          >
            <PlusIcon size={14} />
            New
          </PrimaryButton>
          <IconButton
            aria-label="Import note from JSON"
            title="Import .json backup"
            onClick={() => fileRef.current?.click()}
          >
            <ImportIcon size={18} />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importNote(f).then(close);
            }}
          />
          <IconButton aria-label="Close" onClick={close}>
            <CloseIcon size={18} />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {notes.length ? (
            notes.map((n) => (
              <NoteListItem
                key={n.id}
                note={n}
                active={n.id === curId}
                onOpen={handleOpen}
                onDelete={(id) => void deleteNote(id)}
              />
            ))
          ) : (
            <div className="px-2.5 py-6 text-center text-ink-soft">
              No notes yet — start sketching!
            </div>
          )}
        </div>

        <div className="px-1.5 pt-2.5 text-[11px] text-ink-soft">
          {storageOK
            ? "Notes save automatically."
            : "Storage unavailable here — notes last for this session only. Use download to keep your work."}
        </div>

        <div className="mt-2 border-t border-border px-1.5 pb-0.5 pt-2.5 text-[11.5px] leading-[1.6] text-ink-soft">
          Designed &amp; developed by <b className="font-semibold text-text">Vishnu&nbsp;P</b>
          <br />
          <a href="tel:7510334431" aria-label="Call Vishnu P" className="font-semibold text-accent hover:underline">
            ☎ 7510334431
          </a>
        </div>
      </aside>
    </>
  );
}
