"use client";

import { createContext, useContext, type RefObject } from "react";
import type { SketchEngine } from "@/engine/SketchEngine";
import type { ExportFormat } from "@/engine/types";

/** Imperative commands the chrome (header/dock/drawer) issues to the engine. */
export interface EditorCommands {
  engineRef: RefObject<SketchEngine | null>;

  // history & canvas
  undo: () => void;
  redo: () => void;
  clear: () => void;

  // selection
  deleteSelection: () => void;
  duplicateSelection: () => void;
  deselect: () => void;

  // view
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // text overlay
  commitText: (cancel: boolean) => void;

  // persistence trigger (e.g. after a title edit)
  markDirty: () => void;

  // export & notes
  exportAs: (fmt: ExportFormat) => Promise<void>;
  newNote: () => Promise<void>;
  openNote: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  importNote: (file: File) => Promise<void>;
  flushSave: () => Promise<void>;
}

export const EditorContext = createContext<EditorCommands | null>(null);

/** Access the editor command bus. Must be used under `EditorProvider`. */
export function useEditorCommands(): EditorCommands {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorCommands must be used within EditorProvider");
  return ctx;
}
