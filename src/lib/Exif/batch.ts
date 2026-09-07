/**
 * Cleaning a folder's worth of pictures at once.
 *
 * The single-file panels answer "what is in this photo"; this answers the
 * question people actually arrive with — *these thirty are going somewhere, get
 * the locations out of them.* Nobody strips one holiday photo.
 *
 * The work per file is exactly {@link readMeta} + {@link stripMeta}, already
 * tested in `exif.test.ts`, so this file is only the bookkeeping: what happened
 * to each one, what the totals are, and what the zip should be called. Those
 * are the parts a UI reads, and they are pure so they can be checked.
 *
 * Nothing is stored, as everywhere in this app. The queue lives in memory and
 * dies with the tab.
 */

import { detectFormat, readMeta, stripMeta, type ImageFormat } from "./containers";

/** What became of one file in the queue. */
export type BatchOutcome =
  /** Metadata was found and removed. */
  | "cleaned"
  /** Readable, but there was nothing to remove. */
  | "already-clean"
  /** A format whose metadata this cannot edit (GIF, or not an image at all). */
  | "unsupported"
  /** The bytes could not be read at all. */
  | "failed";

export interface BatchItem {
  id: string;
  name: string;
  format: ImageFormat;
  /** Size of the file as opened. */
  bytes: number;
  outcome: BatchOutcome;
  /** Bytes removed — the metadata, exactly. Zero unless `cleaned`. */
  saved: number;
  /** Human list of what came out, for the row's detail line. */
  removed: string[];
  /** True when the picture carried a GPS position. Worth calling out by name. */
  hadLocation: boolean;
  /** The cleaned file, absent unless `cleaned`. */
  output?: Uint8Array;
}

/** Files past this are refused rather than read, to keep the tab alive. */
export const MAX_BATCH = 60;
/** Per-file ceiling, matching the single-file panels. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

/**
 * Read one file and strip it.
 *
 * Never throws: a batch stops being useful the moment one bad file can end it,
 * so every failure becomes an outcome on the row instead.
 */
export async function cleanOne(file: File, id: string): Promise<BatchItem> {
  const base: BatchItem = {
    id,
    name: file.name,
    format: "unknown",
    bytes: file.size,
    outcome: "failed",
    saved: 0,
    removed: [],
    hadLocation: false,
  };

  if (file.size > MAX_FILE_BYTES) return { ...base, outcome: "unsupported" };

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = detectFormat(bytes);
    const editable = format === "jpeg" || format === "png" || format === "webp";
    if (!editable) return { ...base, format, outcome: "unsupported" };

    const meta = readMeta(bytes);
    const hadLocation = meta.tags.some((tag) => tag.group === "GPS" && tag.name === "Latitude");
    const result = stripMeta(bytes);

    if (result.removed.length === 0) {
      return { ...base, format, outcome: "already-clean", hadLocation };
    }

    return {
      ...base,
      format,
      outcome: "cleaned",
      saved: bytes.length - result.bytes.length,
      removed: result.removed.map((block) => block.kind),
      hadLocation,
      output: result.bytes,
    };
  } catch {
    return base;
  }
}

export interface BatchTotals {
  files: number;
  cleaned: number;
  alreadyClean: number;
  unsupported: number;
  failed: number;
  /** Bytes removed across the batch. */
  saved: number;
  /** How many carried a location — the figure worth saying out loud. */
  located: number;
  /** True when at least one file can be saved. */
  hasOutput: boolean;
}

/** Totals for the report line above the queue. */
export function batchTotals(items: BatchItem[]): BatchTotals {
  const count = (outcome: BatchOutcome) => items.filter((item) => item.outcome === outcome).length;
  return {
    files: items.length,
    cleaned: count("cleaned"),
    alreadyClean: count("already-clean"),
    unsupported: count("unsupported"),
    failed: count("failed"),
    saved: items.reduce((sum, item) => sum + item.saved, 0),
    located: items.filter((item) => item.hadLocation).length,
    hasOutput: items.some((item) => item.output !== undefined),
  };
}

/**
 * The name a cleaned file keeps inside the zip.
 *
 * The original name is kept — these are going back into someone's library and
 * being renamed would break whatever ordering they had — with the extension
 * preserved and any directory parts stripped, since a zip entry named
 * `../x.jpg` is a path-traversal shape no archiver should be handed.
 */
export function entryName(name: string, taken: Set<string>): string {
  const clean = name.split(/[/\\]/).pop() || "picture";
  if (!taken.has(clean)) {
    taken.add(clean);
    return clean;
  }

  // A duplicate name in a zip is legal and a trap: most tools extract the last
  // one over the first, silently losing a file.
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const extension = dot > 0 ? clean.slice(dot) : "";
  for (let i = 2; ; i += 1) {
    const candidate = `${stem} (${i})${extension}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

/** `pictures-clean-20260902.zip` — dated, so two batches don't collide. */
export function zipName(at: number = Date.now()): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `pictures-clean-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.zip`;
}

/** Bundle every cleaned file into a zip. */
export async function zipCleaned(items: BatchItem[]): Promise<Blob> {
  // Imported here rather than at module scope so the archiver lands in this
  // app's chunk and only downloads when a batch is actually saved (rule #7).
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const taken = new Set<string>();

  for (const item of items) {
    if (!item.output) continue;
    zip.file(entryName(item.name, taken), item.output as unknown as ArrayBuffer);
  }

  // Stored, not deflated: JPEG, PNG and WebP are already compressed, so
  // deflating them costs real time on sixty files and saves almost nothing.
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
