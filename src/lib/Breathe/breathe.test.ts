import { describe, expect, it } from "vitest";
import {
  breathsPerMinute,
  clock,
  CUSTOM_ID,
  customPattern,
  cycleSeconds,
  ease,
  findPattern,
  PATTERNS,
  phaseAt,
  previewPoints,
  sessionCycles,
  DEFAULT_CUSTOM,
} from "./patterns";
import { dayKey, lastDays, normalizeHistory, streak, totalMinutes, type Session } from "./history";

const box = PATTERNS.find((p) => p.id === "box")!;
const sigh = PATTERNS.find((p) => p.id === "sigh")!;

describe("patterns", () => {
  it("has unique ids and sensible cycles", () => {
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(PATTERNS.length);
    expect(cycleSeconds(box)).toBe(16);
    expect(breathsPerMinute(PATTERNS.find((p) => p.id === "coherent")!)).toBeCloseTo(5.45, 2);
  });

  it("gives every hold the level before it, so a hold never moves the orb", () => {
    for (const p of PATTERNS) {
      p.phases.forEach((phase, i) => {
        if (phase.kind !== "hold") return;
        const before = p.phases[(i - 1 + p.phases.length) % p.phases.length].level;
        expect(phase.level).toBe(before);
      });
    }
    expect(box.phases.map((p) => p.level)).toEqual([1, 1, 0, 0]);
  });

  it("builds a custom pattern and leaves zero holds out", () => {
    const p = customPattern({ inhale: 4, holdIn: 0, exhale: 8, holdOut: 2 });
    expect(p.phases.map((x) => x.kind)).toEqual(["in", "out", "hold"]);
    expect(p.rhythm).toBe("In 4 · out 8 · hold 2");
    expect(findPattern(CUSTOM_ID, DEFAULT_CUSTOM).id).toBe(CUSTOM_ID);
    expect(findPattern("nope", DEFAULT_CUSTOM)).toBe(PATTERNS[0]);
  });
});

describe("phaseAt — the clock everything is drawn from", () => {
  it("eases in and out", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(0.1)).toBeLessThan(0.1); // slow start
  });

  it("walks a box cycle", () => {
    expect(phaseAt(box, 0)).toMatchObject({ cycle: 0, index: 0, level: 0 });
    expect(phaseAt(box, 2).level).toBeCloseTo(0.5);
    expect(phaseAt(box, 4)).toMatchObject({ index: 1, level: 1 });
    expect(phaseAt(box, 6)).toMatchObject({ index: 1, level: 1, remaining: 2 });
    expect(phaseAt(box, 10).level).toBeCloseTo(0.5);
    expect(phaseAt(box, 13)).toMatchObject({ index: 3, level: 0 });
  });

  it("wraps into the next cycle", () => {
    expect(phaseAt(box, 16)).toMatchObject({ cycle: 1, index: 0 });
    expect(phaseAt(box, 33)).toMatchObject({ cycle: 2, index: 0 });
  });

  it("is continuous across every phase boundary", () => {
    for (const p of PATTERNS) {
      let t = 0;
      for (const phase of p.phases) {
        t += phase.seconds;
        const before = phaseAt(p, t - 1e-6).level;
        const after = phaseAt(p, t + 1e-6).level;
        expect(Math.abs(before - after)).toBeLessThan(1e-3);
      }
    }
  });

  it("tops up past full on the double sigh", () => {
    expect(phaseAt(sigh, 2).level).toBeCloseTo(0.82);
    expect(phaseAt(sigh, 3).level).toBeCloseTo(1.12, 2);
  });
});

describe("sessions", () => {
  it("rounds a length to whole cycles", () => {
    expect(sessionCycles(box, 1)).toBe(4); // 60 / 16 = 3.75
    expect(sessionCycles(box, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(sessionCycles(PATTERNS.find((p) => p.id === "478")!, 1)).toBe(3);
  });

  it("formats a clock", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(185)).toBe("3:05");
  });

  it("draws a preview inside its box", () => {
    const pts = previewPoints(box, 100, 40).split(" ").map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(49);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(40);
    }
  });
});

describe("history", () => {
  const day = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime();
  const s = (at: number, seconds = 180): Session => ({ at, patternId: "box", patternName: "Box", seconds, cycles: 11 });

  it("keys days in local time", () => {
    expect(dayKey(day(2026, 3, 9, 23))).toBe("2026-03-09");
  });

  it("counts a streak ending today or yesterday", () => {
    const now = day(2026, 9, 23, 8);
    const log = [s(day(2026, 9, 20)), s(day(2026, 9, 21)), s(day(2026, 9, 22))];
    expect(streak(log, now)).toBe(3); // today not yet done — not broken
    expect(streak([...log, s(day(2026, 9, 23, 7))], now)).toBe(4);
    expect(streak([s(day(2026, 9, 21))], now)).toBe(0);
    expect(streak([], now)).toBe(0);
  });

  it("counts two sessions in one day once", () => {
    const now = day(2026, 9, 23, 20);
    expect(streak([s(day(2026, 9, 23, 7)), s(day(2026, 9, 23, 19))], now)).toBe(1);
  });

  it("totals and bins minutes", () => {
    const now = day(2026, 9, 23, 20);
    const log = [s(day(2026, 9, 23), 120), s(day(2026, 9, 23, 18), 60), s(day(2026, 9, 21), 300)];
    expect(totalMinutes(log)).toBe(8);
    const days = lastDays(log, 3, now);
    expect(days.map((d) => d.minutes)).toEqual([5, 0, 3]);
    expect(days[2].key).toBe("2026-09-23");
  });

  it("drops what is not a session and sorts by time", () => {
    const out = normalizeHistory([s(200), { at: "x" }, { at: 100, seconds: 0 }, s(100), null]);
    expect(out.map((x) => x.at)).toEqual([100, 200]);
    expect(normalizeHistory("nope")).toEqual([]);
  });
});
