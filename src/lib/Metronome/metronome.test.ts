import { describe, expect, it } from "vitest";
import {
  barAudible,
  barsToTarget,
  clampBpm,
  cycleAccent,
  defaultAccents,
  formatDuration,
  groupsOf,
  planBar,
  pushTap,
  rampBpm,
  rampSeconds,
  TAP_RESET_MS,
  TAP_WINDOW,
  tapBpm,
  tempoMarking,
  type Plan,
} from "./rhythm";
import { DEFAULT_SETTINGS, describeSong, normalizeSettings, normalizeSongs } from "./settings";

describe("tempo", () => {
  it("clamps to the playable range and rounds", () => {
    expect(clampBpm(5)).toBe(20);
    expect(clampBpm(999)).toBe(300);
    expect(clampBpm(119.6)).toBe(120);
    expect(clampBpm(Number.NaN)).toBe(120);
  });

  it("names the band a tempo falls in", () => {
    expect(tempoMarking(30)).toBe("Grave");
    expect(tempoMarking(60)).toBe("Larghetto");
    expect(tempoMarking(100)).toBe("Andante");
    expect(tempoMarking(120)).toBe("Allegro");
    expect(tempoMarking(250)).toBe("Prestissimo");
  });
});

describe("accents", () => {
  it("cycles strong → medium → soft → mute → strong", () => {
    expect(cycleAccent("strong")).toBe("medium");
    expect(cycleAccent("soft")).toBe("mute");
    expect(cycleAccent("mute")).toBe("strong");
  });

  it("groups compound and odd metres the way they are felt", () => {
    expect(groupsOf({ beats: 4, unit: 4 })).toEqual([4]);
    expect(groupsOf({ beats: 6, unit: 8 })).toEqual([3, 3]);
    expect(groupsOf({ beats: 12, unit: 8 })).toEqual([3, 3, 3, 3]);
    expect(groupsOf({ beats: 5, unit: 4 })).toEqual([3, 2]);
    expect(groupsOf({ beats: 7, unit: 8 })).toEqual([2, 2, 3]);
  });

  it("puts strong on one and medium on each later group", () => {
    expect(defaultAccents({ beats: 4, unit: 4 })).toEqual(["strong", "soft", "soft", "soft"]);
    expect(defaultAccents({ beats: 6, unit: 8 })).toEqual([
      "strong", "soft", "soft", "medium", "soft", "soft",
    ]);
    expect(defaultAccents({ beats: 7, unit: 8 })).toEqual([
      "strong", "soft", "medium", "soft", "medium", "soft", "soft",
    ]);
    expect(defaultAccents({ beats: 1, unit: 4 })).toEqual(["strong"]);
  });
});

describe("tap tempo", () => {
  const run = (gaps: number[], start = 1000) => {
    let taps: number[] = [];
    let t = start;
    taps = pushTap(taps, t);
    for (const gap of gaps) taps = pushTap(taps, (t += gap));
    return taps;
  };

  it("needs two taps", () => {
    expect(tapBpm([])).toBeNull();
    expect(tapBpm([1000])).toBeNull();
  });

  it("reads a steady run", () => {
    expect(tapBpm(run([500, 500, 500]))).toBe(120);
    expect(tapBpm(run([600, 600]))).toBe(100);
  });

  it("is not thrown by one stray tap", () => {
    // Three taps at 120 BPM and one late one: the mean would read ~107.
    expect(tapBpm(run([500, 500, 800, 500]))).toBe(120);
  });

  it("starts a new count after a long pause", () => {
    const taps = run([500, 500, TAP_RESET_MS + 1]);
    expect(taps).toHaveLength(1);
    expect(tapBpm(taps)).toBeNull();
  });

  it("keeps a bounded window, so a deliberate change is followed", () => {
    const taps = run([...Array(TAP_WINDOW + 4).fill(1000), ...Array(TAP_WINDOW).fill(500)]);
    expect(taps).toHaveLength(TAP_WINDOW);
    expect(tapBpm(taps)).toBe(120);
  });

  it("ignores a tap that goes backwards in time", () => {
    expect(pushTap([1000, 1500], 1400)).toEqual([1400]);
  });
});

describe("speed ramp", () => {
  const ramp = { from: 80, to: 100, step: 5, everyBars: 2 };

  it("steps up every N bars and holds at the target", () => {
    expect([0, 1, 2, 3, 4, 7, 8, 50].map((bar) => rampBpm(ramp, bar))).toEqual([
      80, 80, 85, 85, 90, 95, 100, 100,
    ]);
  });

  it("never overshoots a target the step does not divide", () => {
    expect(rampBpm({ from: 80, to: 92, step: 5, everyBars: 1 }, 10)).toBe(92);
  });

  it("ramps down when the target is below the start", () => {
    const down = { from: 120, to: 100, step: 10, everyBars: 1 };
    expect([0, 1, 2, 3].map((bar) => rampBpm(down, bar))).toEqual([120, 110, 100, 100]);
  });

  it("knows the bar it arrives on", () => {
    expect(barsToTarget(ramp)).toBe(8);
    expect(rampBpm(ramp, barsToTarget(ramp))).toBe(100);
    expect(rampBpm(ramp, barsToTarget(ramp) - 1)).toBeLessThan(100);
    expect(barsToTarget({ ...ramp, to: 80 })).toBe(0);
  });

  it("times the climb", () => {
    // One 4/4 bar at 60 BPM is four seconds.
    expect(rampSeconds({ from: 60, to: 60, step: 1, everyBars: 1 }, { beats: 4, unit: 4 })).toBe(0);
    expect(rampSeconds({ from: 60, to: 120, step: 60, everyBars: 1 }, { beats: 4, unit: 4 })).toBe(4);
    expect(formatDuration(75)).toBe("1:15");
  });
});

describe("silent bars", () => {
  it("plays N then rests M, repeating", () => {
    const gap = { play: 2, rest: 1 };
    expect([0, 1, 2, 3, 4, 5, 6].map((bar) => barAudible(gap, bar))).toEqual([
      true, true, false, true, true, false, true,
    ]);
  });

  it("always opens with a bar you can hear", () => {
    expect(barAudible({ play: 0, rest: 4 }, 0)).toBe(true);
  });
});

describe("planBar", () => {
  const base: Plan = {
    bpm: 90,
    meter: { beats: 4, unit: 4 },
    accents: defaultAccents({ beats: 4, unit: 4 }),
    subdivision: 1,
    ramp: null,
    gap: null,
  };

  it("uses the set tempo with no practice mode on", () => {
    expect(planBar(base, 12)).toEqual({ bpm: 90, audible: true });
  });

  it("lets the ramp own the tempo and the gap own the sound", () => {
    const plan = { ...base, ramp: { from: 60, to: 80, step: 10, everyBars: 1 }, gap: { play: 1, rest: 1 } };
    expect(planBar(plan, 0)).toEqual({ bpm: 60, audible: true });
    expect(planBar(plan, 1)).toEqual({ bpm: 70, audible: false });
    expect(planBar(plan, 2)).toEqual({ bpm: 80, audible: true });
  });
});

describe("stored settings", () => {
  it("falls back to defaults for garbage", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("x")).toEqual(DEFAULT_SETTINGS);
  });

  it("repairs out-of-range and unknown values", () => {
    const s = normalizeSettings({
      bpm: 900,
      meter: { beats: 11, unit: 16 },
      subdivision: 7,
      sound: "cowbell",
      volume: 4,
      ramp: { from: 1, to: 500, step: 0, everyBars: -3 },
    });
    expect(s.bpm).toBe(300);
    expect(s.meter).toEqual({ beats: 4, unit: 4 });
    expect(s.subdivision).toBe(1);
    expect(s.sound).toBe("click");
    expect(s.volume).toBe(1);
    expect(s.ramp).toEqual({ from: 20, to: 300, step: 1, everyBars: 1 });
  });

  it("fits the accents to the metre", () => {
    const s = normalizeSettings({ meter: { beats: 3, unit: 4 }, accents: ["mute", "strong", "bogus", "soft", "soft"] });
    expect(s.accents).toEqual(["mute", "strong", "soft"]);
  });

  it("drops anything in the song list that is not a song", () => {
    const songs = normalizeSongs([
      { id: "a", name: "Take Five", bpm: 172, meter: { beats: 5, unit: 4 }, subdivision: 1 },
      { name: "no id" },
      42,
    ]);
    expect(songs).toHaveLength(1);
    expect(songs[0].accents).toEqual(defaultAccents({ beats: 5, unit: 4 }));
    expect(describeSong(songs[0])).toBe("172 BPM · 5/4");
    expect(normalizeSongs("nope")).toEqual([]);
  });
});
