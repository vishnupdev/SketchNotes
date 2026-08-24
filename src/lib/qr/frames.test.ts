import { describe, expect, it } from "vitest";
import {
  acceptFrame,
  buildFrames,
  CHUNK_BYTES,
  collectorProgress,
  newCollector,
  parseFrame,
} from "./frames";
import { checksum32 } from "@/lib/pack";

/**
 * The QR frame protocol.
 *
 * This is the piece where a bug is most expensive and least visible: a frame
 * format that mis-parses, or a collector that accepts an incomplete set, would
 * hand the receiver a broken document which then gets written into storage. So
 * the assembly path is tested from every direction a camera can actually feed it
 * — out of order, repeated, interleaved with another sender, and corrupted.
 */

/**
 * A payload big enough to need several frames *after* compression, which means
 * it has to be high-entropy: a repetitive one deflates down to a single frame —
 * the protocol working correctly, and a useless test. Generated from a fixed
 * seed, so a failure is always reproducible.
 */
const bigPayload = (() => {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let seed = 1234567;
  let noise = "";
  while (noise.length < 4000) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    noise += alphabet[seed % alphabet.length];
  }
  return JSON.stringify({ format: "oneapp-backup", entries: { "sknotes:noise": noise } });
})();

/** Feed a list of frames through a fresh collector, in the order given. */
async function collect(frames: string[]) {
  const collector = newCollector();
  let last;
  for (const frame of frames) last = await acceptFrame(collector, frame);
  return { collector, last };
}

describe("parseFrame", () => {
  it("round-trips what buildFrames writes", async () => {
    const [frame] = await buildFrames("hello", "data", "abc123");
    const parsed = parseFrame(frame);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({ kind: "data", session: "abc123", index: 0, total: 1 });
  });

  it("labels each stream kind distinctly", async () => {
    const kinds = await Promise.all(
      (["data", "offer", "answer"] as const).map(async (kind) => {
        const [frame] = await buildFrames("x", kind);
        return parseFrame(frame)?.kind;
      }),
    );
    expect(kinds).toEqual(["data", "offer", "answer"]);
  });

  it("rejects anything that isn't a frame", () => {
    expect(parseFrame("https://example.com")).toBeNull();
    expect(parseFrame("")).toBeNull();
    // Right prefix, wrong field count.
    expect(parseFrame("OAH1|d|abc|0|1|b|deadbeef")).toBeNull();
    // Index outside the declared total.
    expect(parseFrame("OAH1|d|abc|3|2|b|deadbeef|Zm9v")).toBeNull();
    // Unknown encoding, and a malformed checksum.
    expect(parseFrame("OAH1|d|abc|0|1|q|deadbeef|Zm9v")).toBeNull();
    expect(parseFrame("OAH1|d|abc|0|1|b|nothex|Zm9v")).toBeNull();
  });
});

describe("buildFrames", () => {
  it("fits a short payload in one frame", async () => {
    expect(await buildFrames("small")).toHaveLength(1);
  });

  it("splits a long payload and numbers every part", async () => {
    const frames = await buildFrames(bigPayload);
    expect(frames.length).toBeGreaterThan(1);
    frames.forEach((frame, i) => {
      const parsed = parseFrame(frame)!;
      expect(parsed.index).toBe(i);
      expect(parsed.total).toBe(frames.length);
      expect(parsed.chunk.length).toBeLessThanOrEqual(CHUNK_BYTES);
    });
  });

  it("gives every frame of a stream the same session and hash", async () => {
    const frames = await buildFrames(bigPayload);
    const first = parseFrame(frames[0])!;
    for (const frame of frames) {
      const parsed = parseFrame(frame)!;
      expect(parsed.session).toBe(first.session);
      expect(parsed.hash).toBe(first.hash);
    }
  });
});

describe("acceptFrame", () => {
  it("reassembles a multi-frame payload", async () => {
    const payload = bigPayload;
    const { last } = await collect(await buildFrames(payload));
    expect(last).toEqual({ status: "complete", kind: "data", payload });
  });

  it("reassembles frames read out of order", async () => {
    const frames = await buildFrames(bigPayload);
    const shuffled = [...frames].reverse();
    const { last } = await collect(shuffled);
    expect(last).toMatchObject({ status: "complete", payload: bigPayload });
  });

  it("ignores repeats without counting them twice", async () => {
    const frames = await buildFrames(bigPayload);
    const collector = newCollector();
    // The scanner sees the same frame many times a second; only new ones count.
    await acceptFrame(collector, frames[0]);
    await acceptFrame(collector, frames[0]);
    await acceptFrame(collector, frames[0]);
    expect(collector.received).toBe(1);
    expect(collectorProgress(collector)).toBeCloseTo(1 / frames.length);
  });

  it("passes over anything that isn't one of our frames", async () => {
    const collector = newCollector();
    expect(await acceptFrame(collector, "WIFI:T:WPA;S:cafe;;")).toEqual({ status: "ignored" });
    expect(collector.received).toBe(0);
  });

  it("starts over when a different sender's code appears", async () => {
    const first = await buildFrames(bigPayload, "data", "aaaaaa");
    const second = await buildFrames("a different payload", "data", "bbbbbb");
    const collector = newCollector();
    await acceptFrame(collector, first[0]);
    await acceptFrame(collector, first[1]);
    const result = await acceptFrame(collector, second[0]);
    expect(result).toMatchObject({ status: "complete", payload: "a different payload" });
  });

  it("refuses a set whose checksum doesn't match", async () => {
    const frames = await buildFrames(bigPayload);
    // Corrupt one chunk while leaving the frame structurally valid.
    const parsed = parseFrame(frames[1])!;
    const corrupted = [
      "OAH1",
      "d",
      parsed.session,
      parsed.index,
      parsed.total,
      parsed.enc,
      parsed.hash,
      parsed.chunk.slice(0, -2) + "AA",
    ].join("|");
    const { last } = await collect([...frames.slice(0, 1), corrupted, ...frames.slice(2)]);
    expect(last?.status).toBe("failed");
  });

  it("survives a payload with characters that need encoding", async () => {
    const payload = JSON.stringify({ text: "മലയാളം · emoji 🎉 · pipes | and \\ slashes" });
    const { last } = await collect(await buildFrames(payload));
    expect(last).toMatchObject({ status: "complete", payload });
  });
});

describe("checksum32", () => {
  it("is stable and differs for near-identical input", () => {
    expect(checksum32("abc")).toBe(checksum32("abc"));
    expect(checksum32("abc")).not.toBe(checksum32("abd"));
    expect(checksum32("")).toHaveLength(8);
  });
});
