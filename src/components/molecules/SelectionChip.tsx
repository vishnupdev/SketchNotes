"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";
import { CloseIcon, DuplicateIcon, TrashSmallIcon } from "@/components/atoms/icons";

/** Floating actions for the current selection (duplicate / delete / deselect). */
export function SelectionChip() {
  const hasSelection = useEditorStore((s) => s.hasSelection);
  const tool = useEditorStore((s) => s.tool);
  const { duplicateSelection, deleteSelection, deselect } = useEditorCommands();

  if (!hasSelection || tool !== "select") return null;

  return (
    <div
      className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-ink p-1 text-[#eef3f6] shadow-panel"
      style={{ bottom: "calc(74px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={duplicateSelection}
        className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-2 text-[13px] font-semibold hover:bg-white/[.12]"
      >
        <DuplicateIcon size={15} />
        Duplicate
      </button>
      <button
        type="button"
        onClick={deleteSelection}
        className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-2 text-[13px] font-semibold text-[#ffab97] hover:bg-white/[.12]"
      >
        <TrashSmallIcon size={15} />
        Delete
      </button>
      <button
        type="button"
        aria-label="Deselect"
        onClick={deselect}
        className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-2 hover:bg-white/[.12]"
      >
        <CloseIcon size={15} />
      </button>
    </div>
  );
}
