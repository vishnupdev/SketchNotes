"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/**
 * Workspace-wide keyboard shortcuts — the ones that belong to the shell rather
 * than to whichever app is on screen.
 *
 *   Ctrl/⌘ + K   open (or close) the command palette
 *
 * Deliberately separate from `useKeyboardShortcuts`, which is the sketch
 * canvas's own key map and is only mounted with the editor. This one is mounted
 * once by {@link Workspace}, so it works in every app.
 *
 * Ctrl+K fires even while a text field has focus: the browser's own binding
 * there is a rarely-used "delete to end of line", and a palette that stops
 * working the moment you are typing is a palette people stop reaching for. The
 * event is claimed with `preventDefault` so nothing else acts on it too.
 */
export function useWorkspaceKeys(): void {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      togglePalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);
}
