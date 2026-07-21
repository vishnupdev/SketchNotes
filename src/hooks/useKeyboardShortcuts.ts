"use client";

import { useEffect } from "react";
import type { Tool } from "@/engine/types";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";

const TOOL_MAP: Record<string, Tool> = {
  v: "select",
  "1": "select",
  p: "pen",
  "2": "pen",
  e: "eraser",
  l: "line",
  a: "arrow",
  r: "rect",
  o: "ellipse",
  t: "text",
};

/** Global keyboard shortcuts, ignored while a text field is focused. */
export function useKeyboardShortcuts(): void {
  const cmd = useEditorCommands();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;

      const store = useEditorStore.getState();
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        cmd.undo();
        return;
      }
      if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        cmd.redo();
        return;
      }
      if (mod && k === "d") {
        if (store.hasSelection) {
          e.preventDefault();
          cmd.duplicateSelection();
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.hasSelection) cmd.deleteSelection();
        return;
      }
      if (e.key === "Escape") {
        store.setDrawerOpen(false);
        store.closePopovers();
        if (store.hasSelection) cmd.deselect();
        return;
      }
      if (mod || e.altKey) return;
      const t = TOOL_MAP[k];
      if (t) store.setTool(t);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmd]);
}
