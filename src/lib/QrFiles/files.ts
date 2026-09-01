/**
 * What QR Files will accept, and what it makes of what it is given.
 *
 * The limits here are the honest part of this app. A QR code holds under three
 * kilobytes at its very largest, and a *readable* one holds far less — so a
 * photo is a wall of codes and a video is a book of them. Rather than let
 * someone drop a 40 MB clip and watch the tab freeze, the numbers are worked out
 * and shown before anything is built, and the ceiling is refused with the reason
 * rather than a spinner that never ends.
 */

import { estimateFrames, fileClassOf, type FileClass } from "@/lib/qr/file-frames";
import { formatBytes } from "@/lib/utils";

/**
 * The hard ceiling.
 *
 * 4 MB at the densest setting is already about 6 200 codes — a hundred printed
 * A4 sheets, or half an hour of holding a phone steady. Past that the answer is
 * not a slower progress bar, it is that this is the wrong transport, so the app
 * says so and points at File Drop.
 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Past this, the code count stops being a detail and starts being the plan. */
export const WARN_FRAMES = 200;

/** Codes per printed page, in the grid the sheet lays out. */
export const CODES_PER_SHEET = 12;

/** One file, read and measured, ready to be turned into codes. */
export interface PickedFile {
  name: string;
  mime: string;
  bytes: Uint8Array;
  fileClass: FileClass;
}

/** Read a file the user picked or dropped. Rejects the ones that can't work. */
export async function readPickedFile(file: File): Promise<PickedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${formatBytes(file.size)}. QR codes top out well below that — anything over ${formatBytes(MAX_FILE_BYTES)} would be thousands of codes, so use File Drop for it instead.`,
    );
  }
  if (file.size === 0) throw new Error("That file is empty — there is nothing to encode.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    name: file.name || "file",
    mime: file.type,
    bytes,
    fileClass: fileClassOf(file.type, file.name),
  };
}

/** Frames a second the player defaults to — what the loop estimate assumes. */
const PLAY_RATE = 5;

/** What encoding this file would cost, before spending the time to do it. */
export interface EncodePlan {
  /** Upper bound on the number of codes — compression only ever helps. */
  frames: number;
  /** Pages, if it is printed. */
  sheets: number;
  /** Seconds for one pass of the on-screen loop. */
  loopSeconds: number;
  /** Past the point where the count is the thing worth knowing first. */
  heavy: boolean;
}

export function planFor(byteLength: number, chunkBytes: number): EncodePlan {
  const frames = estimateFrames(byteLength, chunkBytes);
  return {
    frames,
    sheets: Math.ceil(frames / CODES_PER_SHEET),
    loopSeconds: Math.round(frames / PLAY_RATE),
    heavy: frames > WARN_FRAMES,
  };
}

/** A span in the units a person waits in. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** The characters a Windows filesystem refuses outright. */
const FORBIDDEN_IN_NAME = new Set(["<", ">", ":", '"', "|", "?", "*"]);

/** Below this codepoint everything is a control character, none of it a name. */
const FIRST_PRINTABLE = 0x20;

/**
 * A rebuilt file's name, made safe to write to disk.
 *
 * The name came off a printed code, which makes it untrusted input exactly like
 * a downloaded file: path separators, control characters and the ones Windows
 * refuses are stripped, and so are leading dots. A code claiming to be
 * `../../.bashrc` therefore saves as a plainly-named file in the downloads
 * folder and nowhere else.
 */
export function safeFileName(name: string): string {
  let out = "";
  for (const ch of name.replace(/[/\\]/g, "-")) {
    if (FORBIDDEN_IN_NAME.has(ch)) continue;
    if ((ch.codePointAt(0) ?? 0) < FIRST_PRINTABLE) continue;
    out += ch;
  }
  return out.replace(/^[.\s]+/, "").trim().slice(0, 120) || "file";
}
