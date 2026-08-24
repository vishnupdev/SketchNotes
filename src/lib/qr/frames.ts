/**
 * A data channel made of QR codes.
 *
 * Two devices with a screen and a camera between them can move data with nothing
 * in the middle — no account, no server, no network at all. Handoff carries a
 * backup document over this, and File Drop uses it to swap the connection details
 * for a direct link, so it lives here with the other QR primitives rather than
 * inside either app (rules #4/#5).
 *
 * **The frame.** A payload is compressed, base64url-encoded and cut into chunks
 * small enough to stay readable as a QR code. Each chunk becomes one line:
 *
 *     OAH1|d|<session>|<index>|<total>|<enc>|<hash>|<chunk>
 *
 *  - `d` / `o` / `a` — what this stream carries: **d**ata, a WebRTC **o**ffer or
 *    an **a**nswer. The receiver reacts to what it sees rather than being told
 *    in advance which transport is in use.
 *  - `session` — one sender's stream. Two people showing codes at the same table
 *    cannot contaminate each other's transfer.
 *  - `index`/`total` — frames may be read in any order and any number of times;
 *    the collector only needs each one once.
 *  - `enc` — `z` when the payload was deflated, `b` when it wasn't.
 *  - `hash` — of the *whole* assembled payload, repeated in every frame, so the
 *    result is verified before it is ever written to storage.
 *
 * Pipe-separated because base64url contains no pipes, so parsing needs no
 * escaping and a corrupted frame fails to parse rather than half-parsing.
 *
 * Everything here is pure and synchronous apart from the compression it borrows
 * from `lib/pack.ts`, which is deliberate: this is the part that must be right,
 * and it is testable without a camera, a network or a browser.
 */

import {
  checksum32,
  deflateText,
  fromBase64Url,
  inflateText,
  toBase64Url,
  type PackEncoding,
} from "@/lib/pack";

export const FRAME_PREFIX = "OAH1";

/** What a frame stream carries. */
export type StreamKind = "data" | "offer" | "answer";

const KIND_CODE: Record<StreamKind, string> = { data: "d", offer: "o", answer: "a" };
const CODE_KIND: Record<string, StreamKind> = { d: "data", o: "offer", a: "answer" };

/**
 * Payload bytes per frame.
 *
 * A QR code at level M holds 2331 bytes, but a *dense* code is a code a phone
 * struggles to read across a room, especially from a screen that is itself
 * refreshing. 640 keeps each frame around version 20 — comfortably scannable
 * while still moving ~6 KB a second at the default frame rate.
 */
export const CHUNK_BYTES = 640;

export interface Frame {
  kind: StreamKind;
  session: string;
  index: number;
  total: number;
  enc: PackEncoding;
  hash: string;
  chunk: string;
}

/* ------------------------------ encoding ------------------------------ */

/** Six characters of session id — enough to tell two nearby transfers apart. */
export const newSession = (): string => Math.random().toString(36).slice(2, 8);

const formatFrame = (f: Frame): string =>
  [FRAME_PREFIX, KIND_CODE[f.kind], f.session, f.index, f.total, f.enc, f.hash, f.chunk].join("|");

/**
 * Turn a payload into the frames to show. One frame for a short payload, many
 * for a long one; the caller cycles through them.
 */
export async function buildFrames(
  payload: string,
  kind: StreamKind = "data",
  session: string = newSession(),
): Promise<string[]> {
  const { data, enc } = await deflateText(payload);
  const encoded = toBase64Url(data);
  const hash = checksum32(encoded);
  const total = Math.max(1, Math.ceil(encoded.length / CHUNK_BYTES));
  const frames: string[] = [];
  for (let index = 0; index < total; index++) {
    frames.push(
      formatFrame({
        kind,
        session,
        index,
        total,
        enc,
        hash,
        chunk: encoded.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES),
      }),
    );
  }
  return frames;
}

/* ------------------------------ decoding ------------------------------ */

/** Parse one scanned line. Returns null for anything that isn't our frame. */
export function parseFrame(text: string): Frame | null {
  const parts = text.split("|");
  if (parts.length !== 8 || parts[0] !== FRAME_PREFIX) return null;
  const [, code, session, indexRaw, totalRaw, enc, hash, chunk] = parts;
  const kind = CODE_KIND[code];
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!kind || !session) return null;
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total < 1 || index < 0 || index >= total) return null;
  if (enc !== "z" && enc !== "b") return null;
  if (!/^[0-9a-f]{8}$/.test(hash)) return null;
  return { kind, session, index, total, enc, hash, chunk };
}

/** Accumulating state for one incoming stream. Plain data, so it is testable. */
export interface Collector {
  kind: StreamKind | null;
  session: string | null;
  total: number;
  enc: PackEncoding;
  hash: string;
  chunks: Array<string | undefined>;
  received: number;
}

export const newCollector = (): Collector => ({
  kind: null,
  session: null,
  total: 0,
  enc: "b",
  hash: "",
  chunks: [],
  received: 0,
});

export type AcceptResult =
  /** Not one of our frames at all. */
  | { status: "ignored" }
  /** Accepted; still waiting for more. */
  | { status: "progress"; received: number; total: number }
  /** Every frame is in and the checksum matched. */
  | { status: "complete"; kind: StreamKind; payload: string }
  /** Every frame is in but the payload didn't verify, or couldn't be unpacked. */
  | { status: "failed"; reason: string };

/**
 * Feed a scanned line in.
 *
 * A frame from a *different* session restarts the collector rather than being
 * dropped: aiming the camera at a second sender is a deliberate act, and the
 * alternative is a scanner that silently ignores the code being held up to it.
 */
export async function acceptFrame(c: Collector, text: string): Promise<AcceptResult> {
  const frame = parseFrame(text);
  if (!frame) return { status: "ignored" };

  if (c.session !== frame.session || c.hash !== frame.hash || c.total !== frame.total) {
    c.kind = frame.kind;
    c.session = frame.session;
    c.total = frame.total;
    c.enc = frame.enc;
    c.hash = frame.hash;
    c.chunks = new Array<string | undefined>(frame.total);
    c.received = 0;
  }

  if (c.chunks[frame.index] === undefined) {
    c.chunks[frame.index] = frame.chunk;
    c.received += 1;
  }

  if (c.received < c.total) {
    return { status: "progress", received: c.received, total: c.total };
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
      reason: `The transfer didn't verify after all ${total} parts — scan it again.`,
    };
  }

  try {
    const payload = await inflateText(fromBase64Url(encoded), c.enc);
    return { status: "complete", kind: c.kind ?? "data", payload };
  } catch {
    return { status: "failed", reason: "The transfer arrived but couldn't be unpacked." };
  }
}

/** Fraction complete, for a progress bar. */
export const collectorProgress = (c: Collector): number =>
  c.total > 0 ? c.received / c.total : 0;
