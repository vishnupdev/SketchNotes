"use client";

import { useRef } from "react";
import { EditorContext } from "@/context/editor-context";
import { useEditorEngine } from "@/hooks/useEditorEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Header } from "@/components/SketchNotes/organisms/Header";
import { Dock } from "@/components/SketchNotes/organisms/Dock";
import { CanvasStage } from "@/components/SketchNotes/organisms/CanvasStage";
import { NotesDrawer } from "@/components/SketchNotes/organisms/NotesDrawer";
import { SelectionChip } from "@/components/SketchNotes/molecules/SelectionChip";
import { Zoomer } from "@/components/SketchNotes/molecules/Zoomer";
import { Toast } from "@/components/SketchNotes/atoms/Toast";

/** Registers global shortcuts; kept as a child so it sits inside the context. */
function ShortcutBridge() {
  useKeyboardShortcuts();
  return null;
}

/**
 * Editor page composition. Owns the canvas element refs, spins up the engine
 * orchestrator, and lays out the full chrome around the drawing surface.
 */
export function EditorShell() {
  const stageRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);

  const commands = useEditorEngine({ stage: stageRef, bg: bgRef, cv: cvRef });

  return (
    <EditorContext.Provider value={commands}>
      <ShortcutBridge />
      <Header />
      <CanvasStage stageRef={stageRef} bgRef={bgRef} cvRef={cvRef} />
      <SelectionChip />
      <Zoomer />
      <Dock />
      <NotesDrawer />
      <Toast />
    </EditorContext.Provider>
  );
}
