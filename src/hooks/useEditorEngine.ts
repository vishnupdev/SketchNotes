"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { SketchEngine } from "@/engine/SketchEngine";
import type { ExportFormat, NoteDocument, SketchBackup } from "@/engine/types";
import { saveBlob } from "@/engine/export";
import { storageAvailable } from "@/lib/storage";
import { fetchTheme } from "@/lib/notes-api";
import { uid } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useLoadNote, useNoteMutations } from "./useNotes";
import { useNotesIndex } from "./useNotes";
import type { EditorCommands } from "@/context/editor-context";

const SAVE_DEBOUNCE = 700;

export interface CanvasRefs {
  stage: RefObject<HTMLElement | null>;
  bg: RefObject<HTMLCanvasElement | null>;
  cv: RefObject<HTMLCanvasElement | null>;
}

/**
 * Central orchestrator: owns the {@link SketchEngine} instance, bridges its
 * imperative callbacks to the Zustand store, keeps engine style in sync with
 * the store, wires debounced auto-save through TanStack Query mutations, and
 * exposes the {@link EditorCommands} bus for the chrome.
 */
export function useEditorEngine(refs: CanvasRefs): EditorCommands {
  const engineRef = useRef<SketchEngine | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrapped = useRef(false);

  const { save, create, remove } = useNoteMutations();
  const loadNote = useLoadNote();
  const { refetch: refetchIndex } = useNotesIndex();

  // Stable store setters (Zustand setters are referentially stable).
  const store = useEditorStore;

  /* ----------------------------- auto-save ----------------------------- */

  const saveCurrent = useCallback(async () => {
    const { curId, title } = store.getState();
    const engine = engineRef.current;
    if (!curId || !engine) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const doc: NoteDocument = { title, els: engine.getElements() };
    await save.mutateAsync({ id: curId, doc });
    store.getState().setSaveStatus("saved");
  }, [save, store]);

  const scheduleSave = useCallback(() => {
    store.getState().setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveCurrent();
    }, SAVE_DEBOUNCE);
  }, [saveCurrent, store]);

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      await saveCurrent();
    }
  }, [saveCurrent]);

  /* --------------------------- engine lifecycle ------------------------ */

  useEffect(() => {
    const stage = refs.stage.current;
    const bg = refs.bg.current;
    const cv = refs.cv.current;
    if (!stage || !bg || !cv) return;

    const s = store.getState();
    const engine = new SketchEngine({
      stage,
      bg,
      cv,
      dark: s.dark,
      callbacks: {
        onSelectionChange: (has) => store.getState().setHasSelection(has),
        onHistoryChange: (u, r) => store.getState().setHistory(u, r),
        onZoomChange: (z) => store.getState().setZoom(z),
        onEmptyChange: (empty) => store.getState().setIsEmpty(empty),
        onDirty: () => scheduleSave(),
        onEdit: (state) => store.getState().setEditorOverlay(state),
        onToast: (msg) => store.getState().showToast(msg),
        getEditValue: () => store.getState().editValue,
      },
    });
    // Push current style to the fresh engine.
    engine.setTool(s.tool);
    engine.setColor(s.color);
    engine.setWidthIndex(s.widthIdx);
    engine.setCurrentEmoji(s.currentEmoji);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Engine is created once for the lifetime of the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------- store → engine style sync --------------------- */

  const tool = useEditorStore((s) => s.tool);
  const color = useEditorStore((s) => s.color);
  const widthIdx = useEditorStore((s) => s.widthIdx);
  const currentEmoji = useEditorStore((s) => s.currentEmoji);
  const dark = useEditorStore((s) => s.dark);

  useEffect(() => {
    engineRef.current?.setTool(tool);
  }, [tool]);
  useEffect(() => {
    engineRef.current?.setColor(color);
  }, [color]);
  useEffect(() => {
    engineRef.current?.setWidthIndex(widthIdx);
  }, [widthIdx]);
  useEffect(() => {
    engineRef.current?.setCurrentEmoji(currentEmoji);
  }, [currentEmoji]);
  useEffect(() => {
    engineRef.current?.setTheme(dark);
    if (typeof document !== "undefined") {
      document.body.dataset.theme = dark ? "dark" : "light";
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", dark ? "#141a21" : "#f7f8f6");
    }
  }, [dark]);

  /* ----------------------------- bootstrap ----------------------------- */

  const createFreshNote = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await flushSave();
    const id = uid();
    engine.resetDocument();
    const st = store.getState();
    st.setCurId(id);
    st.setTitle("");
    await create.mutateAsync({ id, doc: { title: "", els: [] } });
  }, [create, flushSave, store]);

  const openNoteInternal = useCallback(
    async (id: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      await flushSave();
      const doc = await loadNote(id);
      engine.loadDocument(doc);
      const st = store.getState();
      st.setCurId(id);
      st.setTitle(doc.title);
    },
    [flushSave, loadNote, store],
  );

  useEffect(() => {
    // Run exactly once; resolves against whichever engine is current (survives
    // StrictMode's mount→unmount→remount, which recreates the engine).
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      // Wait a tick so the engine-creation effect has run.
      await Promise.resolve();
      const st = store.getState();
      const available = storageAvailable();
      st.setStorageOK(available);

      const savedTheme = await fetchTheme();
      st.setDark(savedTheme !== "light");

      const index = (await refetchIndex()).data ?? [];
      if (index.length) {
        const latest = [...index].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        await openNoteInternal(latest.id);
      } else {
        await createFreshNote();
      }

      if (!available) {
        st.showToast("Notes will last for this session only — download to keep them");
      }
    })();
  }, [createFreshNote, openNoteInternal, refetchIndex, store]);

  /* ------------------------ visibility flush --------------------------- */

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void saveCurrent();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [saveCurrent]);

  /* ------------------------- note management --------------------------- */

  const deleteNoteCmd = useCallback(
    async (id: string) => {
      const next = await remove.mutateAsync(id);
      const { curId } = store.getState();
      if (id === curId) {
        if (next.length) {
          const latest = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
          await openNoteInternal(latest.id);
        } else {
          await createFreshNote();
        }
      }
      store.getState().showToast("Note deleted");
    },
    [remove, store, openNoteInternal, createFreshNote],
  );

  const importNoteCmd = useCallback(
    async (file: File) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const data = JSON.parse(await file.text()) as SketchBackup;
        if (!data || !Array.isArray(data.els)) throw new Error("bad file");
        await flushSave();
        const id = uid();
        const title = data.title || "Imported note";
        engine.loadDocument({ title, els: data.els });
        const st = store.getState();
        st.setCurId(id);
        st.setTitle(title);
        await create.mutateAsync({ id, doc: { title, els: data.els } });
        st.showToast("Note imported");
      } catch {
        store.getState().showToast("Import failed — choose a Sketchnotes .json file");
      }
    },
    [create, flushSave, store],
  );

  const exportAs = useCallback(
    async (fmt: ExportFormat) => {
      const engine = engineRef.current;
      if (!engine) return;
      const st = store.getState();
      if (engine.isEmpty()) {
        st.showToast("Canvas is empty — nothing to download yet");
        return;
      }
      try {
        const result = await engine.export(fmt, st.title);
        if (result) {
          saveBlob(result.blob, result.name);
          st.showToast(`Downloaded ${result.name}`);
        }
      } catch (e) {
        console.error(e);
        st.showToast("Export failed — try again");
      }
    },
    [store],
  );

  /* ------------------------------ commands ----------------------------- */

  return useMemo<EditorCommands>(
    () => ({
      engineRef,
      undo: () => engineRef.current?.undo(),
      redo: () => engineRef.current?.redo(),
      clear: () => engineRef.current?.clearCanvas(),
      deleteSelection: () => engineRef.current?.deleteSelection(),
      duplicateSelection: () => engineRef.current?.duplicateSelection(),
      deselect: () => engineRef.current?.deselect(),
      zoomIn: () => engineRef.current?.zoomIn(),
      zoomOut: () => engineRef.current?.zoomOut(),
      resetZoom: () => engineRef.current?.resetZoom(),
      commitText: (cancel) => engineRef.current?.commitText(cancel),
      markDirty: () => scheduleSave(),
      exportAs,
      newNote: createFreshNote,
      openNote: openNoteInternal,
      deleteNote: deleteNoteCmd,
      importNote: importNoteCmd,
      flushSave,
    }),
    [
      exportAs,
      createFreshNote,
      openNoteInternal,
      deleteNoteCmd,
      importNoteCmd,
      flushSave,
      scheduleSave,
    ],
  );
}
