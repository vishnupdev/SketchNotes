"use client";

import { create } from "zustand";
import { readMeta, stripMeta, type ImageMeta, type MetaBlock } from "@/lib/Exif/containers";
import { coordinatesFrom } from "@/lib/Exif/tiff";
import { cleanOne, MAX_BATCH, zipCleaned, type BatchItem } from "@/lib/Exif/batch";
import { uid } from "@/lib/utils";

export type ExifTool = "read" | "clean" | "batch";

export const EXIF_TOOLS: ExifTool[] = ["read", "clean", "batch"];

/** The cleaned file, alongside what came out of it. */
export interface Cleaned {
  bytes: Uint8Array;
  removed: MetaBlock[];
  /** Bytes saved — the removed metadata, exactly. */
  saved: number;
}

interface ExifState {
  tool: ExifTool;
  /** What was opened, or null. */
  name: string | null;
  meta: ImageMeta | null;
  /** An object URL for the preview, revoked when another file is opened. */
  preview: string | null;
  /** Where the picture says it was taken, if it says. */
  coordinates: { lat: number; lon: number } | null;
  cleaned: Cleaned | null;
  reading: boolean;
  error: string | null;

  /** The batch queue, in the order the files were added. */
  batch: BatchItem[];
  /** How many of the batch have been processed, while it runs. */
  batchDone: number;
  batchRunning: boolean;
  batchError: string | null;

  setTool: (tool: ExifTool) => void;
  read: (file: File) => Promise<void>;
  clean: () => void;
  close: () => void;

  /** Read and strip every file given, appending to the queue. */
  runBatch: (files: File[]) => Promise<void>;
  clearBatch: () => void;
  /** Bundle the cleaned files into a zip. */
  zipBatch: () => Promise<Blob | null>;
}

/**
 * Exif's state.
 *
 * Like Scan, this app **stores nothing**. Not as an oversight — a picture whose
 * metadata you are checking is the last thing that should be left in a
 * browser's storage, and the location it may contain is the whole reason
 * someone opens this. So the file lives in memory for as long as it is on
 * screen and is gone on close, and there is no owner rule for it in
 * `lib/storage-keys.ts` because there is no key to own.
 *
 * The bytes are held (rather than only the parsed result) because cleaning
 * works on the original file — see `lib/Exif/containers.ts` for why that is a
 * segment edit and not a re-encode.
 */
let bytes: Uint8Array | null = null;

/** Files larger than this are read but not previewed. */
const MAX_BYTES = 100 * 1024 * 1024;

export const useExifStore = create<ExifState>((set, get) => ({
  tool: "read",
  name: null,
  meta: null,
  preview: null,
  coordinates: null,
  cleaned: null,
  reading: false,
  error: null,
  batch: [],
  batchDone: 0,
  batchRunning: false,
  batchError: null,

  setTool: (tool) => set({ tool }),

  read: async (file) => {
    const previous = get().preview;
    if (previous) URL.revokeObjectURL(previous);

    if (file.size > MAX_BYTES) {
      set({ error: "That file is over 100 MB, which is larger than this will read." });
      return;
    }

    set({ reading: true, error: null, cleaned: null, preview: null, meta: null, name: file.name });

    try {
      bytes = new Uint8Array(await file.arrayBuffer());
      const meta = readMeta(bytes);
      set({
        meta,
        coordinates: coordinatesFrom(meta.tags),
        // The preview is the file itself, not a re-encode: what is on screen is
        // what will be cleaned.
        preview: meta.format === "unknown" ? null : URL.createObjectURL(file),
        reading: false,
        tool: "read",
      });
    } catch {
      bytes = null;
      set({ reading: false, error: "That file could not be read." });
    }
  },

  clean: () => {
    if (!bytes) return;
    const result = stripMeta(bytes);
    set({
      cleaned: {
        bytes: result.bytes,
        removed: result.removed,
        saved: bytes.length - result.bytes.length,
      },
      tool: "clean",
    });
  },

  close: () => {
    const preview = get().preview;
    if (preview) URL.revokeObjectURL(preview);
    bytes = null;
    set({
      name: null,
      meta: null,
      preview: null,
      coordinates: null,
      cleaned: null,
      error: null,
    });
  },

  /**
   * Work the queue **one file at a time**, publishing each result as it lands.
   *
   * Sequential rather than `Promise.all`: sixty `arrayBuffer()` calls in flight
   * means sixty whole files resident at once, which on phone photos is a
   * gigabyte and a killed tab. One at a time also makes the progress count
   * honest, and each result is set as it completes so a long batch visibly
   * moves instead of appearing to hang.
   */
  runBatch: async (files) => {
    if (get().batchRunning || files.length === 0) return;

    const room = MAX_BATCH - get().batch.length;
    if (room <= 0) {
      set({ batchError: `The queue is full at ${MAX_BATCH} files. Save or clear it first.` });
      return;
    }

    const taking = files.slice(0, room);
    set({
      batchRunning: true,
      batchDone: 0,
      batchError:
        taking.length < files.length
          ? `Only the first ${taking.length} of ${files.length} files were taken — the queue holds ${MAX_BATCH}.`
          : null,
    });

    for (const [index, file] of taking.entries()) {
      const item = await cleanOne(file, uid());
      set({ batch: [...get().batch, item], batchDone: index + 1 });
    }

    set({ batchRunning: false });
  },

  clearBatch: () => set({ batch: [], batchDone: 0, batchError: null }),

  zipBatch: async () => {
    const items = get().batch.filter((item) => item.output);
    if (items.length === 0) return null;
    try {
      return await zipCleaned(items);
    } catch {
      set({ batchError: "The archive could not be built." });
      return null;
    }
  },
}));
