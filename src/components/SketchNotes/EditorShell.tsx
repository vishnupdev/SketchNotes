"use client";

import { useEffect, useRef } from "react";
import { EditorContext, useEditorCommands } from "@/context/editor-context";
import { useEditorEngine } from "@/hooks/useEditorEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Header } from "@/components/SketchNotes/organisms/Header";
import { Dock } from "@/components/SketchNotes/organisms/Dock";
import { CanvasStage } from "@/components/SketchNotes/organisms/CanvasStage";
import { NotesDrawer } from "@/components/SketchNotes/organisms/NotesDrawer";
import { SelectionChip } from "@/components/SketchNotes/molecules/SelectionChip";
import { Zoomer } from "@/components/SketchNotes/molecules/Zoomer";
import { RefreshButton } from "@/components/SketchNotes/molecules/RefreshButton";
import { Toast } from "@/components/SketchNotes/atoms/Toast";
import { useIntakeStore } from "@/store/useIntakeStore";
import { useFocusStore } from "@/store/useFocusStore";

/** Registers global shortcuts; kept as a child so it sits inside the context. */
function ShortcutBridge() {
  useKeyboardShortcuts();
  return null;
}

/**
 * Opens a note file the operating system handed to OneApp — a `.json` sketch
 * export double-clicked on the desktop, or shared in.
 *
 * A child of the provider for the same reason as {@link ShortcutBridge}: the
 * import command lives on the editor context. Taking the arrival removes it, so
 * remounting the shell can never re-import the same file.
 */
function IntakeConsumer() {
  const { importNote } = useEditorCommands();
  const take = useIntakeStore((s) => s.take);
  const pending = useIntakeStore((s) => s.pending.some((i) => i.kind === "note"));

  useEffect(() => {
    if (!pending) return;
    const item = take("note");
    if (item?.file) void importNote(item.file);
  }, [importNote, pending, take]);

  return null;
}

/**
 * Opens the note a palette search hit named.
 *
 * A child of the provider, like the others here, because opening a note is an
 * editor command. The target is *taken* (which clears it), so remounting the
 * shell cannot jump the user somewhere a second time.
 */
function FocusConsumer() {
  const { openNote } = useEditorCommands();
  const takeFocus = useFocusStore((s) => s.take);
  const pending = useFocusStore((s) => s.app === "sketchnotes");

  useEffect(() => {
    if (!pending) return;
    const id = takeFocus("sketchnotes");
    if (id) void openNote(id);
  }, [openNote, pending, takeFocus]);

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
      <IntakeConsumer />
      <FocusConsumer />
      <Header />
      <CanvasStage stageRef={stageRef} bgRef={bgRef} cvRef={cvRef} />
      <SelectionChip />
      <Zoomer />
      <RefreshButton />
      <Dock />
      <NotesDrawer />
      <Toast />
    </EditorContext.Provider>
  );
}
