import { describe, expect, it } from "vitest";
import {
  bytesPerSecond,
  cameraConstraints,
  CLIP_DEFAULTS,
  clipFilename,
  describeMime,
  displayConstraints,
  extensionFor,
  formatDuration,
  MIME_PREFERENCES,
  pickMimeType,
  stillFilename,
} from "./recorder";

/**
 * Clip.
 *
 * The capture itself needs a real browser and a real screen, so what is tested
 * is the decision-making around it — chiefly the container choice, where
 * getting it wrong produces a file that appears to record fine and will not
 * play back.
 */

/** A browser that supports only the types listed. */
const browser = (...supported: string[]) => (mime: string) => supported.includes(mime);

describe("pickMimeType", () => {
  it("prefers VP9 where everything is available", () => {
    expect(pickMimeType(() => true)).toBe("video/webm;codecs=vp9,opus");
  });

  it("falls back through the list in order", () => {
    expect(pickMimeType(browser("video/webm;codecs=vp8,opus", "video/webm"))).toBe(
      "video/webm;codecs=vp8,opus",
    );
    expect(pickMimeType(browser("video/webm"))).toBe("video/webm");
  });

  it("finds the MP4 that Safari records", () => {
    // Safari supports neither WebM flavour; asking for one throws or produces
    // an unplayable file, so the H.264 string has to be reachable.
    expect(pickMimeType(browser("video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"))).toBe(
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    );
  });

  it("returns null rather than guessing when nothing is supported", () => {
    expect(pickMimeType(() => false)).toBeNull();
  });

  it("treats a browser that throws as a no", () => {
    let calls = 0;
    const throwing = (mime: string) => {
      calls += 1;
      if (mime !== "video/webm") throw new TypeError("nope");
      return true;
    };
    expect(pickMimeType(throwing)).toBe("video/webm");
    expect(calls).toBe(MIME_PREFERENCES.length);
  });

  it("names every preference in words, and gives each an extension", () => {
    for (const mime of MIME_PREFERENCES) {
      expect(describeMime(mime)).not.toBe(mime);
      expect(["webm", "mp4"]).toContain(extensionFor(mime));
    }
    expect(extensionFor("video/mp4;codecs=avc1")).toBe("mp4");
    expect(extensionFor("video/webm;codecs=vp9,opus")).toBe("webm");
    // An unknown type is reported as itself rather than mislabelled.
    expect(describeMime("video/ogg")).toBe("video/ogg");
  });
});

describe("constraints", () => {
  it("asks for the frame rate and the height cap", () => {
    const constraints = displayConstraints({ ...CLIP_DEFAULTS, fps: 60, maxHeight: 720 });
    expect(constraints.video).toMatchObject({ frameRate: { ideal: 60 }, height: { max: 720 } });
  });

  it("omits the height cap entirely when the source's own size is wanted", () => {
    const constraints = displayConstraints({ ...CLIP_DEFAULTS, maxHeight: 0 });
    expect(constraints.video).not.toHaveProperty("height");
  });

  it("asks for screen audio only when the setting wants it", () => {
    expect(displayConstraints({ ...CLIP_DEFAULTS, audio: "mic" }).audio).toBe(false);
    expect(displayConstraints({ ...CLIP_DEFAULTS, audio: "system" }).audio).toBe(true);
    expect(displayConstraints({ ...CLIP_DEFAULTS, audio: "both" }).audio).toBe(true);
  });

  it("asks the camera for the facing wanted, and the mic only when wanted", () => {
    expect(cameraConstraints(CLIP_DEFAULTS, "environment").video).toMatchObject({
      facingMode: "environment",
    });
    expect(cameraConstraints({ ...CLIP_DEFAULTS, audio: "mic" }, "user").audio).toBe(true);
    expect(cameraConstraints({ ...CLIP_DEFAULTS, audio: "system" }, "user").audio).toBe(false);
    expect(cameraConstraints({ ...CLIP_DEFAULTS, audio: "none" }, "user").audio).toBe(false);
  });
});

describe("formatDuration", () => {
  it("reads as a clock at every length", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9_400)).toBe("0:09");
    expect(formatDuration(64_000)).toBe("1:04");
    expect(formatDuration(723_000)).toBe("12:03");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });

  it("does not print rubbish for a duration the browser could not measure", () => {
    // A `MediaRecorder` blob can report Infinity as its duration.
    expect(formatDuration(Infinity)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
  });
});

describe("filenames", () => {
  const recorded = new Date(2026, 8, 2, 21, 5, 7).getTime();

  it("sorts chronologically and is legal on every platform", () => {
    const name = clipFilename({ source: "screen", recorded, mime: "video/webm;codecs=vp9,opus" });
    // Local time, not UTC: a clip recorded in the evening is named for it.
    expect(name).toBe("clip-screen-20260902-210507.webm");
    // Colons are illegal in Windows filenames.
    expect(name).not.toContain(":");
  });

  it("takes its extension from the container it was recorded in", () => {
    expect(clipFilename({ source: "camera", recorded, mime: "video/mp4" })).toMatch(/\.mp4$/);
  });

  it("names a still for the second it was taken at", () => {
    expect(stillFilename({ source: "both", recorded }, 12_400)).toBe("still-both-12s.png");
  });
});

describe("bytesPerSecond", () => {
  it("grows with resolution and frame rate", () => {
    const low = bytesPerSecond({ ...CLIP_DEFAULTS, maxHeight: 720, fps: 15 });
    const high = bytesPerSecond({ ...CLIP_DEFAULTS, maxHeight: 1440, fps: 60 });
    expect(high).toBeGreaterThan(low * 4);
  });

  it("costs something for audio and nothing for silence", () => {
    expect(bytesPerSecond({ ...CLIP_DEFAULTS, audio: "mic" })).toBeGreaterThan(
      bytesPerSecond({ ...CLIP_DEFAULTS, audio: "none" }),
    );
  });

  it("assumes 1080p when no cap is set, rather than reporting nothing", () => {
    expect(bytesPerSecond({ ...CLIP_DEFAULTS, maxHeight: 0 })).toBe(
      bytesPerSecond({ ...CLIP_DEFAULTS, maxHeight: 1080 }),
    );
  });

  it("lands in the right order of magnitude for a screen recording", () => {
    // 1080p30 is a few hundred kilobytes a second — a ten-minute take is
    // hundreds of megabytes, which is the warning this figure exists to give.
    const perSecond = bytesPerSecond(CLIP_DEFAULTS);
    expect(perSecond).toBeGreaterThan(200_000);
    expect(perSecond).toBeLessThan(3_000_000);
  });
});
