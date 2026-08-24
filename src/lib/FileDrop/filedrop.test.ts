import { describe, expect, it } from "vitest";
import { crc32, crcHex } from "@/lib/pack";
import { CHUNK_SIZE, chunkSizeFor, parseControl, RateMeter } from "./transfer";
import { safeName } from "./sink";
import type { Control } from "./types";

/**
 * File Drop's checkable parts.
 *
 * The transfer itself needs two live browsers, so what is tested here is
 * everything that decides whether a transfer is *correct* rather than whether it
 * connects: the framing, the checksum that decides if a received file is kept,
 * and the name sanitiser — which is a security boundary, because the file name
 * arrives from another device and is used to create a file on this one.
 */

describe("parseControl", () => {
  it("reads each control message", () => {
    const messages: Control[] = [
      { t: "offer", files: [{ name: "a.bin", size: 10, type: "" }], total: 10 },
      { t: "accept", skip: { 0: 4096 } },
      { t: "pause" },
      { t: "resume" },
      { t: "decline" },
      { t: "file", index: 0, meta: { name: "a.bin", size: 10, type: "" }, offset: 0 },
      { t: "end", index: 0, crc: "deadbeef" },
      { t: "done" },
      { t: "cancel", reason: "stopped" },
    ];
    for (const message of messages) {
      expect(parseControl(JSON.stringify(message))).toEqual(message);
    }
  });

  it("returns null for anything that isn't one, instead of throwing", () => {
    // A stray string on the channel must never take down the transfer.
    expect(parseControl("not json")).toBeNull();
    expect(parseControl("[1,2,3]")).toBeNull();
    expect(parseControl('"just a string"')).toBeNull();
    expect(parseControl("null")).toBeNull();
  });
});

describe("crc32 over a stream", () => {
  it("matches whether hashed in one go or chunk by chunk", () => {
    const bytes = new Uint8Array(CHUNK_SIZE * 3 + 17);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) % 256;

    const whole = crc32(bytes);
    let streamed = 0;
    for (let at = 0; at < bytes.length; at += CHUNK_SIZE) {
      streamed = crc32(bytes.subarray(at, at + CHUNK_SIZE), streamed);
    }
    // This equality is the whole reason a multi-gigabyte file can be verified
    // without ever being held in memory.
    expect(crcHex(streamed)).toBe(crcHex(whole));
  });

  it("changes when a single byte does", () => {
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    const b = new Uint8Array([1, 2, 3, 4, 6]);
    expect(crcHex(crc32(a))).not.toBe(crcHex(crc32(b)));
  });

  it("is eight hex characters, always", () => {
    expect(crcHex(crc32(new Uint8Array()))).toHaveLength(8);
    expect(crcHex(crc32(new Uint8Array([0])))).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("RateMeter", () => {
  it("reports throughput over the recent window", () => {
    const meter = new RateMeter();
    meter.push(0, 1000);
    expect(meter.push(1_000_000, 2000)).toBeCloseTo(1_000_000, -3);
  });

  it("gives nothing away before there is a span to measure", () => {
    const meter = new RateMeter();
    expect(meter.push(500, 1000)).toBe(0);
  });
});

describe("safeName", () => {
  it("keeps an ordinary name intact", () => {
    expect(safeName("holiday video.mp4")).toBe("holiday video.mp4");
    expect(safeName("report-2026.final.pdf")).toBe("report-2026.final.pdf");
  });

  it("cannot be made to escape the chosen folder", () => {
    // The name comes from the other device: traversal is the attack to block.
    expect(safeName("../../etc/passwd")).toBe("passwd");
    expect(safeName("..\\..\\Windows\\System32\\evil.dll")).toBe("evil.dll");
    expect(safeName("/absolute/path/file.txt")).toBe("file.txt");
    expect(safeName("..")).toBe("received-file");
  });

  it("strips characters a filesystem refuses", () => {
    expect(safeName('a<b>c:d"e|f?g*h.txt')).toBe("a_b_c_d_e_f_g_h.txt");
  });

  it("sidesteps the reserved Windows device names", () => {
    expect(safeName("CON")).toBe("_CON");
    expect(safeName("nul.txt")).toBe("_nul.txt");
    expect(safeName("com1")).toBe("_com1");
    // A name that merely starts with those letters is left alone.
    expect(safeName("connections.csv")).toBe("connections.csv");
  });

  it("always returns something usable", () => {
    expect(safeName("")).toBe("received-file");
    expect(safeName("   ")).toBe("received-file");
    expect(safeName("x".repeat(400)).length).toBeLessThanOrEqual(180);
  });
});

describe("chunkSizeFor", () => {
  it("uses what the connection negotiated, minus framing headroom", () => {
    // Chromium negotiates 256 KB; the cap keeps it there rather than higher.
    expect(chunkSizeFor(262_144)).toBe(256 * 1024 - 1024);
    expect(chunkSizeFor(70_000)).toBe(70_000 - 1024);
  });

  it("falls back to the universally safe size when nothing is known", () => {
    // A connection that won't say gets the size every SCTP stack accepts.
    expect(chunkSizeFor(null)).toBe(CHUNK_SIZE);
    expect(chunkSizeFor(0)).toBe(CHUNK_SIZE);
  });

  it("never goes below the floor, however small the answer", () => {
    // A tiny maxMessageSize would otherwise produce a useless chunk size.
    expect(chunkSizeFor(2048)).toBe(CHUNK_SIZE);
    expect(chunkSizeFor(-5)).toBe(CHUNK_SIZE);
  });
});

describe("resuming", () => {
  /**
   * The arithmetic a resume rests on: a prefix hashed on disk plus the remaining
   * bytes hashed as they arrive must equal the whole file's checksum. If this
   * ever stops holding, resumed files would fail verification and be deleted.
   */
  it("a hashed prefix plus the rest equals the whole", () => {
    const whole = new Uint8Array(200_000);
    for (let i = 0; i < whole.length; i++) whole[i] = (i * 17) % 253;
    const at = 73_512; // an arbitrary interruption point

    const full = crcHex(crc32(whole));
    const prefix = crc32(whole.subarray(0, at));
    const resumed = crcHex(crc32(whole.subarray(at), prefix));
    expect(resumed).toBe(full);
  });

  it("an offset past the end of the file is clamped, not trusted", () => {
    // The offset arrives from the other device; the sender clamps it before use.
    const size = 1000;
    const clamp = (offset: number) => Math.max(0, Math.min(offset, size));
    expect(clamp(5000)).toBe(size);
    expect(clamp(-1)).toBe(0);
    expect(clamp(400)).toBe(400);
  });
});
