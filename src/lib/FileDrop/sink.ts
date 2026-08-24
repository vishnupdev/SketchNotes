import { saveBlob } from "@/lib/download";
import { crc32 } from "@/lib/pack";
import { openDownloadStream, streamDownloadReady } from "./stream-download";
import type { FileMeta } from "./types";

/**
 * Where received bytes go.
 *
 * This is the difference between an app that can move a 40 GB disk image and one
 * that falls over at a gigabyte. Three sinks, best first:
 *
 *  - **Disk** (`showDirectoryPicker`) — the user picks a folder once and each file
 *    is streamed into it. Memory stays flat at any size, an interrupted transfer
 *    leaves a partial file that can be *resumed*, and the writable stream gives
 *    real backpressure. Chromium only.
 *  - **Stream** — a download that is written straight to disk as it arrives, by
 *    handing a `ReadableStream` to the service worker and letting the browser
 *    download from it (see `./stream-download.ts`). No folder picker needed, so
 *    this is the path that makes very large files work on Firefox and Safari.
 *  - **Download** — the last resort, where neither of the above exists: chunks are
 *    held as `Blob` parts and handed over at the end. Browsers spill blob data to
 *    disk, but not without limit, so this is the one sink with a real size
 *    ceiling. It is only chosen when nothing better is available, and the UI says
 *    so *before* a transfer starts rather than after it fails.
 *
 * Every sink reports which it is, because "can this actually take a 4 GB file?"
 * is a question the user needs answered up front.
 */

export type SinkKind = "disk" | "stream" | "download";

export interface FileWriter {
  /** Resolves when the chunk has been taken — which is the backpressure signal. */
  write: (chunk: ArrayBuffer) => Promise<void>;
  close: () => Promise<void>;
  /**
   * Stop, but leave what has been written where a later attempt can continue
   * from it. For an interrupted transfer — the partial file is the whole point of
   * being able to resume.
   */
  keep: () => Promise<void>;
  /**
   * Stop and throw the partial output away. For a file that arrived complete but
   * failed its checksum: a corrupt file of the right length and name is worse
   * than no file, because nothing afterwards would know to distrust it.
   */
  abort: () => Promise<void>;
}

/** What an interrupted attempt left behind, ready to continue from. */
export interface Partial {
  bytes: number;
  /** CRC-32 of those bytes, so the resumed file still verifies as a whole. */
  crc: number;
}

export interface Sink {
  kind: SinkKind;
  /** Human description of where files are going. */
  label: string;
  /** Whether a partly-received file can be continued rather than restarted. */
  resumable: boolean;
  /** What is already on disk for this file, if anything. Disk sink only. */
  existing?: (meta: FileMeta, onScan?: (bytes: number) => void) => Promise<Partial | null>;
  /** Open a writer, optionally continuing at `resumeFrom` bytes in. */
  open: (meta: FileMeta, resumeFrom?: number) => Promise<FileWriter>;
}

/** Whether this browser can stream straight into a folder the user picks. */
export function canSaveToFolder(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.showDirectoryPicker !== "function") return false;
  try {
    return window.self === window.top;
  } catch {
    return false; // cross-origin frame: the access itself throws
  }
}

/**
 * Ask for a folder to receive into. Resolves to null when the user cancels or
 * the browser has no picker — the caller then falls back down the chain.
 */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!canSaveToFolder() || !window.showDirectoryPicker) return null;
  try {
    return await window.showDirectoryPicker({ mode: "readwrite", id: "oneapp-filedrop" });
  } catch {
    return null; // cancelled, or refused
  }
}

/* --------------------------------- disk -------------------------------- */

/** Bytes per read when hashing a partial file back. */
const SCAN_CHUNK = 4 * 1024 * 1024;

/** A sink that streams each file into the chosen folder, and can resume. */
export function folderSink(dir: FileSystemDirectoryHandle): Sink {
  return {
    kind: "disk",
    label: `saving into “${dir.name}”`,
    resumable: true,

    existing: async (meta, onScan) => {
      let file: File;
      try {
        const handle = await dir.getFileHandle(safeName(meta.name));
        file = await handle.getFile();
      } catch {
        return null; // nothing there, which is the normal case
      }
      // Only a *shorter* file is a resume candidate. Same size means it is
      // already done, longer means it is a different file with the same name.
      if (file.size === 0 || file.size >= meta.size) return null;

      /*
       * Hash what is already there. A resumed file still has to verify as a
       * whole, so the CRC has to be seeded with the prefix — and reading a few
       * gigabytes back off disk takes seconds, against minutes to re-transfer
       * them.
       */
      let crc = 0;
      for (let at = 0; at < file.size; at += SCAN_CHUNK) {
        const slice = await file.slice(at, at + SCAN_CHUNK).arrayBuffer();
        crc = crc32(new Uint8Array(slice), crc);
        onScan?.(Math.min(at + SCAN_CHUNK, file.size));
      }
      return { bytes: file.size, crc };
    },

    open: async (meta, resumeFrom = 0) => {
      const name = safeName(meta.name);
      const handle = await dir.getFileHandle(name, { create: true });
      // `keepExistingData` is what makes resuming possible: without it the file
      // is truncated the moment the stream opens.
      const stream = await handle.createWritable({ keepExistingData: resumeFrom > 0 });
      if (resumeFrom > 0) await stream.seek(resumeFrom);
      return {
        write: (chunk) => stream.write(chunk),
        close: () => stream.close(),
        keep: async () => {
          try {
            // Closing rather than aborting is what leaves the bytes on disk for
            // a resume; the stream's own `abort()` would discard them.
            await stream.close();
          } catch {
            /* already closed */
          }
        },
        abort: async () => {
          try {
            await stream.abort();
          } catch {
            /* already closed */
          }
          try {
            await dir.removeEntry(name);
          } catch {
            /* the browser may refuse removal; nothing better to do */
          }
        },
      };
    },
  };
}

/* -------------------------------- stream ------------------------------- */

/** Whether a streaming download (via the service worker) is available. */
export const canStreamDownload = streamDownloadReady;

/**
 * A sink that streams each file into the browser's downloads as it arrives.
 *
 * No folder picker involved, and no size ceiling: the bytes go from the data
 * channel to the download with nothing holding the whole file. The writer's
 * `ready` promise is the browser's own backpressure, so a slow disk throttles the
 * transfer instead of filling memory.
 */
export function streamSink(): Sink {
  return {
    kind: "stream",
    label: "streaming to your downloads",
    resumable: false,
    open: async (meta) => {
      const download = await openDownloadStream(safeName(meta.name), meta.size, meta.type);
      return {
        write: async (chunk) => {
          await download.writer.ready;
          await download.writer.write(new Uint8Array(chunk));
        },
        close: async () => {
          await download.writer.close();
        },
        // A download in progress cannot be appended to later, so there is
        // nothing a partial one could be resumed from: both paths end it.
        keep: async () => {
          await download.writer.abort().catch(() => {});
        },
        abort: async () => {
          await download.writer.abort().catch(() => {});
        },
      };
    },
  };
}

/* ------------------------------- download ------------------------------ */

/**
 * Roughly where the blob-collecting fallback stops being safe. Browsers spill
 * blob parts to disk, but the accounting is not generous and a device with 4 GB
 * of RAM will not survive a 3 GB file this way.
 */
export const BLOB_SINK_LIMIT = 512 * 1024 * 1024;

/** The last-resort sink: collect the file, then hand it over. */
export function downloadSink(): Sink {
  return {
    kind: "download",
    label: "collecting, then saving to your downloads",
    resumable: false,
    open: async (meta) => {
      // Blob parts rather than one growing buffer: the browser is free to spill
      // these to disk, and concatenating ArrayBuffers would double peak memory.
      let parts: BlobPart[] | null = [];
      return {
        write: async (chunk) => {
          parts?.push(chunk);
        },
        close: async () => {
          if (!parts) return;
          const blob = new Blob(parts, { type: meta.type || "application/octet-stream" });
          parts = null;
          saveBlob(blob, safeName(meta.name));
        },
        keep: async () => {
          parts = null; // nothing is on disk yet, so there is nothing to keep
        },
        abort: async () => {
          parts = null; // drop everything; nothing was written anywhere
        },
      };
    },
  };
}

/**
 * Pick the best sink this browser can offer.
 *
 * `folder` is a directory the user has already chosen, when they chose one. The
 * order is deliberate: a folder is best (resumable, no ceiling), a streaming
 * download is next (no ceiling), and collecting into a blob is only ever the
 * fallback of last resort.
 */
export async function chooseSink(folder: FileSystemDirectoryHandle | null): Promise<Sink> {
  if (folder) return folderSink(folder);
  if (await canStreamDownload()) return streamSink();
  return downloadSink();
}

/**
 * A file name safe to write to disk.
 *
 * The name arrives from another device, so it is untrusted: path separators and
 * `..` could otherwise write outside the chosen folder, and the reserved Windows
 * device names cannot be created at all. Everything is flattened to a single
 * plain name.
 */
export function safeName(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  // Control characters, the Windows-reserved punctuation, and any separator that
  // somehow survived the split above.
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[ -<>:"|?*/\\]/g, "_").replace(/^\.+/, "").trim();
  const name = cleaned || "received-file";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) return `_${name}`;
  // Long names are rejected outright by some filesystems.
  return name.length > 180 ? name.slice(0, 120) + name.slice(-40) : name;
}
