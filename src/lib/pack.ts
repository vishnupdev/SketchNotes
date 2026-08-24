/**
 * Packing bytes into text, and checking that they arrived intact.
 *
 * Shell-level and generic (rules #4/#5): three features need the same handful of
 * primitives and none of them owns these — the QR frame protocol (`lib/qr/frames.ts`)
 * packs a payload into scannable text, the connection codes (`lib/rtc/`) pack an
 * SDP into something you can paste into a chat, and File Drop checks each
 * received file against a checksum.
 *
 * Everything here is pure apart from the two compression helpers, which need the
 * platform's streams — and both degrade to "no compression" rather than failing,
 * because a transfer that works uncompressed beats one that doesn't happen.
 */

/* ------------------------------- base64url ---------------------------- */

/** base64url, unpadded — survives being pasted into a URL, a chat or a QR code. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // Chunked, because `String.fromCharCode(...bytes)` blows the argument limit on
  // anything larger than a few hundred kilobytes.
  const STEP = 0x8000;
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode(...bytes.subarray(i, i + STEP));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/* ------------------------------ compression --------------------------- */

/** How a payload was packed: deflated, or left as-is. */
export type PackEncoding = "z" | "b";

/**
 * Compress text with the platform's deflate, where it has one.
 *
 * Returns the plain bytes when compression is unavailable *or* when it made
 * things bigger, which short payloads reliably do — hence the encoding tag
 * travelling with the data rather than being assumed.
 */
export async function deflateText(text: string): Promise<{ data: Uint8Array; enc: PackEncoding }> {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") return { data: bytes, enc: "b" };
  try {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new CompressionStream("deflate-raw"));
    const packed = new Uint8Array(await new Response(stream).arrayBuffer());
    return packed.length < bytes.length ? { data: packed, enc: "z" } : { data: bytes, enc: "b" };
  } catch {
    return { data: bytes, enc: "b" };
  }
}

export async function inflateText(data: Uint8Array, enc: PackEncoding): Promise<string> {
  if (enc === "b") return new TextDecoder().decode(data);
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser can't unpack that.");
  }
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/* ------------------------------- checksums ---------------------------- */

/**
 * FNV-1a over text, as 8 hex characters.
 *
 * A checksum, not a signature: it catches a payload assembled in the wrong order
 * or a mis-scanned frame, which is what actually goes wrong over these channels.
 * It is not protection against a forged stream, and nothing here treats it as
 * such.
 */
export function checksum32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Standard CRC-32 table (IEEE 802.3 polynomial), built once on first use. */
let crcTable: Uint32Array | null = null;
function table(): Uint32Array {
  if (crcTable) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}

/**
 * CRC-32 over binary data, resumable across chunks.
 *
 * Pass the previous return value as `seed` to keep hashing a stream — which is
 * the point: a multi-gigabyte file is verified as it flies past, without ever
 * being held in memory to hash at the end.
 */
export function crc32(bytes: Uint8Array, seed = 0): number {
  const t = table();
  let crc = (seed ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    crc = (t[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** CRC-32 as the 8 hex characters that travel with a transfer. */
export const crcHex = (crc: number): string => (crc >>> 0).toString(16).padStart(8, "0");
