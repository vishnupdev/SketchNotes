/**
 * The EXIF block itself — a TIFF file, embedded in a picture.
 *
 * Everything a camera records lives in a little TIFF: a byte-order mark, an
 * offset to the first image file directory (IFD), and directories of tagged
 * entries, some of which are offsets to *further* directories — the Exif
 * sub-IFD and the GPS sub-IFD. Values longer than four bytes are stored
 * elsewhere in the block and referenced by offset, which is where a naive
 * reader goes wrong: every offset is relative to the start of the TIFF header,
 * not to the file or to the entry.
 *
 * Written defensively throughout. This parses a byte array that came from
 * somewhere else, and a truncated or malformed block is common — a partial
 * download, a re-encoder that got it wrong, or a file that was never a picture.
 * So every read is bounds-checked and a bad directory yields the tags found so
 * far rather than an exception; a metadata viewer that crashes on the one file
 * you were curious about is useless.
 */

/** One decoded tag. */
export interface ExifTag {
  /** Numeric tag id, kept so an unnamed tag can still be shown. */
  id: number;
  /** Human name, or `Tag 0x…` when it isn't one this knows. */
  name: string;
  /** Which directory it came from. */
  group: ExifGroup;
  /** The value, formatted for reading. */
  value: string;
  /** The raw value, for the readings that need arithmetic (GPS, orientation). */
  raw: number | number[] | string;
}

export type ExifGroup = "Image" | "Camera" | "Photo" | "GPS" | "Thumbnail";

/** TIFF field types, and how many bytes one component of each takes. */
const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

/** IFD0 / IFD1 — the picture itself and its maker. */
const IMAGE_TAGS: Record<number, string> = {
  0x0100: "Image width",
  0x0101: "Image height",
  0x0102: "Bits per sample",
  0x0106: "Photometric interpretation",
  0x010e: "Description",
  0x010f: "Camera maker",
  0x0110: "Camera model",
  0x0112: "Orientation",
  0x011a: "X resolution",
  0x011b: "Y resolution",
  0x0128: "Resolution unit",
  0x0131: "Software",
  0x0132: "File changed",
  0x013b: "Artist",
  0x0213: "YCbCr positioning",
  0x8298: "Copyright",
  0x9c9b: "Title",
  0x9c9c: "Comment",
  0x9c9d: "Author",
  0x9c9e: "Keywords",
  0x9c9f: "Subject",
};

/** The Exif sub-IFD — how the exposure was made. */
const PHOTO_TAGS: Record<number, string> = {
  0x829a: "Exposure time",
  0x829d: "F number",
  0x8822: "Exposure program",
  0x8827: "ISO",
  0x9000: "Exif version",
  0x9003: "Taken",
  0x9004: "Digitised",
  0x9010: "Time zone",
  0x9011: "Time zone (original)",
  0x9201: "Shutter speed",
  0x9202: "Aperture",
  0x9204: "Exposure bias",
  0x9205: "Max aperture",
  0x9206: "Subject distance",
  0x9207: "Metering mode",
  0x9208: "Light source",
  0x9209: "Flash",
  0x920a: "Focal length",
  0x927c: "Maker note",
  0x9286: "User comment",
  0xa000: "Flashpix version",
  0xa001: "Colour space",
  0xa002: "Stored width",
  0xa003: "Stored height",
  0xa402: "Exposure mode",
  0xa403: "White balance",
  0xa404: "Digital zoom",
  0xa405: "Focal length (35mm)",
  0xa406: "Scene type",
  0xa408: "Contrast",
  0xa409: "Saturation",
  0xa40a: "Sharpness",
  0xa432: "Lens",
  0xa433: "Lens maker",
  0xa434: "Lens model",
  0xa435: "Lens serial",
  0xa420: "Image id",
  0xc4a5: "Print image matching",
};

/** The GPS sub-IFD — where the picture was taken. */
const GPS_TAGS: Record<number, string> = {
  0x0000: "GPS version",
  0x0001: "Latitude reference",
  0x0002: "Latitude",
  0x0003: "Longitude reference",
  0x0004: "Longitude",
  0x0005: "Altitude reference",
  0x0006: "Altitude",
  0x0007: "GPS time",
  0x0008: "Satellites",
  0x0009: "GPS status",
  0x000a: "Measure mode",
  0x000c: "Speed unit",
  0x000d: "Speed",
  0x0010: "Image direction reference",
  0x0011: "Image direction",
  0x001d: "GPS date",
};

/** Sub-IFD pointers, and the group their contents belong to. */
const EXIF_IFD_POINTER = 0x8769;
const GPS_IFD_POINTER = 0x8825;

/** Values printed as a word rather than a number. */
const ENUMS: Record<string, Record<number, string>> = {
  Orientation: {
    1: "Normal",
    2: "Mirrored",
    3: "Rotated 180°",
    4: "Mirrored, rotated 180°",
    5: "Mirrored, rotated 90° CCW",
    6: "Rotated 90° CW",
    7: "Mirrored, rotated 90° CW",
    8: "Rotated 90° CCW",
  },
  "Resolution unit": { 1: "None", 2: "Inches", 3: "Centimetres" },
  "Exposure program": {
    0: "Not defined",
    1: "Manual",
    2: "Program",
    3: "Aperture priority",
    4: "Shutter priority",
    5: "Creative",
    6: "Action",
    7: "Portrait",
    8: "Landscape",
  },
  "Metering mode": {
    0: "Unknown",
    1: "Average",
    2: "Centre-weighted",
    3: "Spot",
    4: "Multi-spot",
    5: "Pattern",
    6: "Partial",
  },
  "Colour space": { 1: "sRGB", 2: "Adobe RGB", 0xffff: "Uncalibrated" },
  "White balance": { 0: "Automatic", 1: "Manual" },
  "Exposure mode": { 0: "Automatic", 1: "Manual", 2: "Auto bracket" },
  Flash: {
    0x00: "Did not fire",
    0x01: "Fired",
    0x05: "Fired, no return detected",
    0x07: "Fired, return detected",
    0x08: "On, did not fire",
    0x09: "On, fired",
    0x10: "Off, did not fire",
    0x18: "Off, did not fire",
    0x19: "Off, did not fire",
    0x20: "No flash function",
  },
  Contrast: { 0: "Normal", 1: "Soft", 2: "Hard" },
  Saturation: { 0: "Normal", 1: "Low", 2: "High" },
  Sharpness: { 0: "Normal", 1: "Soft", 2: "Hard" },
};

/** A reader that never throws on a short buffer — it reports the overrun. */
class Cursor {
  constructor(
    readonly view: DataView,
    readonly little: boolean,
  ) {}

  has(offset: number, length: number): boolean {
    return offset >= 0 && offset + length <= this.view.byteLength;
  }

  u8(offset: number): number {
    return this.has(offset, 1) ? this.view.getUint8(offset) : 0;
  }
  u16(offset: number): number {
    return this.has(offset, 2) ? this.view.getUint16(offset, this.little) : 0;
  }
  u32(offset: number): number {
    return this.has(offset, 4) ? this.view.getUint32(offset, this.little) : 0;
  }
  i32(offset: number): number {
    return this.has(offset, 4) ? this.view.getInt32(offset, this.little) : 0;
  }
}

/** A rational printed the way a photographer reads it. */
function formatRational(numerator: number, denominator: number, name: string): string {
  if (denominator === 0) return "—";
  const value = numerator / denominator;

  // Exposure time is the one value that must stay a fraction: "1/250" is the
  // reading, and "0.004" is the same number and unrecognisable.
  if (name === "Exposure time" || name === "Shutter speed") {
    return value >= 1 ? `${round(value, 1)} s` : `1/${Math.round(1 / value)} s`;
  }
  if (name === "F number" || name === "Max aperture") return `f/${round(value, 1)}`;
  if (name === "Focal length") return `${round(value, 1)} mm`;
  if (name === "Exposure bias") return `${value > 0 ? "+" : ""}${round(value, 2)} EV`;
  if (name === "X resolution" || name === "Y resolution") return String(round(value, 0));

  return String(round(value, 4));
}

const round = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals)) as number;

/** Read one directory entry's components. */
function readValue(
  cursor: Cursor,
  tiffStart: number,
  entry: number,
  name: string,
): { value: string; raw: number | number[] | string } | null {
  const type = cursor.u16(entry + 2);
  const count = cursor.u32(entry + 4);
  const size = TYPE_SIZE[type];
  if (!size || count === 0 || count > 0x10000) return null;

  const bytes = size * count;
  // Up to four bytes are stored in the entry itself; more is an offset from the
  // start of the TIFF header — the detail every broken EXIF reader gets wrong.
  const at = bytes <= 4 ? entry + 8 : tiffStart + cursor.u32(entry + 8);
  if (!cursor.has(at, Math.min(bytes, 4))) return null;

  if (type === 2) {
    // ASCII, NUL-terminated and often NUL-padded.
    let text = "";
    for (let i = 0; i < count && cursor.has(at + i, 1); i += 1) {
      const code = cursor.u8(at + i);
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    const clean = text.trim();
    return clean === "" ? null : { value: clean, raw: clean };
  }

  if (type === 7 || type === 1) {
    // UNDEFINED / BYTE: almost always a binary blob (maker notes, comments).
    // Its length is the only useful thing to report, and printing it as
    // thousands of numbers would be worse than saying nothing.
    return { value: `${count.toLocaleString()} bytes`, raw: count };
  }

  const numbers: number[] = [];
  for (let i = 0; i < count && i < 64; i += 1) {
    const item = at + i * size;
    switch (type) {
      case 3:
        numbers.push(cursor.u16(item));
        break;
      case 8:
        numbers.push((cursor.u16(item) << 16) >> 16);
        break;
      case 4:
        numbers.push(cursor.u32(item));
        break;
      case 9:
        numbers.push(cursor.i32(item));
        break;
      case 5:
      case 10: {
        const numerator = type === 5 ? cursor.u32(item) : cursor.i32(item);
        const denominator = type === 5 ? cursor.u32(item + 4) : cursor.i32(item + 4);
        numbers.push(denominator === 0 ? 0 : numerator / denominator);
        if (count === 1) {
          return {
            value: formatRational(numerator, denominator, name),
            raw: denominator === 0 ? 0 : numerator / denominator,
          };
        }
        break;
      }
      default:
        return null;
    }
  }

  if (numbers.length === 0) return null;

  const named = ENUMS[name]?.[numbers[0]];
  if (named && numbers.length === 1) return { value: named, raw: numbers[0] };

  return {
    value: numbers.map((n) => String(round(n, 4))).join(", "),
    raw: numbers.length === 1 ? numbers[0] : numbers,
  };
}

/** Read a whole directory, following the sub-IFD pointers it carries. */
function readIfd(
  cursor: Cursor,
  tiffStart: number,
  offset: number,
  group: ExifGroup,
  names: Record<number, string>,
  tags: ExifTag[],
  seen: Set<number>,
): number {
  // A file whose IFDs point at each other would loop for ever; a file whose
  // offsets are rubbish would read the whole buffer as entries.
  if (seen.has(offset) || !cursor.has(offset, 2)) return 0;
  seen.add(offset);

  const count = cursor.u16(offset);
  if (count === 0 || count > 512) return 0;

  for (let i = 0; i < count; i += 1) {
    const entry = offset + 2 + i * 12;
    if (!cursor.has(entry, 12)) break;

    const id = cursor.u16(entry);

    if (id === EXIF_IFD_POINTER || id === GPS_IFD_POINTER) {
      const sub = tiffStart + cursor.u32(entry + 8);
      readIfd(
        cursor,
        tiffStart,
        sub,
        id === GPS_IFD_POINTER ? "GPS" : "Photo",
        id === GPS_IFD_POINTER ? GPS_TAGS : PHOTO_TAGS,
        tags,
        seen,
      );
      continue;
    }

    const name = names[id] ?? `Tag 0x${id.toString(16).padStart(4, "0")}`;
    const read = readValue(cursor, tiffStart, entry, name);
    if (read) tags.push({ id, name, group, value: read.value, raw: read.raw });
  }

  // The offset to the next IFD (the thumbnail's), or 0.
  const next = offset + 2 + count * 12;
  return cursor.has(next, 4) ? cursor.u32(next) : 0;
}

/**
 * Parse a TIFF/EXIF block.
 *
 * `bytes` must start at the byte-order mark (`II` or `MM`) — the container
 * parsers in `jpeg.ts`, `png.ts` and `webp.ts` hand over exactly that slice.
 */
export function parseTiff(bytes: Uint8Array): ExifTag[] {
  if (bytes.length < 8) return [];

  const order = String.fromCharCode(bytes[0], bytes[1]);
  if (order !== "II" && order !== "MM") return [];

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cursor = new Cursor(view, order === "II");
  if (cursor.u16(2) !== 42) return []; // The TIFF magic number.

  const tags: ExifTag[] = [];
  const seen = new Set<number>();
  const first = cursor.u32(4);

  const second = readIfd(cursor, 0, first, "Image", IMAGE_TAGS, tags, seen);
  // IFD1 describes the embedded thumbnail. Worth surfacing: it is a second,
  // smaller copy of the picture, and people are routinely surprised that
  // cropping an image can leave the original visible in its own thumbnail.
  if (second > 0) readIfd(cursor, 0, second, "Thumbnail", IMAGE_TAGS, tags, seen);

  return tags;
}

/** Degrees, minutes and seconds as a signed decimal degree. */
export function gpsDecimal(parts: number[] | number, reference: string): number | null {
  const dms = Array.isArray(parts) ? parts : [parts];
  if (dms.length === 0 || !dms.every((part) => Number.isFinite(part))) return null;

  const degrees = (dms[0] ?? 0) + (dms[1] ?? 0) / 60 + (dms[2] ?? 0) / 3600;
  const negative = /^[SW]/i.test(reference.trim());
  return negative ? -degrees : degrees;
}

/** The coordinate a set of tags describes, if it carries one. */
export function coordinatesFrom(tags: ExifTag[]): { lat: number; lon: number } | null {
  const find = (name: string) => tags.find((tag) => tag.group === "GPS" && tag.name === name);

  const latitude = find("Latitude");
  const longitude = find("Longitude");
  if (!latitude || !longitude) return null;

  const lat = gpsDecimal(
    latitude.raw as number[] | number,
    String(find("Latitude reference")?.raw ?? "N"),
  );
  const lon = gpsDecimal(
    longitude.raw as number[] | number,
    String(find("Longitude reference")?.raw ?? "E"),
  );

  if (lat === null || lon === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
