import { describe, expect, it } from "vitest";
import { formatTime, isAudioFile, parseLink, titleFromName } from "./media";
import { ClockSync, correct, driftLabel, expectedPosition, nearestRate } from "./sync";
import { cueAt, parseSubtitles, parseTimestamp } from "./subtitles";
import { encodeFrames, FRAME_CHARS, parseGuest, parseHost, Reassembler, type HostMsg } from "./protocol";
import { HANGOVER_MS, SpeakingDetector } from "./voice";
import { friendlyName } from "./names";
import { clampDelay, cleanOutputs, DEFAULT_TUNE, MAX_DELAY_MS, MAX_OUTPUTS, outputName, toOutputs } from "./outputs";
import type { RoomSnapshot } from "./types";

describe("toOutputs", () => {
  const dev = (deviceId: string, label: string, groupId = deviceId, kind: MediaDeviceKind = "audiooutput") => ({
    deviceId,
    groupId,
    kind,
    label,
  });

  it("drops Chrome's aliases and other kinds, and puts the system's output first", () => {
    const outs = toOutputs([
      dev("default", "Default - Speakers (Realtek)", "g-spk"),
      dev("communications", "Communications - Speakers (Realtek)", "g-spk"),
      dev("bt1", "WH-1000XM5 (Bluetooth)", "g-bt"),
      dev("spk", "Speakers (Realtek)", "g-spk"),
      dev("mic", "Microphone", "g-mic", "audioinput"),
    ]);
    expect(outs.map((o) => o.id)).toEqual(["spk", "bt1"]);
    expect(outs[0]).toMatchObject({ isDefault: true, bluetooth: false });
    expect(outs[1]).toMatchObject({ isDefault: false, bluetooth: true });
  });

  it("names an output the browser left unnamed", () => {
    expect(toOutputs([dev("x", "  ")])[0].label).toBe("Audio output 1");
  });
});

describe("cleanOutputs", () => {
  it("keeps well-formed choices, clamps volume and drops duplicates and aliases", () => {
    expect(
      cleanOutputs([
        { id: "a", label: "Buds", volume: 3 },
        { id: "a", label: "Buds again", volume: 0.5 },
        { id: "default", label: "Default", volume: 1 },
        { id: "b", label: "Speaker" },
        null,
        "junk",
      ]),
    ).toEqual([
      { ...DEFAULT_TUNE, id: "a", label: "Buds", volume: 1 },
      { ...DEFAULT_TUNE, id: "b", label: "Speaker", volume: 1 },
    ]);
  });

  it("keeps each output's tuning, and puts anything out of range back in", () => {
    const [good, bad] = cleanOutputs([
      { id: "a", label: "Buds", name: "  Mum's  ", volume: 0.5, muted: true, delayMs: 123.4, channel: "left", hear: "film", clearVoices: true, night: true },
      { id: "b", label: "Speaker", name: "   ", delayMs: 99999, channel: "surround", hear: "everything", muted: "yes" },
    ]);
    expect(good).toEqual({
      id: "a", label: "Buds", name: "Mum's", volume: 0.5, muted: true, delayMs: 123, channel: "left", hear: "film", clearVoices: true, night: true,
    });
    expect(bad).toEqual({ ...DEFAULT_TUNE, id: "b", label: "Speaker", delayMs: MAX_DELAY_MS });
    expect(outputName(bad)).toBe("Speaker");
    expect(outputName(good)).toBe("Mum's");
  });

  it("clamps a delay to whole milliseconds inside the range", () => {
    expect([clampDelay(-5), clampDelay(12.6), clampDelay(Number.NaN), clampDelay(1e6)]).toEqual([0, 13, 0, MAX_DELAY_MS]);
  });

  it("caps the list and survives something that is not a list", () => {
    const many = Array.from({ length: MAX_OUTPUTS + 3 }, (_, i) => ({ id: `d${i}`, label: "x", volume: 1 }));
    expect(cleanOutputs(many)).toHaveLength(MAX_OUTPUTS);
    expect(cleanOutputs({ id: "a" })).toEqual([]);
  });
});

/**
 * Watch Party's pure half. The networking can only be exercised between real
 * browsers; what is checked here is everything a room decides — what a pasted
 * link becomes, where a player should be, how far off it may drift before it is
 * corrected, and what the host will accept from a guest it does not control.
 */

describe("parseLink", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RD", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads the video id out of %s", (link, id) => {
    const parsed = parseLink(link);
    expect(parsed).toMatchObject({ ok: true, kind: "youtube", src: id });
  });

  it("refuses a YouTube link that is not one video", () => {
    expect(parseLink("https://www.youtube.com/@somechannel")).toMatchObject({ ok: false });
  });

  it("takes a direct media link and names it after the file", () => {
    const parsed = parseLink("https://example.com/films/Big.Buck.Bunny.mp4?sig=1");
    expect(parsed).toMatchObject({ ok: true, kind: "url", title: "Big Buck Bunny", audio: false });
  });

  it("knows an audio link is music", () => {
    expect(parseLink("https://example.com/a/song%20one.mp3")).toMatchObject({
      ok: true,
      audio: true,
      title: "song one",
    });
  });

  it("refuses web pages, playlists and non-web schemes with a reason", () => {
    for (const link of ["https://example.com/watch/123", "https://x.com/live.m3u8", "javascript:alert(1)", "ftp://x.com/a.mp4"]) {
      const parsed = parseLink(link);
      expect(parsed.ok, link).toBe(false);
      if (!parsed.ok) expect(parsed.reason.length).toBeGreaterThan(10);
    }
  });
});

describe("media helpers", () => {
  it("formats times the way players do", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(3723)).toBe("1:02:03");
    expect(formatTime(null)).toBe("–:––");
  });

  it("tidies a file name into a title", () => {
    expect(titleFromName("My_Holiday.Movie.2024.mkv")).toBe("My Holiday Movie 2024");
  });

  it("tells music from video by type, then by name", () => {
    expect(isAudioFile({ type: "audio/mpeg", name: "x" })).toBe(true);
    expect(isAudioFile({ type: "", name: "track.flac" })).toBe(true);
    expect(isAudioFile({ type: "video/mp4", name: "x.mp3" })).toBe(false);
  });
});

describe("the shared clock", () => {
  it("extrapolates a playing line and holds a paused one", () => {
    const playing = { status: "playing" as const, position: 10, rate: 1.5, at: 1000 };
    expect(expectedPosition(playing, 3000)).toBeCloseTo(13);
    expect(expectedPosition({ ...playing, status: "paused" }, 9000)).toBe(10);
  });

  it("trusts the sample with the shortest round trip", () => {
    const clock = new ClockSync();
    // Host clock is 5000 ms ahead. A slow, lopsided sample is badly off…
    clock.add(0, 5000 + 300, 400);
    // …a fast one is nearly exact, and wins.
    clock.add(1000, 6000 + 10, 1020);
    expect(clock.offset).toBeCloseTo(5000, -1);
    expect(clock.rtt).toBe(20);
  });
});

describe("correct", () => {
  it("leaves a player alone when it is in step", () => {
    expect(correct(10.03, 10, 1, "element")).toEqual({ kind: "ok", rate: 1 });
  });

  it("slows a player that is a little ahead, and speeds one that is behind", () => {
    const ahead = correct(10.4, 10, 1, "element");
    const behind = correct(9.6, 10, 1, "element");
    expect(ahead.kind).toBe("rate");
    expect(behind.kind).toBe("rate");
    if (ahead.kind === "rate") expect(ahead.rate).toBeLessThan(1);
    if (behind.kind === "rate") expect(behind.rate).toBeGreaterThan(1);
  });

  it("never pushes the rate more than ten percent", () => {
    const c = correct(10.95, 10, 1, "element");
    expect(c.kind === "rate" && c.rate).toBeCloseTo(0.9);
  });

  it("seeks when the gap is too big to close by ear", () => {
    expect(correct(4, 10, 1, "element")).toEqual({ kind: "seek", to: 10 });
  });

  it("only ever seeks YouTube, which has no fine rates", () => {
    expect(correct(10.5, 10, 1, "youtube")).toEqual({ kind: "ok", rate: 1 });
    expect(correct(11, 10, 1, "youtube")).toEqual({ kind: "seek", to: 10 });
  });

  it("labels drift in words", () => {
    expect(driftLabel(0.05)).toBe("in sync");
    expect(driftLabel(-1.24)).toBe("1.2s behind");
    expect(driftLabel(null)).toBe("");
  });

  it("snaps to the rates YouTube offers", () => {
    expect(nearestRate(1.1, [0.5, 1, 1.25, 1.5])).toBe(1);
    expect(nearestRate(1.2, [0.5, 1, 1.25, 1.5])).toBe(1.25);
  });
});

describe("subtitles", () => {
  it("reads timestamps in every shape", () => {
    expect(parseTimestamp("01:02:03,456")).toBeCloseTo(3723.456);
    expect(parseTimestamp("02:03.5")).toBeCloseTo(123.5);
    expect(parseTimestamp("nope")).toBeNull();
  });

  it("parses SRT with CRLF, a BOM, tags and positioning codes", () => {
    const srt =
      "﻿1\r\n00:00:01,000 --> 00:00:03,500\r\n{\\an8}<i>Hello</i> there\r\n\r\n" +
      "2\r\n00:00:04,000 --> 00:00:05,000\r\nSecond &amp; last\r\nline two\r\n";
    expect(parseSubtitles(srt)).toEqual([
      { start: 1, end: 3.5, text: "Hello there" },
      { start: 4, end: 5, text: "Second & last\nline two" },
    ]);
  });

  it("parses WebVTT, skipping the header, notes and cue settings", () => {
    const vtt =
      "WEBVTT - film\n\nNOTE made by hand\n\nintro\n00:01.000 --> 00:02.000 align:start line:0\n<v Sam>Hi\n\n" +
      "00:00:02.500 --> 00:00:04.000\nBye\n";
    expect(parseSubtitles(vtt)).toEqual([
      { start: 1, end: 2, text: "Hi" },
      { start: 2.5, end: 4, text: "Bye" },
    ]);
  });

  it("finds the lines on screen, overlaps included", () => {
    const cues = [
      { start: 1, end: 5, text: "A" },
      { start: 3, end: 4, text: "B" },
      { start: 6, end: 7, text: "C" },
    ];
    expect(cueAt(cues, 0.5)).toBe("");
    expect(cueAt(cues, 3.5)).toBe("A\nB");
    expect(cueAt(cues, 4.5)).toBe("A");
    expect(cueAt(cues, 6)).toBe("C");
    expect(cueAt(cues, 8)).toBe("");
  });
});

describe("protocol", () => {
  it("accepts what a guest may say", () => {
    expect(parseGuest({ t: "chat", text: "hi" })).toEqual({ t: "chat", text: "hi" });
    expect(parseGuest({ t: "control", action: "seek", position: 12 })).toEqual({
      t: "control",
      action: "seek",
      position: 12,
    });
    expect(parseGuest({ t: "react", emoji: "🔥" })).toEqual({ t: "react", emoji: "🔥" });
  });

  it("refuses anything outside the rules", () => {
    expect(parseGuest({ t: "chat", text: "   " })).toBeNull();
    expect(parseGuest({ t: "react", emoji: "<img src=x>" })).toBeNull();
    expect(parseGuest({ t: "control", action: "seek", position: -1 })).toBeNull();
    expect(parseGuest({ t: "control", action: "rate", rate: 16 })).toBeNull();
    expect(parseGuest({ t: "stat", rtt: 1, drift: 0, buffering: "yes", mode: "sync" })).toBeNull();
    expect(parseGuest({ t: "welcome" })).toBeNull();
    expect(parseGuest("chat")).toBeNull();
  });

  it("drops a host message whose room is malformed", () => {
    expect(parseHost({ t: "room", room: { name: "x" } })).toBeNull();
    const room: RoomSnapshot = {
      name: "Film night",
      members: [{ id: "a", name: "Asha", slot: 0, host: true, mic: false }],
      status: {},
      settings: { guestControl: true, guestQueue: true, voteSkip: true },
      now: null,
      queue: [],
      history: [],
      playback: { status: "paused", position: 0, rate: 1, at: 0 },
      skipVotes: [],
    };
    expect(parseHost({ t: "room", room })).toEqual({ t: "room", room });
  });

  it("sends a small message as one frame", () => {
    expect(encodeFrames({ t: "pong", t0: 1, h: 2 })).toHaveLength(1);
  });

  it("cuts a large message into pieces and puts it back together in any order", () => {
    const cues = Array.from({ length: 900 }, (_, i) => ({ start: i, end: i + 1, text: `line ${i} `.repeat(4) }));
    const message: HostMsg = { t: "subs", subs: { itemId: "x", cues } };
    const frames = encodeFrames(message);
    expect(frames.length).toBeGreaterThan(1);
    for (const f of frames) expect(f.length).toBeLessThan(FRAME_CHARS + 200);

    const r = new Reassembler();
    const shuffled = [...frames].reverse();
    const results = shuffled.map((f) => r.accept(f));
    expect(results.slice(0, -1).every((v) => v === null)).toBe(true);
    expect(results.at(-1)).toEqual(message);
  });

  it("ignores garbage and impossible pieces", () => {
    const r = new Reassembler();
    expect(r.accept("not json")).toBeNull();
    expect(r.accept(JSON.stringify({ t: "piece", id: "a", i: 5, n: 2, d: "x" }))).toBeNull();
    expect(r.accept(JSON.stringify({ t: "piece", id: "a", i: 0, n: 1e9, d: "x" }))).toBeNull();
  });
});

describe("SpeakingDetector", () => {
  it("lights up on speech and holds through a short pause", () => {
    const d = new SpeakingDetector();
    expect(d.update(new Map([["a", -30], ["b", -70]]), 0)).toEqual(["a"]);
    expect(d.update(new Map([["a", -70], ["b", -70]]), HANGOVER_MS - 100)).toEqual(["a"]);
    expect(d.update(new Map([["a", -70], ["b", -70]]), HANGOVER_MS + 100)).toEqual([]);
  });

  it("forgets someone whose microphone has gone", () => {
    const d = new SpeakingDetector();
    d.update(new Map([["a", -20]]), 0);
    expect(d.update(new Map(), 10)).toEqual([]);
  });
});

describe("friendlyName", () => {
  it("makes a two-word name, stable for the same rolls", () => {
    const rolls = [0.05, 0.95];
    const name = friendlyName(() => rolls.shift() ?? 0);
    expect(name).toBe("Happy Lynx");
    expect(friendlyName()).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});
