/**
 * A *file* carried by QR codes.
 *
 * `frames.ts` next door moves a string — a backup document, a connection offer.
 * This moves bytes, which is a different problem in three ways, and those three
 * are the whole reason it is a protocol of its own rather than a caller of that
 * one:
 *
 *  1. **No double encoding.** Handing bytes to the text protocol would mean
 *     base64 inside base64 — about 1.8× the original, so nearly twice as many
 *     codes to print or scan. Here the bytes are deflated and base64url'd
 *     exactly once (~1.33×, less when the file compresses).
 *  2. **A file has a name and a type**, and a rebuilt file without them is a
 *     blob nothing will open. Both travel inside the payload, in a small header
 *     ahead of the file's own bytes.
 *  3. **The frames say what is coming.** One letter per frame gives the class of
 *     thing being received — picture, document, audio, video — so a receiver can
 *     say "reading a video, 412 parts" from the very first code it sees, long
 *     before it holds enough to know the name.
 *
 * The frame:
 *
 *     OAF1|<session>|<index>|<total>|<enc>|<hash>|<class>|<chunk>
 *
 * Deliberately a different prefix from `frames.ts`'s `OAH1`, so the two can
 * never be confused: a Handoff scanner shown a file code ignores it as
 * unrecognised rather than half-reading it, and this scanner does the same with
 * a Handoff code (rule #5 — neither app can break the other).
 *
 * Pure and synchronous apart from the compression it borrows from `lib/pack.ts`,
 * so the part that has to be right is testable without a camera or a browser.
 */

import {
  checksum32,
  deflateBytes,
  fromBase64Url,
  inflateBytes,
  toBase64Url,
  type PackEncoding,
} from "@/lib/pack";

export const FILE_FRAME_PREFIX = "OAF1";

/** The kind of thing a file is, as far as this app needs to care. */
export type FileClass = "image" | "document" | "audio" | "video" | "file";

const CLASS_CODE: Record<FileClass, string> = {
  image: "i",
  document: "d",
  audio: "a",
  video: "v",
  file: "f",
};

const CODE_CLASS: Record<string, FileClass> = {
  i: "image",
  d: "document",
  a: "audio",
  v: "video",
  f: "file",
};

export const FILE_CLASS_LABEL: Record<FileClass, string> = {
  image: "Picture",
  document: "Document",
  audio: "Audio",
  video: "Video",
  file: "File",
};

/** Extensions worth recognising when a browser hands over an empty MIME type. */
const DOC_EXTENSIONS =
  /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|md|csv|json|xml|html?|epub|tex|pages)$/i;

/**
 * What class a file falls into — by MIME type first, because that is what the
 * browser actually knows, and by extension only when it hands over nothing (a
 * `.md` file on Windows, most notably).
 */
export function fileClassOf(mime: string, name = ""): FileClass {
  const type = mime.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("text/") || type.startsWith("application/")) {
    // Not every application/* is a document, but every one that isn't is still
    // better described as a document than as an anonymous "file".
    return "document";
  }
  return DOC_EXTENSIONS.test(name) ? "document" : "file";
}

/** What a rebuilt stream turns out to be. */
export interface RebuiltFile {
  name: string;
  mime: string;
  bytes: Uint8Array;
  fileClass: FileClass;
}

/** Chunk sizes offered to the user, densest last. */
export const CHUNK_CHOICES = [420, 640, 900] as const;
export type ChunkSize = (typeof CHUNK_CHOICES)[number];

/**
 * Why three, and why none of them near a QR code's 2 953-byte ceiling: a code
 * packed to capacity is a code a phone struggles to read, especially off a
 * screen that is itself refreshing or a sheet held at arm's length. 420 stays
 * around version 16 and reads from across a table; 900 is roughly version 26 and
 * wants a steady hand or a close-up photo, in exchange for half as many codes.
 */
export const CHUNK_HINT: Record<ChunkSize, string> = {
  420: "Easiest to read — most codes",
  640: "Balanced — the usual choice",
  900: "Fewest codes — needs a steady, close scan",
};

export interface FileFrame {
  session: string;
  index: number;
  total: number;
  enc: PackEncoding;
  hash: string;
  fileClass: FileClass;
  chunk: string;
}

/* ------------------------------ the payload ------------------------------ */

/**
 * The bytes a stream actually carries: a two-byte big-endian header length, a
 * JSON header naming the file, then the file itself.
 *
 * A length prefix rather than a separator because a file's bytes may contain any
 * byte at all, including whatever separator seemed safe.
 */
function wrap(name: string, mime: string, bytes: Uint8Array): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ n: name, m: mime }));
  if (header.length > 0xffff) throw new Error("That file's name is too long to send.");
  const out = new Uint8Array(2 + header.length + bytes.length);
  out[0] = (header.length >> 8) & 0xff;
  out[1] = header.length & 0xff;
  out.set(header, 2);
  out.set(bytes, 2 + header.length);
  return out;
}

function unwrap(payload: Uint8Array): { name: string; mime: string; bytes: Uint8Array } {
  if (payload.length < 2) throw new Error("The transfer was empty.");
  const headerLength = (payload[0] << 8) | payload[1];
  if (headerLength < 2 || 2 + headerLength > payload.length) {
    throw new Error("The transfer's header didn't make sense.");
  }
  const header = JSON.parse(new TextDecoder().decode(payload.subarray(2, 2 + headerLength))) as {
    n?: unknown;
    m?: unknown;
  };
  return {
    name: typeof header.n === "string" && header.n ? header.n : "file",
    mime: typeof header.m === "string" ? header.m : "",
    // `slice`, not `subarray`: the result outlives the assembled payload and is
    // handed to a Blob, and a view keeping the whole buffer alive would hold
    // every byte of the transfer in memory for as long as the file exists.
    bytes: payload.slice(2 + headerLength),
  };
}

/* ------------------------------- encoding -------------------------------- */

/** Six characters of session id — enough to tell two nearby transfers apart. */
export const newFileSession = (): string => Math.random().toString(36).slice(2, 8);

const formatFrame = (f: FileFrame): string =>
  [
    FILE_FRAME_PREFIX,
    f.session,
    f.index,
    f.total,
    f.enc,
    f.hash,
    CLASS_CODE[f.fileClass],
    f.chunk,
  ].join("|");

export interface BuiltFileStream {
  frames: string[];
  /** Bytes actually sent, after compression — usually less than the file. */
  packedBytes: number;
  session: string;
  fileClass: FileClass;
}

/** Turn one file into the codes that carry it. */
export async function buildFileFrames(
  file: { name: string; type: string; bytes: Uint8Array },
  options: { chunkBytes?: number; session?: string } = {},
): Promise<BuiltFileStream> {
  const chunkBytes = options.chunkBytes ?? 640;
  const session = options.session ?? newFileSession();
  const fileClass = fileClassOf(file.type, file.name);

  const { data, enc } = await deflateBytes(wrap(file.name, file.type, file.bytes));
  const encoded = toBase64Url(data);
  const hash = checksum32(encoded);
  const total = Math.max(1, Math.ceil(encoded.length / chunkBytes));

  const frames: string[] = [];
  for (let index = 0; index < total; index++) {
    frames.push(
      formatFrame({
        session,
        index,
        total,
        enc,
        hash,
        fileClass,
        chunk: encoded.slice(index * chunkBytes, (index + 1) * chunkBytes),
      }),
    );
  }
  return { frames, packedBytes: data.length, session, fileClass };
}

/**
 * How many codes a file of this size would need, *at most* — before spending
 * the seconds it takes to compress it.
 *
 * The ceiling, not a guess: it assumes compression achieves nothing, which is
 * exactly what happens with the JPEGs, MP3s and MP4s this app is most often
 * pointed at. A file that does compress simply needs fewer.
 */
export const estimateFrames = (byteLength: number, chunkBytes: number): number =>
  Math.max(1, Math.ceil(Math.ceil(((byteLength + 64) * 4) / 3) / chunkBytes));

/* ------------------------------- decoding -------------------------------- */

/** Parse one scanned line. Returns null for anything that isn't a file frame. */
export function parseFileFrame(text: string): FileFrame | null {
  const parts = text.split("|");
  if (parts.length !== 8 || parts[0] !== FILE_FRAME_PREFIX) return null;
  const [, session, indexRaw, totalRaw, enc, hash, code, chunk] = parts;
  const fileClass = CODE_CLASS[code];
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!session || !fileClass) return null;
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total < 1 || index < 0 || index >= total) return null;
  if (enc !== "z" && enc !== "b") return null;
  if (!/^[0-9a-f]{8}$/.test(hash)) return null;
  return { session, index, total, enc, hash, fileClass, chunk };
}

/** Accumulating state for one incoming file. Plain data, so it is testable. */
export interface FileCollector {
  session: string | null;
  total: number;
  enc: PackEncoding;
  hash: string;
  fileClass: FileClass;
  chunks: Array<string | undefined>;
  received: number;
}

export const newFileCollector = (): FileCollector => ({
  session: null,
  total: 0,
  enc: "b",
  hash: "",
  fileClass: "file",
  chunks: [],
  received: 0,
});

export type FileAcceptResult =
  /** Not one of our frames at all. */
  | { status: "ignored" }
  /** Accepted; still waiting for more. */
  | { status: "progress"; received: number; total: number; fileClass: FileClass }
  /** Every frame is in, the checksum matched and the file unpacked. */
  | { status: "complete"; file: RebuiltFile }
  /** Every frame is in but the result didn't verify, or wouldn't unpack. */
  | { status: "failed"; reason: string };

/**
 * Which parts are still missing, as human numbering (1-based).
 *
 * The thing a stalled scan most needs: with a printed sheet in front of you,
 * "still need 14, 27" is a instruction, where "83 of 85" is only a mood.
 */
export function missingParts(c: FileCollector, limit = 12): number[] {
  const out: number[] = [];
  for (let i = 0; i < c.total && out.length < limit; i++) {
    if (c.chunks[i] === undefined) out.push(i + 1);
  }
  return out;
}

/**
 * Feed a scanned line in.
 *
 * A frame from a *different* session restarts the collector rather than being
 * dropped: pointing the camera at a second file is a deliberate act, and the
 * alternative is a scanner that silently ignores the code being held up to it.
 */
export async function acceptFileFrame(
  c: FileCollector,
  text: string,
): Promise<FileAcceptResult> {
  const frame = parseFileFrame(text);
  if (!frame) return { status: "ignored" };

  if (c.session !== frame.session || c.hash !== frame.hash || c.total !== frame.total) {
    c.session = frame.session;
    c.total = frame.total;
    c.enc = frame.enc;
    c.hash = frame.hash;
    c.fileClass = frame.fileClass;
    c.chunks = new Array<string | undefined>(frame.total);
    c.received = 0;
  }

  if (c.chunks[frame.index] === undefined) {
    c.chunks[frame.index] = frame.chunk;
    c.received += 1;
  }

  if (c.received < c.total) {
    return {
      status: "progress",
      received: c.received,
      total: c.total,
      fileClass: c.fileClass,
    };
  }

  const encoded = c.chunks.join("");
  if (checksum32(encoded) !== c.hash) {
    // Start over rather than sit on a stream that can never verify.
    const total = c.total;
    c.session = null;
    c.chunks = [];
    c.received = 0;
    return {
      status: "failed",
      reason: `The file didn't verify after all ${total} codes — one of them was misread. Scan it again.`,
    };
  }

  try {
    const payload = await inflateBytes(fromBase64Url(encoded), c.enc);
    const { name, mime, bytes } = unwrap(payload);
    return {
      status: "complete",
      file: { name, mime, bytes, fileClass: c.fileClass },
    };
  } catch {
    return { status: "failed", reason: "The file arrived but couldn't be unpacked." };
  }
}

/** Fraction complete, for a progress bar. */
export const fileProgress = (c: FileCollector): number =>
  c.total > 0 ? c.received / c.total : 0;
