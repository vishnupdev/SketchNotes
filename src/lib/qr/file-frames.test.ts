import { describe, expect, it } from "vitest";
import {
  acceptFileFrame,
  buildFileFrames,
  estimateFrames,
  FILE_FRAME_PREFIX,
  fileClassOf,
  missingParts,
  newFileCollector,
  parseFileFrame,
} from "./file-frames";
import { buildFrames } from "./frames";

/**
 * The file frame protocol.
 *
 * A file is the payload where a silent bug is worst: a stream that assembles in
 * the wrong order, or verifies when it shouldn't, hands back a *plausible* file
 * — right name, right size, quietly corrupt — and the user finds out when the
 * video won't play, long after the codes have gone. So the assembly path is
 * tested from every direction a camera can feed it: out of order, repeated,
 * interleaved with another file, truncated and corrupted.
 */

/**
 * Bytes that do not compress, so the stream genuinely needs many frames. A
 * repetitive buffer deflates to a single code — the protocol working correctly,
 * and a useless test.
 *
 * xorshift, and the *high* byte of it: a plain LCG's low bits have a period of a
 * couple of hundred values, which deflate flattens almost as well as a constant.
 * Fixed seed, so a failure is always reproducible.
 */
function noisyBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  let seed = 0x9e3779b9;
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    out[i] = (seed >>> 24) & 0xff;
  }
  return out;
}

const SAMPLE = { name: "holiday.jpg", type: "image/jpeg", bytes: noisyBytes(5000) };

/** Feed frames through a fresh collector in the order given, and report the last result. */
async function collect(frames: string[]) {
  const collector = newFileCollector();
  let last = await acceptFileFrame(collector, frames[0]);
  for (const frame of frames.slice(1)) last = await acceptFileFrame(collector, frame);
  return { collector, last };
}

describe("fileClassOf", () => {
  it("classifies by MIME type", () => {
    expect(fileClassOf("image/png", "a.png")).toBe("image");
    expect(fileClassOf("audio/mpeg", "a.mp3")).toBe("audio");
    expect(fileClassOf("video/mp4", "a.mp4")).toBe("video");
    expect(fileClassOf("application/pdf", "a.pdf")).toBe("document");
    expect(fileClassOf("text/plain", "a.txt")).toBe("document");
  });

  it("falls back to the extension when the browser reports no type", () => {
    // Windows hands over an empty type for .md and a few others, which is the
    // only reason the extension list exists.
    expect(fileClassOf("", "notes.md")).toBe("document");
    expect(fileClassOf("", "sheet.xlsx")).toBe("document");
    expect(fileClassOf("", "archive.bin")).toBe("file");
  });
});

describe("buildFileFrames", () => {
  it("round-trips a file through its frames", async () => {
    const { frames } = await buildFileFrames(SAMPLE);
    expect(frames.length).toBeGreaterThan(1);

    const { last } = await collect(frames);
    expect(last.status).toBe("complete");
    if (last.status !== "complete") return;
    expect(last.file.name).toBe("holiday.jpg");
    expect(last.file.mime).toBe("image/jpeg");
    expect(last.file.fileClass).toBe("image");
    expect(Array.from(last.file.bytes)).toEqual(Array.from(SAMPLE.bytes));
  });

  it("rebuilds from frames read in any order, with repeats", async () => {
    const { frames } = await buildFileFrames(SAMPLE);
    // A camera pointed at a loop sees frames shuffled and re-sees most of them.
    const shuffled = [...frames].reverse();
    const withRepeats = [...shuffled.slice(0, 3), ...shuffled, ...shuffled.slice(0, 2)];

    const { last } = await collect(withRepeats);
    expect(last.status).toBe("complete");
    if (last.status !== "complete") return;
    expect(Array.from(last.file.bytes)).toEqual(Array.from(SAMPLE.bytes));
  });

  it("carries the file class in every frame, so the first code read says what is coming", async () => {
    const { frames } = await buildFileFrames({
      name: "clip.mp4",
      type: "video/mp4",
      bytes: noisyBytes(3000),
    });
    for (const frame of frames) expect(parseFileFrame(frame)?.fileClass).toBe("video");

    const collector = newFileCollector();
    const first = await acceptFileFrame(collector, frames[0]);
    expect(first.status).toBe("progress");
    if (first.status !== "progress") return;
    expect(first.fileClass).toBe("video");
  });

  it("honours the chunk size — a denser code means fewer of them", async () => {
    const sparse = await buildFileFrames(SAMPLE, { chunkBytes: 420 });
    const dense = await buildFileFrames(SAMPLE, { chunkBytes: 900 });
    expect(dense.frames.length).toBeLessThan(sparse.frames.length);
  });

  it("keeps a one-code file to one code", async () => {
    const { frames } = await buildFileFrames({
      name: "hi.txt",
      type: "text/plain",
      bytes: new TextEncoder().encode("hello"),
    });
    expect(frames).toHaveLength(1);
    const { last } = await collect(frames);
    expect(last.status).toBe("complete");
  });

  it("survives a name that isn't ASCII", async () => {
    const { frames } = await buildFileFrames({
      name: "കുറിപ്പ് 📎.txt",
      type: "text/plain",
      bytes: new TextEncoder().encode("ശരി"),
    });
    const { last } = await collect(frames);
    expect(last.status).toBe("complete");
    if (last.status !== "complete") return;
    expect(last.file.name).toBe("കുറിപ്പ് 📎.txt");
    expect(new TextDecoder().decode(last.file.bytes)).toBe("ശരി");
  });
});

describe("parseFileFrame", () => {
  it("rejects anything that isn't a file frame", () => {
    expect(parseFileFrame("https://example.com")).toBeNull();
    expect(parseFileFrame("")).toBeNull();
    expect(parseFileFrame(`${FILE_FRAME_PREFIX}|abc|0|1|z|deadbeef|i`)).toBeNull();
    // An index outside the stream would write past the end of the chunk array.
    expect(parseFileFrame(`${FILE_FRAME_PREFIX}|abc|5|3|z|deadbeef|i|AAA`)).toBeNull();
    // An unknown class letter is a frame from a version we don't understand.
    expect(parseFileFrame(`${FILE_FRAME_PREFIX}|abc|0|1|z|deadbeef|x|AAA`)).toBeNull();
  });

  it("ignores a Handoff frame rather than half-reading it", async () => {
    // The two protocols share a screen and a camera; the distinct prefix is what
    // stops a scan of one being fed into the other (rule #5).
    const [handoff] = await buildFrames("some backup document", "data");
    expect(parseFileFrame(handoff)).toBeNull();

    const collector = newFileCollector();
    expect((await acceptFileFrame(collector, handoff)).status).toBe("ignored");
  });
});

describe("acceptFileFrame", () => {
  it("never completes on a partial set", async () => {
    const { frames } = await buildFileFrames(SAMPLE);
    const { last, collector } = await collect(frames.slice(0, -1));
    expect(last.status).toBe("progress");
    expect(collector.received).toBe(frames.length - 1);
    expect(missingParts(collector)).toEqual([frames.length]);
  });

  it("reports a corrupted frame instead of handing back a broken file", async () => {
    const { frames } = await buildFileFrames(SAMPLE);
    const damaged = [...frames];
    // One character misread — the failure a shaky camera actually produces.
    const parts = damaged[1].split("|");
    parts[7] = `A${parts[7].slice(1)}` === parts[7] ? `B${parts[7].slice(1)}` : `A${parts[7].slice(1)}`;
    damaged[1] = parts.join("|");

    const { last } = await collect(damaged);
    expect(last.status).toBe("failed");
  });

  it("restarts cleanly when the camera is pointed at a different file", async () => {
    const first = await buildFileFrames(SAMPLE);
    const second = await buildFileFrames({
      name: "song.mp3",
      type: "audio/mpeg",
      bytes: noisyBytes(2000),
    });

    // Half of one file, then all of another: the second must arrive intact.
    const { last } = await collect([...first.frames.slice(0, 2), ...second.frames]);
    expect(last.status).toBe("complete");
    if (last.status !== "complete") return;
    expect(last.file.name).toBe("song.mp3");
    expect(last.file.fileClass).toBe("audio");
  });
});

describe("estimateFrames", () => {
  it("is an upper bound, never an underestimate", async () => {
    for (const chunk of [420, 640, 900]) {
      const { frames } = await buildFileFrames(SAMPLE, { chunkBytes: chunk });
      expect(estimateFrames(SAMPLE.bytes.length, chunk)).toBeGreaterThanOrEqual(frames.length);
    }
  });

  it("never promises less than one code", () => {
    expect(estimateFrames(0, 640)).toBe(1);
  });
});
