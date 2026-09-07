"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { fromPage, type OcrResult } from "@/lib/Ocr/blocks";
import { DEFAULT_TUNE, suggestScale, type TuneSettings } from "@/lib/Ocr/preprocess";
import { decode, prepare, type Picture } from "@/lib/Ocr/render";
import type { EngineProgress, RecogniseOptions } from "@/lib/Ocr/engine";
import type { ExportShape } from "@/lib/Ocr/export";

const PREFS_KEY = "sknotes:ocr:prefs";

export type OcrTool = "read" | "tune" | "batch";

export const OCR_TOOLS: OcrTool[] = ["read", "tune", "batch"];

export type Layout = NonNullable<RecogniseOptions["layout"]>;

export const LAYOUTS: { id: Layout; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Find columns and blocks — right for a page or a screenshot" },
  { id: "block", label: "One block", hint: "Treat it all as one paragraph — right for a crop or a label" },
  { id: "line", label: "One line", hint: "A single line of text, like a serial number" },
  { id: "sparse", label: "Scattered", hint: "Text dotted about — a diagram, a sign, a form" },
];

/** One picture's outcome in a batch run. */
export interface BatchItem {
  name: string;
  status: "waiting" | "reading" | "done" | "failed";
  text?: string;
  words?: number;
  confidence?: number;
  error?: string;
}

interface OcrState {
  tool: OcrTool;

  /** The picture being read, or null for the empty state. */
  picture: Picture | null;
  /** The recognised text, or null if nothing has been read yet. */
  result: OcrResult | null;
  /** A data URL of exactly what the engine was given, for the Tune preview. */
  preview: string | null;
  /** What the last prepare() reported about the size it used. */
  scaleNote: string;

  tune: TuneSettings;
  layout: Layout;
  shape: ExportShape;
  /** Whether the word boxes are drawn over the picture. */
  overlay: boolean;

  busy: boolean;
  progress: EngineProgress | null;
  error: string | null;
  /** Set once a recognition has succeeded, so the copy can stop warning. */
  engineWarm: boolean;

  batch: BatchItem[];
  batchRunning: boolean;

  setTool: (tool: OcrTool) => void;
  setLayout: (layout: Layout) => void;
  setShape: (shape: ExportShape) => void;
  setOverlay: (on: boolean) => void;
  patchTune: (patch: Partial<TuneSettings>) => void;
  resetTune: () => void;

  open: (file: File) => Promise<void>;
  close: () => void;
  /** Recognise the current picture with the current tune. */
  read: () => Promise<void>;
  /** Re-render the preview without recognising — what Tune's controls do. */
  refreshPreview: () => void;

  runBatch: (files: File[]) => Promise<void>;
  clearBatch: () => void;

  hydrate: () => Promise<void>;
}

/**
 * OCR's state.
 *
 * The engine lives in `lib/Ocr/engine.ts` as a module-level singleton rather
 * than in here, because it is not state the UI renders — it is a worker with a
 * wasm heap, and putting it in a store would invite a re-render to touch it.
 * What this holds is the picture, the tune, and the last result.
 *
 * Nothing about the picture or the text is ever persisted. Only the tune and
 * the mode choices are: an image someone ran through OCR is as likely to be a
 * payslip or a passport as a menu, and keeping the recognised text of one in
 * storage would be indefensible for a tool whose whole promise is that the
 * picture never leaves the device.
 */
export const useOcrStore = create<OcrState>((set, get) => ({
  tool: "read",

  picture: null,
  result: null,
  preview: null,
  scaleNote: "",

  tune: DEFAULT_TUNE,
  layout: "auto",
  shape: "paragraphs",
  overlay: true,

  busy: false,
  progress: null,
  error: null,
  engineWarm: false,

  batch: [],
  batchRunning: false,

  setTool: (tool) => {
    set({ tool });
    void persist(get());
  },
  setLayout: (layout) => {
    set({ layout });
    void persist(get());
  },
  setShape: (shape) => {
    set({ shape });
    void persist(get());
  },
  setOverlay: (overlay) => set({ overlay }),

  patchTune: (patch) => {
    set({ tune: { ...get().tune, ...patch } });
    get().refreshPreview();
    void persist(get());
  },
  resetTune: () => {
    const picture = get().picture;
    set({
      tune: {
        ...DEFAULT_TUNE,
        scale: picture ? suggestScale(picture.width, picture.height) : DEFAULT_TUNE.scale,
      },
    });
    get().refreshPreview();
    void persist(get());
  },

  open: async (file) => {
    set({ busy: true, error: null });
    try {
      const picture = await decode(file);
      const previous = get().picture;
      if (previous) URL.revokeObjectURL(previous.url);

      set({
        picture,
        result: null,
        // The suggested scale is applied on open rather than offered as advice.
        // A small screenshot read at 1× produces the bad first result that
        // makes people conclude the app does not work.
        tune: { ...get().tune, scale: suggestScale(picture.width, picture.height), rotate: 0 },
        busy: false,
        progress: null,
      });
      get().refreshPreview();
    } catch (err) {
      set({ busy: false, error: err instanceof Error ? err.message : "That picture could not be read." });
    }
  },

  close: () => {
    const picture = get().picture;
    if (picture) URL.revokeObjectURL(picture.url);
    set({ picture: null, result: null, preview: null, error: null, progress: null, scaleNote: "" });
  },

  refreshPreview: () => {
    const { picture, tune } = get();
    if (!picture) return;
    try {
      const { canvas, scaleNote } = prepare(picture, tune);
      // A JPEG preview rather than a PNG: a binarised 8-megapixel page is a
      // 300 KB PNG held in a string, and this is only ever shown at thumbnail
      // size next to the original.
      set({ preview: canvas.toDataURL("image/jpeg", 0.82), scaleNote });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "The picture could not be prepared." });
    }
  },

  read: async () => {
    const { picture, tune, layout } = get();
    if (!picture) return;

    set({ busy: true, error: null, progress: null });
    try {
      const { recognise } = await import("@/lib/Ocr/engine");
      const { canvas, plan, scaleNote } = prepare(picture, tune);
      set({ preview: canvas.toDataURL("image/jpeg", 0.82), scaleNote });

      const page = await recognise(canvas, {
        layout,
        onProgress: (progress) => set({ progress }),
      });

      set({
        result: fromPage(page, plan.width, plan.height),
        busy: false,
        engineWarm: true,
        progress: null,
      });
    } catch (err) {
      set({
        busy: false,
        progress: null,
        error: err instanceof Error ? err.message : "The picture could not be read.",
      });
    }
  },

  runBatch: async (files) => {
    if (files.length === 0) return;

    set({
      batchRunning: true,
      error: null,
      batch: files.map((file) => ({ name: file.name, status: "waiting" as const })),
    });

    try {
      const { recognise } = await import("@/lib/Ocr/engine");
      const { render } = await import("@/lib/Ocr/export");

      // Strictly one at a time. Sixty phone photos decoded concurrently is a
      // gigabyte of bitmaps and a killed tab, and the engine is one worker
      // anyway — parallelism here would only queue behind itself.
      for (const [index, file] of files.entries()) {
        set({ batch: patchItem(get().batch, index, { status: "reading" }) });
        try {
          const picture = await decode(file);
          const { canvas, plan } = prepare(picture, get().tune);
          const page = await recognise(canvas, {
            layout: get().layout,
            onProgress: (progress) => set({ progress }),
          });
          const result = fromPage(page, plan.width, plan.height);

          picture.bitmap.close();
          URL.revokeObjectURL(picture.url);

          set({
            batch: patchItem(get().batch, index, {
              status: "done",
              text: render(result, get().shape),
              words: result.words.length,
              confidence: result.confidence,
            }),
            engineWarm: true,
          });
        } catch (err) {
          set({
            batch: patchItem(get().batch, index, {
              status: "failed",
              error: err instanceof Error ? err.message : "Could not be read.",
            }),
          });
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "The engine could not be loaded." });
    }

    set({ batchRunning: false, progress: null });
  },

  clearBatch: () => set({ batch: [], progress: null }),

  hydrate: async () => {
    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw) as Partial<Prefs>;
      set({
        tool: OCR_TOOLS.includes(prefs.tool as OcrTool) ? (prefs.tool as OcrTool) : "read",
        layout: LAYOUTS.some((l) => l.id === prefs.layout) ? (prefs.layout as Layout) : "auto",
        shape: prefs.shape ?? "paragraphs",
        tune: { ...DEFAULT_TUNE, ...prefs.tune },
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },
}));

const patchItem = (batch: BatchItem[], index: number, patch: Partial<BatchItem>): BatchItem[] =>
  batch.map((item, i) => (i === index ? { ...item, ...patch } : item));

interface Prefs {
  tool: OcrTool;
  layout: Layout;
  shape: ExportShape;
  tune: TuneSettings;
}

const persist = (state: OcrState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: state.tool,
      layout: state.layout,
      shape: state.shape,
      // Not the scale: it is chosen from the picture's own size on open, and a
      // remembered 3× from a screenshot would be wrong for the next photo.
      tune: { ...state.tune, scale: DEFAULT_TUNE.scale },
    } satisfies Prefs),
  );
