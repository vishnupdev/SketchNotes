"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { SketchEngine } from "@/engine/SketchEngine";
import type { ExportFormat, NoteDocument, SketchBackup } from "@/engine/types";
import { saveBlob } from "@/engine/export";
import { storageAvailable } from "@/lib/storage";
import { fetchCustomThemes, fetchDensity, fetchTheme, fetchUiStyle } from "@/lib/notes-api";
import { CUSTOM_THEME_VARS, resolveTheme } from "@/lib/themes";
import { densityById, uiStyleById } from "@/lib/ui-style";
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
        onTextStyle: (font, size) => {
          const st = store.getState();
          st.setFontKey(font);
          st.setFontSize(size);
        },
        onToast: (msg) => store.getState().showToast(msg),
        getEditValue: () => store.getState().editValue,
      },
    });
    // Push current style to the fresh engine.
    engine.setTool(s.tool);
    engine.setColor(s.color);
    engine.setWidthIndex(s.widthIdx);
    engine.setCurrentEmoji(s.currentEmoji);
    engine.setFont(s.fontKey);
    engine.setTextSize(s.fontSize);
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
  const fontKey = useEditorStore((s) => s.fontKey);
  const fontSize = useEditorStore((s) => s.fontSize);
  const themeId = useEditorStore((s) => s.themeId);
  const customThemes = useEditorStore((s) => s.customThemes);
  const uiStyle = useEditorStore((s) => s.uiStyle);
  const density = useEditorStore((s) => s.density);

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
    engineRef.current?.setFont(fontKey);
  }, [fontKey]);
  useEffect(() => {
    engineRef.current?.setTextSize(fontSize);
  }, [fontSize]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const theme = resolveTheme(themeId, customThemes);
    const body = document.body;
    // Apply the palette: `data-theme` selects the token block, `data-dark`
    // flips every `dark:` utility for any dark palette.
    body.dataset.theme = theme.attr;
    if (theme.dark) body.dataset.dark = "";
    else delete body.dataset.dark;
    /*
     * A custom palette feeds its two user-chosen colours in as inline custom
     * properties, which the `custom-light`/`custom-dark` blocks derive the rest
     * from. They are cleared first so switching from a custom theme to a preset
     * cannot leave an inline `--on-accent` overriding the preset's own.
     */
    for (const name of CUSTOM_THEME_VARS) body.style.removeProperty(name);
    for (const [name, value] of Object.entries(theme.vars)) {
      body.style.setProperty(name, value);
    }
    // Read the resolved tokens back from CSS (single source of truth) so the
    // canvas selection highlight and the address-bar colour follow the theme.
    const cs = getComputedStyle(body);
    const accent = cs.getPropertyValue("--accent").trim();
    const paper = cs.getPropertyValue("--paper").trim();
    engineRef.current?.setTheme(theme.dark, accent || undefined);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m && paper) m.setAttribute("content", paper);
  }, [themeId, customThemes]);

  /*
   * Interface style and density. Separate from the palette effect above because
   * they are separate choices — and because these only ever set an attribute,
   * with all the work done by the `[data-ui]` / `[data-density]` blocks in
   * globals.css. Nothing is read back: no engine state depends on shape.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.ui = uiStyleById(uiStyle).id;
    document.body.dataset.density = densityById(density).id;
  }, [uiStyle, density]);

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

      // Custom palettes first: a stored `custom:` theme id cannot resolve to a
      // palette until they are loaded, and setting it first would flash the
      // default theme before correcting itself.
      const savedCustom = await fetchCustomThemes();
      if (savedCustom.length) st.setCustomThemes(savedCustom);
      const savedTheme = await fetchTheme();
      if (savedTheme) st.setTheme(savedTheme);

      const [savedStyle, savedDensity] = await Promise.all([fetchUiStyle(), fetchDensity()]);
      if (savedStyle) st.setUiStyle(savedStyle);
      if (savedDensity) st.setDensity(savedDensity);

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

  /**
   * Manual re-sync: flush anything pending, re-read the index and the current
   * note from storage, then repaint. Cheap enough to be a user-facing action and
   * non-destructive, unlike a page reload.
   */
  const refreshCmd = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await flushSave();
      await refetchIndex();
      const { curId } = store.getState();
      if (curId) {
        const doc = await loadNote(curId);
        const stored = JSON.stringify(doc.els);
        // Adopt the stored copy only when it genuinely differs — a no-op reload
        // would throw away the undo history for nothing. An empty read over a
        // canvas that still has work on it means the write never landed, so keep
        // what is on screen rather than blanking it.
        if (stored !== JSON.stringify(engine.getElements()) && (doc.els.length || engine.isEmpty())) {
          engine.loadDocument(doc);
          store.getState().setTitle(doc.title);
        }
      }
      engine.repaint();
      store.getState().showToast("Refreshed");
    } catch {
      store.getState().showToast("Refresh failed — try again");
    }
  }, [flushSave, loadNote, refetchIndex, store]);

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
      refresh: refreshCmd,
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
      refreshCmd,
      scheduleSave,
    ],
  );
}
