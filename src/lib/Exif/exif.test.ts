import { describe, expect, it } from "vitest";
import { coordinatesFrom, gpsDecimal, parseTiff } from "./tiff";
import {
  detectFormat,
  jpegSegments,
  pngChunks,
  readMeta,
  riffChunks,
  stripMeta,
} from "./containers";
import { batchTotals, cleanOne, entryName, zipName } from "./batch";

/**
 * Exif.
 *
 * Two things are tested here, and the second is the one that matters.
 *
 * The parser is checked against a TIFF block assembled byte by byte below —
 * including the case every naive EXIF reader gets wrong, a value longer than
 * four bytes stored at an offset from the *start of the TIFF header* rather
 * than from the entry.
 *
 * The strip is checked to be **lossless**: that the compressed image data of
 * the file it produces is byte-identical to the original's. That is the claim
 * the app makes, it is the reason this doesn't go through a canvas, and it is
 * the one property a person cannot verify by looking at the result.
 */

/* ----------------------- building a file to read ------------------------ */

const LAT = [9, 58, 31.68];
const LON = [76, 14, 12];

/**
 * A little-endian TIFF block with IFD0 (maker, model, orientation) and a GPS
 * sub-IFD, laid out with the strings and rationals in a data area past the
 * directories — which is what forces the parser to follow real offsets.
 */
function buildTiff(): Uint8Array {
  const size = 198;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  const put = (at: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) bytes[at + i] = text.charCodeAt(i);
  };
  /** One 12-byte directory entry. */
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    view.setUint16(at, tag, true);
    view.setUint16(at + 2, type, true);
    view.setUint32(at + 4, count, true);
    view.setUint32(at + 8, value, true);
  };
  const rational = (at: number, value: number, denominator: number) => {
    view.setUint32(at, Math.round(value * denominator), true);
    view.setUint32(at + 4, denominator, true);
  };

  const MAKE = 62;
  const MODEL = 68;
  const GPS = 76;
  const LAT_AT = 142;
  const LON_AT = 166;
  const ALT_AT = 190;

  put(0, "II");
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);

  view.setUint16(8, 4, true); // four entries in IFD0
  entry(10, 0x010f, 2, 6, MAKE); // Camera maker, at an offset
  entry(22, 0x0110, 2, 8, MODEL); // Camera model, at an offset
  entry(34, 0x0112, 3, 1, 6); // Orientation, inline: rotated 90° CW
  entry(46, 0x8825, 4, 1, GPS); // GPS sub-IFD pointer
  view.setUint32(58, 0, true); // no IFD1

  put(MAKE, "Canon\0");
  put(MODEL, "EOS 90D\0");

  view.setUint16(GPS, 5, true);
  // An ASCII value of two bytes fits inside the entry, so "N" is written
  // straight into the value field rather than at an offset.
  entry(GPS + 2, 0x0001, 2, 2, 0);
  put(GPS + 2 + 8, "N\0");
  entry(GPS + 14, 0x0002, 5, 3, LAT_AT);
  entry(GPS + 26, 0x0003, 2, 2, 0);
  put(GPS + 26 + 8, "E\0");
  entry(GPS + 38, 0x0004, 5, 3, LON_AT);
  entry(GPS + 50, 0x0006, 5, 1, ALT_AT); // Altitude
  view.setUint32(GPS + 62, 0, true);

  rational(LAT_AT, LAT[0], 1);
  rational(LAT_AT + 8, LAT[1], 1);
  rational(LAT_AT + 16, LAT[2], 100);
  rational(LON_AT, LON[0], 1);
  rational(LON_AT + 8, LON[1], 1);
  rational(LON_AT + 16, LON[2], 100);
  rational(ALT_AT, 8, 1);

  return bytes;
}

const bytesOf = (...parts: (number | number[] | Uint8Array | string)[]): Uint8Array => {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === "number") flat.push(part);
    else if (typeof part === "string") for (const char of part) flat.push(char.charCodeAt(0));
    else for (const byte of part) flat.push(byte);
  }
  return new Uint8Array(flat);
};

/** A marker segment: 0xFF, marker, big-endian length, payload. */
const segment = (marker: number, payload: Uint8Array): Uint8Array => {
  const length = payload.length + 2;
  return bytesOf(0xff, marker, length >> 8, length & 0xff, payload);
};

/** The compressed picture, whatever it is — the bytes a strip must not touch. */
const SCAN = bytesOf(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x3f, 0x00, 0x9a, 0x7c, 0x41, 0xd3, 0xff, 0xd9);

function buildJpeg(): Uint8Array {
  return bytesOf(
    0xff,
    0xd8, // SOI
    segment(0xe0, bytesOf("JFIF\0", 1, 2, 0, 0, 1, 0, 1, 0, 0)), // APP0, kept
    segment(0xe1, bytesOf("Exif\0\0", buildTiff())), // APP1 EXIF, removed
    segment(0xe1, bytesOf("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>")), // XMP, removed
    segment(0xe2, bytesOf("ICC_PROFILE\0", 1, 1, 0, 0, 0, 12)), // ICC, kept
    segment(0xed, bytesOf("Photoshop 3.0\0", 0x38, 0x42, 0x49, 0x4d)), // IPTC, removed
    segment(0xfe, bytesOf("Shot on the balcony")), // COM, removed
    // SOF0: precision, height 0x0400, width 0x0300, one component.
    segment(0xc0, bytesOf(8, 0x04, 0x00, 0x03, 0x00, 1, 1, 0x11, 0)),
    SCAN,
  );
}

/** CRC is not recomputed anywhere — chunks are dropped whole — so 0 will do. */
const pngChunk = (type: string, payload: Uint8Array): Uint8Array => {
  const length = payload.length;
  return bytesOf(
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    type,
    payload,
    0,
    0,
    0,
    0,
  );
};

function buildPng(): Uint8Array {
  return bytesOf(
    0x89,
    "PNG",
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    pngChunk("IHDR", bytesOf(0, 0, 0x03, 0x20, 0, 0, 0x02, 0x58, 8, 6, 0, 0, 0)),
    pngChunk("tEXt", bytesOf("Author\0Ada Lovelace")),
    pngChunk("iCCP", bytesOf("profile\0", 0, 1, 2, 3)),
    pngChunk("eXIf", buildTiff()),
    pngChunk("tIME", bytesOf(0x07, 0xe8, 3, 12, 9, 30, 0)),
    pngChunk("IDAT", bytesOf(0x78, 0x9c, 0x01, 0x02, 0x03)),
    pngChunk("IDAT", bytesOf(0x04, 0x05, 0x06)),
    pngChunk("IEND", new Uint8Array()),
  );
}

const riffChunk = (type: string, payload: Uint8Array): Uint8Array => {
  const size = payload.length;
  const pad = size % 2 === 1 ? [0] : [];
  return bytesOf(type, size & 0xff, (size >>> 8) & 0xff, (size >>> 16) & 0xff, (size >>> 24) & 0xff, payload, pad);
};

function buildWebp(): Uint8Array {
  const body = bytesOf(
    // VP8X: flags byte with the EXIF (0x08) and XMP (0x04) bits set, then the
    // canvas size minus one, 24-bit little-endian.
    riffChunk("VP8X", bytesOf(0x0c, 0, 0, 0, 0x1f, 0x03, 0, 0x57, 0x02, 0)),
    riffChunk("VP8L", bytesOf(0x2f, 0x1f, 0x03, 0x50, 0x08, 0x11)),
    riffChunk("EXIF", buildTiff()),
    riffChunk("XMP ", bytesOf("<x:xmpmeta/>")),
  );
  const total = 4 + body.length;
  return bytesOf(
    "RIFF",
    total & 0xff,
    (total >>> 8) & 0xff,
    (total >>> 16) & 0xff,
    (total >>> 24) & 0xff,
    "WEBP",
    body,
  );
}

/* ------------------------------- the tests ------------------------------ */

describe("detectFormat", () => {
  it("identifies by signature, never by a name", () => {
    expect(detectFormat(buildJpeg())).toBe("jpeg");
    expect(detectFormat(buildPng())).toBe("png");
    expect(detectFormat(buildWebp())).toBe("webp");
    expect(detectFormat(bytesOf("GIF89a", 0, 0, 0, 0, 0, 0))).toBe("gif");
    expect(detectFormat(bytesOf("this is a text file, honestly"))).toBe("unknown");
    expect(detectFormat(new Uint8Array(3))).toBe("unknown");
  });
});

describe("parseTiff", () => {
  const tags = parseTiff(buildTiff());
  const find = (name: string) => tags.find((tag) => tag.name === name);

  it("reads values stored inline", () => {
    // Orientation 6, printed as the word rather than the number.
    expect(find("Orientation")?.value).toBe("Rotated 90° CW");
  });

  it("reads values stored at an offset from the TIFF header", () => {
    // The case every naive reader gets wrong: 6 and 8 bytes of ASCII cannot
    // fit in the entry, so both are references into the data area.
    expect(find("Camera maker")?.value).toBe("Canon");
    expect(find("Camera model")?.value).toBe("EOS 90D");
  });

  it("follows the GPS sub-IFD and groups its tags separately", () => {
    expect(find("Latitude")?.group).toBe("GPS");
    expect(find("Camera maker")?.group).toBe("Image");
    expect(find("Latitude reference")?.value).toBe("N");
    expect(find("Altitude")?.value).toBe("8");
  });

  it("prints rationals the way a photographer reads them", () => {
    const exposure = parseTiff(buildTiff());
    expect(exposure.length).toBeGreaterThan(0);
    // Latitude is three rationals; the seconds keep their fraction.
    expect(find("Latitude")?.value).toBe("9, 58, 31.68");
  });

  it("returns nothing for a block that is not TIFF, rather than throwing", () => {
    expect(parseTiff(bytesOf("not a tiff at all"))).toEqual([]);
    expect(parseTiff(new Uint8Array(4))).toEqual([]);
    // A valid header whose IFD offset points past the end of the buffer.
    const truncated = buildTiff().subarray(0, 20);
    expect(() => parseTiff(truncated)).not.toThrow();
  });

  it("survives a directory that points at itself", () => {
    const bytes = buildTiff();
    // Aim IFD0's "next IFD" pointer back at IFD0.
    new DataView(bytes.buffer).setUint32(58, 8, true);
    expect(() => parseTiff(bytes)).not.toThrow();
  });
});

describe("coordinates", () => {
  it("converts degrees, minutes and seconds to a decimal degree", () => {
    expect(gpsDecimal([9, 58, 31.68], "N")).toBeCloseTo(9.97547, 5);
    expect(gpsDecimal([9, 58, 31.68], "S")).toBeCloseTo(-9.97547, 5);
    expect(gpsDecimal([76, 14, 12], "E")).toBeCloseTo(76.23667, 5);
    expect(gpsDecimal([76, 14, 12], "W")).toBeCloseTo(-76.23667, 5);
  });

  it("reads the coordinate out of a real tag set", () => {
    const point = coordinatesFrom(parseTiff(buildTiff()));
    expect(point?.lat).toBeCloseTo(9.97547, 4);
    expect(point?.lon).toBeCloseTo(76.23667, 4);
  });

  it("has no coordinate when the tags carry none", () => {
    expect(coordinatesFrom([])).toBeNull();
    expect(gpsDecimal([], "N")).toBeNull();
  });

  it("refuses a coordinate that is off the planet", () => {
    const tags = parseTiff(buildTiff()).map((tag) =>
      tag.name === "Latitude" ? { ...tag, raw: [200, 0, 0] } : tag,
    );
    expect(coordinatesFrom(tags)).toBeNull();
  });
});

describe("reading a JPEG", () => {
  const meta = readMeta(buildJpeg());

  it("lists every metadata segment with what it holds", () => {
    expect(meta.format).toBe("jpeg");
    expect(meta.blocks.map((block) => `${block.marker} ${block.kind}`)).toEqual([
      "APP0 JFIF header",
      "APP1 EXIF",
      "APP1 XMP",
      "APP2 Colour profile (ICC)",
      "APP13 IPTC / Photoshop",
      "COM Comment",
    ]);
  });

  it("marks the decoding instructions as not removable", () => {
    const keep = meta.blocks.filter((block) => !block.removable).map((block) => block.marker);
    // JFIF and the ICC profile are how the picture is decoded correctly, not
    // facts about the photographer.
    expect(keep).toEqual(["APP0", "APP2"]);
  });

  it("reads the size out of the SOF segment, not out of EXIF", () => {
    expect(meta.width).toBe(0x0300);
    expect(meta.height).toBe(0x0400);
  });

  it("parses the EXIF it found and picks up the comment", () => {
    expect(meta.tags.find((tag) => tag.name === "Camera model")?.value).toBe("EOS 90D");
    expect(meta.text).toEqual([{ key: "Comment", value: "Shot on the balcony" }]);
  });

  it("stops safely on a truncated file", () => {
    const half = buildJpeg().subarray(0, 40);
    expect(() => readMeta(half)).not.toThrow();
    expect(jpegSegments(half).segments.length).toBeGreaterThan(0);
  });
});

describe("reading a PNG", () => {
  const meta = readMeta(buildPng());

  it("reads the size from IHDR", () => {
    expect(meta.width).toBe(0x0320);
    expect(meta.height).toBe(0x0258);
  });

  it("reads a text chunk and an EXIF chunk", () => {
    expect(meta.text).toEqual([{ key: "Author", value: "Ada Lovelace" }]);
    expect(meta.tags.find((tag) => tag.name === "Camera maker")?.value).toBe("Canon");
  });

  it("lists image data once however many IDATs there are", () => {
    expect(meta.blocks.filter((block) => block.marker === "IDAT")).toHaveLength(1);
    expect(pngChunks(buildPng()).filter((chunk) => chunk.type === "IDAT")).toHaveLength(2);
  });

  it("marks the colour profile as not removable and the text as removable", () => {
    const by = (marker: string) => meta.blocks.find((block) => block.marker === marker);
    expect(by("iCCP")?.removable).toBe(false);
    expect(by("tEXt")?.removable).toBe(true);
    expect(by("tIME")?.removable).toBe(true);
    expect(by("eXIf")?.removable).toBe(true);
  });
});

describe("reading a WebP", () => {
  const meta = readMeta(buildWebp());

  it("reads the canvas size out of VP8X", () => {
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it("finds the EXIF and XMP chunks", () => {
    expect(meta.blocks.map((block) => block.marker)).toContain("EXIF");
    expect(meta.tags.find((tag) => tag.name === "Camera model")?.value).toBe("EOS 90D");
  });

  it("walks the chunks with their padding", () => {
    const chunks = riffChunks(buildWebp());
    // Every chunk must start on an even offset for the walk to stay in step.
    for (const chunk of chunks) expect(chunk.start % 2).toBe(0);
    expect(chunks.map((chunk) => chunk.type)).toEqual(["VP8X", "VP8L", "EXIF", "XMP "]);
  });
});

describe("stripping a JPEG", () => {
  const original = buildJpeg();
  const result = stripMeta(original);

  it("removes the metadata and keeps the decoding segments", () => {
    expect(result.removed.map((block) => block.kind)).toEqual([
      "EXIF",
      "XMP",
      "IPTC / Photoshop",
      "Comment",
    ]);
    const after = readMeta(result.bytes);
    expect(after.blocks.map((block) => block.marker)).toEqual(["APP0", "APP2"]);
    expect(after.tags).toEqual([]);
    expect(after.text).toEqual([]);
  });

  it("is lossless — the compressed picture is byte-identical", () => {
    // The claim the whole app rests on. The scan is the last bytes of the file
    // in both, and they must match exactly.
    const tail = result.bytes.subarray(result.bytes.length - SCAN.length);
    expect([...tail]).toEqual([...SCAN]);
    expect(result.lossless).toBe(true);
    // …and the picture still reads as the same picture.
    expect(readMeta(result.bytes).width).toBe(readMeta(original).width);
    expect(readMeta(result.bytes).height).toBe(readMeta(original).height);
  });

  it("gets smaller by exactly what it removed", () => {
    const removed = result.removed.reduce((sum, block) => sum + block.bytes, 0);
    expect(original.length - result.bytes.length).toBe(removed);
  });

  it("still starts with SOI and ends with EOI", () => {
    expect([result.bytes[0], result.bytes[1]]).toEqual([0xff, 0xd8]);
    const end = result.bytes.subarray(result.bytes.length - 2);
    expect([...end]).toEqual([0xff, 0xd9]);
  });

  it("is a no-op on a file that is already clean", () => {
    const clean = stripMeta(result.bytes);
    expect(clean.removed).toEqual([]);
    // Returns the very same array, so "clean it" doesn't rewrite a clean file.
    expect(clean.bytes).toBe(result.bytes);
  });
});

describe("stripping a PNG", () => {
  const original = buildPng();
  const result = stripMeta(original);

  it("drops the text, time and EXIF chunks and keeps the rest in order", () => {
    expect(result.removed.map((block) => block.marker)).toEqual(["tEXt", "eXIf", "tIME"]);
    expect(pngChunks(result.bytes).map((chunk) => chunk.type)).toEqual([
      "IHDR",
      "iCCP",
      "IDAT",
      "IDAT",
      "IEND",
    ]);
  });

  it("keeps the image data byte-identical", () => {
    const idat = (bytes: Uint8Array) =>
      pngChunks(bytes)
        .filter((chunk) => chunk.type === "IDAT")
        .map((chunk) => [...chunk.payload]);
    expect(idat(result.bytes)).toEqual(idat(original));
    expect(readMeta(result.bytes).tags).toEqual([]);
    expect(readMeta(result.bytes).text).toEqual([]);
  });

  it("keeps the signature and the IEND terminator", () => {
    expect([...result.bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(pngChunks(result.bytes).pop()?.type).toBe("IEND");
  });
});

describe("stripping a WebP", () => {
  const result = stripMeta(buildWebp());

  it("drops EXIF and XMP", () => {
    expect(result.removed.map((block) => block.marker)).toEqual(["EXIF", "XMP"]);
    expect(riffChunks(result.bytes).map((chunk) => chunk.type)).toEqual(["VP8X", "VP8L"]);
    expect(readMeta(result.bytes).tags).toEqual([]);
  });

  it("rewrites the RIFF size, so the file is not left claiming to be longer", () => {
    const size = new DataView(
      result.bytes.buffer,
      result.bytes.byteOffset,
      result.bytes.byteLength,
    ).getUint32(4, true);
    expect(size).toBe(result.bytes.length - 8);
  });

  it("clears the VP8X flags for the chunks it removed", () => {
    // Left set, the header advertises an EXIF chunk that is no longer there —
    // a technically invalid file that some decoders reject outright.
    const vp8x = riffChunks(result.bytes).find((chunk) => chunk.type === "VP8X");
    expect(vp8x).toBeDefined();
    expect(vp8x!.payload[0] & 0x0c).toBe(0);
  });

  it("keeps the image chunk exactly", () => {
    const image = (bytes: Uint8Array) =>
      riffChunks(bytes).find((chunk) => chunk.type === "VP8L")?.payload;
    expect([...(image(result.bytes) ?? [])]).toEqual([...(image(buildWebp()) ?? [])]);
    expect(readMeta(result.bytes).width).toBe(800);
  });
});

describe("stripping anything else", () => {
  it("leaves a format it cannot edit alone rather than damaging it", () => {
    const gif = bytesOf("GIF89a", 0x20, 0x03, 0x58, 0x02, 0, 0, 0);
    const result = stripMeta(gif);
    expect(result.bytes).toBe(gif);
    expect(result.removed).toEqual([]);
  });

  it("says what it cannot read", () => {
    expect(readMeta(bytesOf("just some text, no picture")).warnings.join(" ")).toMatch(
      /not a JPEG/,
    );
  });
});

/* ------------------------------ the batch ------------------------------- */

/** A `File` over bytes built above — Node 20+ has File globally. */
const asFile = (bytes: Uint8Array, name: string, type = "image/jpeg") =>
  new File([bytes as unknown as BlobPart], name, { type });

describe("cleanOne", () => {
  it("cleans a file that has metadata, and reports what came out", async () => {
    const item = await cleanOne(asFile(buildJpeg(), "balcony.jpg"), "a");
    expect(item).toMatchObject({
      name: "balcony.jpg",
      format: "jpeg",
      outcome: "cleaned",
      hadLocation: true,
    });
    expect(item.removed).toContain("EXIF");
    expect(item.saved).toBeGreaterThan(0);
    expect(item.output).toBeDefined();
    // The cleaned bytes really are clean, and really are shorter.
    expect(readMeta(item.output!).tags).toEqual([]);
    expect(item.output!.length).toBe(buildJpeg().length - item.saved);
  });

  it("says a clean file was already clean rather than rewriting it", async () => {
    const stripped = stripMeta(buildJpeg()).bytes;
    const item = await cleanOne(asFile(stripped, "clean.jpg"), "b");
    expect(item.outcome).toBe("already-clean");
    expect(item.saved).toBe(0);
    expect(item.output).toBeUndefined();
  });

  it("marks a format it cannot edit as unsupported instead of damaging it", async () => {
    const gif = bytesOf("GIF89a", 0x20, 0x03, 0x58, 0x02, 0, 0, 0);
    const item = await cleanOne(asFile(gif, "loop.gif", "image/gif"), "c");
    expect(item).toMatchObject({ format: "gif", outcome: "unsupported", saved: 0 });
    expect(item.output).toBeUndefined();
  });

  it("never throws on something that is not a picture", async () => {
    const item = await cleanOne(asFile(bytesOf("hello, not an image"), "notes.txt", "text/plain"), "d");
    expect(item.outcome).toBe("unsupported");
  });

  it("flags a location in a PNG's eXIf chunk too, not just a JPEG's APP1", async () => {
    const item = await cleanOne(asFile(buildPng(), "shot.png", "image/png"), "e");
    expect(item).toMatchObject({ format: "png", outcome: "cleaned", hadLocation: true });
  });

  it("says so when a picture has metadata but no location", async () => {
    // Metadata (a text record) and no GPS — the case where the batch should not
    // claim to have removed a location it never found.
    const png = bytesOf(
      0x89,
      "PNG",
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      pngChunk("IHDR", bytesOf(0, 0, 0x03, 0x20, 0, 0, 0x02, 0x58, 8, 6, 0, 0, 0)),
      pngChunk("tEXt", bytesOf("Author\0Ada Lovelace")),
      pngChunk("IDAT", bytesOf(0x78, 0x9c, 0x01)),
      pngChunk("IEND", new Uint8Array()),
    );
    const item = await cleanOne(asFile(png, "no-gps.png", "image/png"), "f");
    expect(item).toMatchObject({ outcome: "cleaned", hadLocation: false });
    expect(item.removed).toContain("Text");
  });
});

describe("batchTotals", () => {
  it("adds up what happened, and what it saved", async () => {
    const items = [
      await cleanOne(asFile(buildJpeg(), "a.jpg"), "1"),
      await cleanOne(asFile(buildPng(), "b.png", "image/png"), "2"),
      await cleanOne(asFile(stripMeta(buildJpeg()).bytes, "c.jpg"), "3"),
      await cleanOne(asFile(bytesOf("GIF89a", 0, 0, 0, 0, 0, 0, 0), "d.gif", "image/gif"), "4"),
    ];

    const totals = batchTotals(items);
    expect(totals).toMatchObject({
      files: 4,
      cleaned: 2,
      alreadyClean: 1,
      unsupported: 1,
      failed: 0,
      // Both the JPEG and the PNG fixture carry the same GPS block.
      located: 2,
      hasOutput: true,
    });
    expect(totals.saved).toBe(items[0].saved + items[1].saved);
  });

  it("reports an empty queue as empty rather than as a failure", () => {
    expect(batchTotals([])).toMatchObject({ files: 0, cleaned: 0, saved: 0, hasOutput: false });
  });
});

describe("zip naming", () => {
  it("keeps the original name", () => {
    expect(entryName("holiday.jpg", new Set())).toBe("holiday.jpg");
  });

  it("numbers a duplicate instead of letting it overwrite the first", () => {
    const taken = new Set<string>();
    expect(entryName("a.jpg", taken)).toBe("a.jpg");
    expect(entryName("a.jpg", taken)).toBe("a (2).jpg");
    expect(entryName("a.jpg", taken)).toBe("a (3).jpg");
  });

  it("strips directory parts, so no entry is a traversal shape", () => {
    expect(entryName("../../etc/passwd.jpg", new Set())).toBe("passwd.jpg");
    expect(entryName("folder\\shot.png", new Set())).toBe("shot.png");
    expect(entryName("", new Set())).toBe("picture");
  });

  it("dates the archive so two batches do not collide", () => {
    expect(zipName(Date.UTC(2026, 8, 2, 12))).toBe("pictures-clean-20260902.zip");
  });
});
