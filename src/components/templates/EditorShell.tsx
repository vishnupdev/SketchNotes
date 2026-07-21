"use client";

import { useRef } from "react";
import { EditorContext } from "@/context/editor-context";
import { useEditorEngine } from "@/hooks/useEditorEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Header } from "@/components/organisms/Header";
import { Dock } from "@/components/organisms/Dock";
import { CanvasStage } from "@/components/organisms/CanvasStage";
import { NotesDrawer } from "@/components/organisms/NotesDrawer";
import { SelectionChip } from "@/components/molecules/SelectionChip";
import { Zoomer } from "@/components/molecules/Zoomer";
import { Toast } from "@/components/atoms/Toast";

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
