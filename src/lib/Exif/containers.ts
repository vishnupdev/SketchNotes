/**
 * Walking the three containers a picture on the web actually arrives in, and
 * taking the metadata back out of them **without re-encoding the image**.
 *
 * That is the whole reason this file exists rather than a two-line
 * canvas round-trip. Drawing a photo to a canvas and calling `toBlob` does
 * remove the metadata — along with a generation of JPEG quality, the colour
 * profile, and any resolution above the canvas's. What happens here instead is
 * a *segment* edit: the file is walked, the metadata segments are dropped, and
 * every remaining byte — the compressed image data above all — is copied
 * through untouched. The result is pixel-for-pixel the original picture.
 *
 * The three formats keep metadata in three different places:
 *
 *  - **JPEG** — APPn marker segments before the scan. EXIF is APP1, XMP is a
 *    second APP1, IPTC is APP13, and a comment is COM.
 *  - **PNG** — `tEXt` / `zTXt` / `iTXt` chunks, plus an `eXIf` chunk that holds
 *    a whole TIFF block, and `tIME`.
 *  - **WebP** — `EXIF` and `XMP ` chunks in the RIFF container, with bits in
 *    the `VP8X` header claiming they are there.
 *
 * Every walker is bounds-checked and stops at the first thing it cannot read,
 * returning what it has. These bytes came from a file chooser: malformed,
 * truncated and not-actually-an-image are all ordinary inputs.
 */

import { parseTiff, type ExifTag } from "./tiff";

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "unknown";

/** One metadata block found in a file — what it is and how big. */
export interface MetaBlock {
  /** How the file names it: "APP1", "tEXt", "EXIF". */
  marker: string;
  /** What it holds, in words: "EXIF", "XMP", "Colour profile". */
  kind: string;
  bytes: number;
  /** True if stripping removes this one. */
  removable: boolean;
}

/** A free-text record, which is where a name or a copyright line usually is. */
export interface TextRecord {
  key: string;
  value: string;
}

export interface ImageMeta {
  format: ImageFormat;
  bytes: number;
  /** Pixel dimensions read from the file's own header, not from EXIF. */
  width: number;
  height: number;
  tags: ExifTag[];
  blocks: MetaBlock[];
  text: TextRecord[];
  warnings: string[];
}

const ascii = (bytes: Uint8Array, at: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(at, at + length));

/** Identify by the file's own signature, never by its name. */
export function detectFormat(bytes: Uint8Array): ImageFormat {
  if (bytes.length < 12) return "unknown";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (ascii(bytes, 1, 3) === "PNG" && bytes[0] === 0x89) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 0, 3) === "GIF") return "gif";
  return "unknown";
}

/* ------------------------------- JPEG ----------------------------------- */

/** Markers that stand alone — no length field follows them. */
const STANDALONE = new Set([0xd8, 0xd9, 0x01]);

/**
 * The APPn segments a strip removes.
 *
 * APP0 (JFIF), APP2 (ICC colour profile) and APP14 (Adobe's colour transform
 * flag) are **kept**: they are not metadata about you, they are instructions
 * for decoding the picture correctly, and dropping the ICC profile visibly
 * shifts the colours of a wide-gamut photo.
 */
const JPEG_KEEP = new Set([0xe0, 0xe2, 0xee]);

interface JpegSegment {
  marker: number;
  /** Offset of the 0xFF that opens the segment. */
  start: number;
  /** Total length including marker and length field. */
  length: number;
  payload: Uint8Array;
}

/** Walk the marker segments up to the start of the scan. */
export function jpegSegments(bytes: Uint8Array): { segments: JpegSegment[]; scanAt: number } {
  const segments: JpegSegment[] = [];
  let at = 2; // past SOI

  while (at + 3 < bytes.length) {
    if (bytes[at] !== 0xff) {
      // Fill bytes are legal between segments; anything else means the file is
      // not where it claims to be, and guessing on would produce nonsense.
      at += 1;
      continue;
    }

    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (STANDALONE.has(marker)) {
      at += 2;
      continue;
    }
    // Start of scan: the entropy-coded image data begins after this segment
    // and runs to the end of the file.
    if (marker === 0xda) return { segments, scanAt: at };

    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    if (length < 2 || at + 2 + length > bytes.length) break;

    segments.push({
      marker,
      start: at,
      length: length + 2,
      payload: bytes.subarray(at + 4, at + 2 + length),
    });
    at += 2 + length;
  }

  return { segments, scanAt: at };
}

const jpegKind = (segment: JpegSegment): string => {
  const head = ascii(segment.payload, 0, 6);
  if (segment.marker === 0xe1 && head.startsWith("Exif")) return "EXIF";
  if (segment.marker === 0xe1 && head.startsWith("http")) return "XMP";
  if (segment.marker === 0xe0) return "JFIF header";
  if (segment.marker === 0xe2) return "Colour profile (ICC)";
  if (segment.marker === 0xed) return "IPTC / Photoshop";
  if (segment.marker === 0xee) return "Adobe colour transform";
  if (segment.marker === 0xfe) return "Comment";
  if (segment.marker >= 0xe0 && segment.marker <= 0xef) return "Application data";
  return "Image structure";
};

const jpegMarkerName = (marker: number): string =>
  marker >= 0xe0 && marker <= 0xef
    ? `APP${marker - 0xe0}`
    : marker === 0xfe
      ? "COM"
      : `0x${marker.toString(16).toUpperCase()}`;

/** Dimensions from the SOF segment — the file's own truth, not EXIF's claim. */
function jpegSize(segments: JpegSegment[]): { width: number; height: number } {
  const sof = segments.find(
    (segment) =>
      segment.marker >= 0xc0 &&
      segment.marker <= 0xcf &&
      segment.marker !== 0xc4 &&
      segment.marker !== 0xc8 &&
      segment.marker !== 0xcc,
  );
  if (!sof || sof.payload.length < 5) return { width: 0, height: 0 };
  return {
    height: (sof.payload[1] << 8) | sof.payload[2],
    width: (sof.payload[3] << 8) | sof.payload[4],
  };
}

/* -------------------------------- PNG ----------------------------------- */

interface PngChunk {
  type: string;
  start: number;
  /** Total length including the length, type and CRC fields. */
  length: number;
  payload: Uint8Array;
}

/** Chunks a strip removes: everything that is text, time or EXIF. */
const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME", "dSIG"]);

export function pngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let at = 8; // past the signature

  while (at + 8 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint32(at);
    const type = ascii(bytes, at + 4, 4);
    if (length > bytes.length || at + 12 + length > bytes.length) break;

    chunks.push({
      type,
      start: at,
      length: length + 12,
      payload: bytes.subarray(at + 8, at + 8 + length),
    });

    at += 12 + length;
    if (type === "IEND") break;
  }

  return chunks;
}

const PNG_KINDS: Record<string, string> = {
  IHDR: "Image header",
  IDAT: "Image data",
  IEND: "End",
  PLTE: "Palette",
  tRNS: "Transparency",
  iCCP: "Colour profile (ICC)",
  gAMA: "Gamma",
  cHRM: "Chromaticity",
  sRGB: "sRGB intent",
  pHYs: "Pixel size",
  tEXt: "Text",
  zTXt: "Text (compressed)",
  iTXt: "Text (international)",
  eXIf: "EXIF",
  tIME: "Last modified",
  acTL: "Animation control",
  fcTL: "Frame control",
  fdAT: "Frame data",
};

/** Read the readable text chunks. */
function pngText(chunks: PngChunk[]): { text: TextRecord[]; warnings: string[] } {
  const text: TextRecord[] = [];
  const warnings: string[] = [];

  for (const chunk of chunks) {
    if (chunk.type === "tEXt") {
      const nul = chunk.payload.indexOf(0);
      if (nul > 0) {
        text.push({
          key: ascii(chunk.payload, 0, nul),
          value: new TextDecoder("latin1").decode(chunk.payload.subarray(nul + 1)),
        });
      }
    } else if (chunk.type === "iTXt") {
      // key \0 compressed? method \0 language \0 translated-key \0 text
      const parts: number[] = [];
      for (let i = 0; i < chunk.payload.length && parts.length < 4; i += 1) {
        if (chunk.payload[i] === 0) parts.push(i);
      }
      if (parts.length >= 1) {
        const compressed = chunk.payload[parts[0] + 1] === 1;
        const body = parts.length >= 4 ? chunk.payload.subarray(parts[3] + 1) : new Uint8Array();
        text.push({
          key: ascii(chunk.payload, 0, parts[0]),
          value: compressed
            ? `${body.length.toLocaleString()} bytes, compressed`
            : new TextDecoder().decode(body),
        });
      }
    } else if (chunk.type === "zTXt") {
      const nul = chunk.payload.indexOf(0);
      // Deflated. Reporting its presence and size is honest; inflating it would
      // mean an async read for a field that is almost always a generator's name.
      if (nul > 0) {
        text.push({
          key: ascii(chunk.payload, 0, nul),
          value: `${(chunk.payload.length - nul - 2).toLocaleString()} bytes, compressed`,
        });
      }
      warnings.push("A compressed text chunk was found; its size is shown but not its contents.");
    }
  }

  return { text, warnings };
}

/* -------------------------------- WebP ---------------------------------- */

interface RiffChunk {
  type: string;
  start: number;
  /** Total length including the header and any pad byte. */
  length: number;
  payload: Uint8Array;
}

const WEBP_DROP = new Set(["EXIF", "XMP "]);

export function riffChunks(bytes: Uint8Array): RiffChunk[] {
  const chunks: RiffChunk[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12; // past "RIFF" + size + "WEBP"

  while (at + 8 <= bytes.length) {
    const type = ascii(bytes, at, 4);
    const size = view.getUint32(at + 4, true);
    if (at + 8 + size > bytes.length) break;
    // RIFF pads every odd-sized chunk to an even boundary.
    const padded = size + (size % 2);

    chunks.push({ type, start: at, length: 8 + padded, payload: bytes.subarray(at + 8, at + 8 + size) });
    at += 8 + padded;
  }

  return chunks;
}

const WEBP_KINDS: Record<string, string> = {
  VP8: "Image data",
  "VP8 ": "Image data",
  VP8L: "Image data (lossless)",
  VP8X: "Extended header",
  ALPH: "Alpha",
  ANIM: "Animation",
  ANMF: "Animation frame",
  ICCP: "Colour profile (ICC)",
  EXIF: "EXIF",
  "XMP ": "XMP",
};

function webpSize(chunks: RiffChunk[]): { width: number; height: number } {
  const extended = chunks.find((chunk) => chunk.type === "VP8X");
  if (extended && extended.payload.length >= 10) {
    const p = extended.payload;
    // Canvas size is stored minus one, 24-bit little-endian.
    return {
      width: ((p[4] | (p[5] << 8) | (p[6] << 16)) & 0xffffff) + 1,
      height: ((p[7] | (p[8] << 8) | (p[9] << 16)) & 0xffffff) + 1,
    };
  }

  const lossy = chunks.find((chunk) => chunk.type === "VP8 " || chunk.type === "VP8");
  if (lossy && lossy.payload.length >= 10) {
    const p = lossy.payload;
    return { width: ((p[7] << 8) | p[6]) & 0x3fff, height: ((p[9] << 8) | p[8]) & 0x3fff };
  }

  const lossless = chunks.find((chunk) => chunk.type === "VP8L");
  if (lossless && lossless.payload.length >= 5) {
    const p = lossless.payload;
    const bits = p[1] | (p[2] << 8) | (p[3] << 16) | (p[4] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  return { width: 0, height: 0 };
}

/* ------------------------------- reading -------------------------------- */

/** The EXIF payload inside a JPEG APP1 segment, past the "Exif\0\0" header. */
const exifFromApp1 = (payload: Uint8Array): Uint8Array | null =>
  ascii(payload, 0, 4) === "Exif" ? payload.subarray(6) : null;

/**
 * Read everything a file will say about itself.
 *
 * Never throws: an unreadable file comes back as `format: "unknown"` with a
 * warning, which is a result the UI can show.
 */
export function readMeta(bytes: Uint8Array): ImageMeta {
  const format = detectFormat(bytes);
  const meta: ImageMeta = {
    format,
    bytes: bytes.length,
    width: 0,
    height: 0,
    tags: [],
    blocks: [],
    text: [],
    warnings: [],
  };

  try {
    if (format === "jpeg") {
      const { segments } = jpegSegments(bytes);
      Object.assign(meta, jpegSize(segments));

      for (const segment of segments) {
        const kind = jpegKind(segment);
        if (kind === "Image structure") continue;
        meta.blocks.push({
          marker: jpegMarkerName(segment.marker),
          kind,
          bytes: segment.length,
          removable: !JPEG_KEEP.has(segment.marker),
        });

        if (kind === "EXIF") {
          const tiff = exifFromApp1(segment.payload);
          if (tiff) meta.tags.push(...parseTiff(tiff));
        }
        if (kind === "Comment") {
          meta.text.push({ key: "Comment", value: new TextDecoder().decode(segment.payload).trim() });
        }
      }
    } else if (format === "png") {
      const chunks = pngChunks(bytes);
      const header = chunks.find((chunk) => chunk.type === "IHDR");
      if (header && header.payload.length >= 8) {
        const view = new DataView(header.payload.buffer, header.payload.byteOffset, 8);
        meta.width = view.getUint32(0);
        meta.height = view.getUint32(4);
      }

      for (const chunk of chunks) {
        // Image data is listed once rather than per-chunk: a large PNG has
        // hundreds of IDATs and they are not metadata.
        if (chunk.type === "IDAT" && meta.blocks.some((block) => block.marker === "IDAT")) continue;
        meta.blocks.push({
          marker: chunk.type,
          kind: PNG_KINDS[chunk.type] ?? "Other",
          bytes: chunk.length,
          removable: PNG_DROP.has(chunk.type),
        });
        if (chunk.type === "eXIf") meta.tags.push(...parseTiff(chunk.payload));
      }

      const read = pngText(chunks);
      meta.text.push(...read.text);
      meta.warnings.push(...read.warnings);
    } else if (format === "webp") {
      const chunks = riffChunks(bytes);
      Object.assign(meta, webpSize(chunks));

      for (const chunk of chunks) {
        meta.blocks.push({
          marker: chunk.type.trim() || chunk.type,
          kind: WEBP_KINDS[chunk.type] ?? "Other",
          bytes: chunk.length,
          removable: WEBP_DROP.has(chunk.type),
        });
        if (chunk.type === "EXIF") meta.tags.push(...parseTiff(chunk.payload));
      }
    } else if (format === "gif") {
      meta.width = bytes[6] | (bytes[7] << 8);
      meta.height = bytes[8] | (bytes[9] << 8);
      meta.warnings.push("GIF carries no EXIF; it can hold comment blocks, which are not edited here.");
    } else {
      meta.warnings.push("That file is not a JPEG, PNG, WebP or GIF, so there is nothing to read.");
    }
  } catch {
    // A malformed file is an ordinary input from a file chooser, not a bug.
    meta.warnings.push("The file could not be read past a certain point; what was found is shown.");
  }

  return meta;
}

/* ------------------------------- stripping ------------------------------ */

export interface StripResult {
  bytes: Uint8Array;
  /** What was taken out, for the report. */
  removed: MetaBlock[];
  /** True when the image data was copied through untouched. */
  lossless: boolean;
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/**
 * Remove every removable metadata block, copying the image data byte for byte.
 *
 * Returns the original bytes unchanged when there was nothing to remove, so
 * "clean it" on an already-clean file is a no-op rather than a re-write.
 */
export function stripMeta(bytes: Uint8Array): StripResult {
  const format = detectFormat(bytes);

  if (format === "jpeg") {
    const { segments, scanAt } = jpegSegments(bytes);
    const removed: MetaBlock[] = [];
    const parts: Uint8Array[] = [bytes.subarray(0, 2)];

    for (const segment of segments) {
      const drop = !JPEG_KEEP.has(segment.marker) && jpegKind(segment) !== "Image structure";
      if (drop) {
        removed.push({
          marker: jpegMarkerName(segment.marker),
          kind: jpegKind(segment),
          bytes: segment.length,
          removable: true,
        });
      } else {
        parts.push(bytes.subarray(segment.start, segment.start + segment.length));
      }
    }

    // Everything from the scan header on — the compressed picture — verbatim.
    parts.push(bytes.subarray(scanAt));
    return { bytes: removed.length ? concat(parts) : bytes, removed, lossless: true };
  }

  if (format === "png") {
    const chunks = pngChunks(bytes);
    const removed: MetaBlock[] = [];
    const parts: Uint8Array[] = [bytes.subarray(0, 8)];

    for (const chunk of chunks) {
      if (PNG_DROP.has(chunk.type)) {
        removed.push({
          marker: chunk.type,
          kind: PNG_KINDS[chunk.type] ?? "Other",
          bytes: chunk.length,
          removable: true,
        });
        continue;
      }
      parts.push(bytes.subarray(chunk.start, chunk.start + chunk.length));
    }

    return { bytes: removed.length ? concat(parts) : bytes, removed, lossless: true };
  }

  if (format === "webp") {
    const chunks = riffChunks(bytes);
    const removed: MetaBlock[] = [];
    const kept: Uint8Array[] = [];

    for (const chunk of chunks) {
      if (WEBP_DROP.has(chunk.type)) {
        removed.push({
          marker: chunk.type.trim(),
          kind: WEBP_KINDS[chunk.type] ?? "Other",
          bytes: chunk.length,
          removable: true,
        });
        continue;
      }

      const slice = bytes.slice(chunk.start, chunk.start + chunk.length);
      // VP8X advertises which optional chunks exist. Left set, the flags claim
      // an EXIF chunk that is no longer there — a technically invalid file that
      // some decoders reject.
      if (chunk.type === "VP8X" && slice.length > 8) slice[8] &= ~0x0c;
      kept.push(slice);
    }

    if (removed.length === 0) return { bytes, removed, lossless: true };

    const body = concat(kept);
    const out = new Uint8Array(12 + body.length);
    out.set(bytes.subarray(0, 12));
    out.set(body, 12);
    // The RIFF size counts everything after the size field itself.
    new DataView(out.buffer).setUint32(4, out.length - 8, true);

    return { bytes: out, removed, lossless: true };
  }

  return { bytes, removed: [], lossless: true };
}
