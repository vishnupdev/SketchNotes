import { describe, expect, it } from "vitest";
import { CRON_ALIASES, nextRuns, parseCron } from "./cron";
import { formatDuration, parseDuration } from "./duration";
import { dayOfYear, isoWeek, localIso, parseTimestamp } from "./epoch";

/**
 * Chrono.
 *
 * The three parsers here fail in ways that look like success, which is the reason
 * to test them at all: a cron field that silently matches nothing, a timestamp
 * read in the wrong unit (putting you in 1970), and a duration where a typo'd
 * unit is quietly counted as zero. Each of those has a case below.
 */

describe("parseCron", () => {
  it("parses the ordinary shapes", () => {
    const every5 = parseCron("*/5 * * * *");
    expect(every5.ok).toBe(true);
    if (!every5.ok) return;
    expect(every5.spec.minute.values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(every5.spec.hour.wildcard).toBe(true);
  });

  it("accepts ranges, lists, and a step inside a range", () => {
    const r = parseCron("0 9-17/4 * * 1-5");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.hour.values).toEqual([9, 13, 17]);
    expect(r.spec.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
  });

  it("reads month and day names", () => {
    const r = parseCron("0 0 1 JAN,jul SUN");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.month.values).toEqual([1, 7]);
    expect(r.spec.dayOfWeek.values).toEqual([0]);
  });

  it("normalises Sunday-as-7 onto 0", () => {
    const r = parseCron("0 0 * * 7");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.dayOfWeek.values).toEqual([0]);
  });

  it("expands every @-shorthand to five fields", () => {
    for (const alias of Object.keys(CRON_ALIASES)) {
      const r = parseCron(alias);
      expect(r.ok, alias).toBe(true);
    }
    const daily = parseCron("@daily");
    if (!daily.ok) throw new Error("expected @daily to parse");
    expect(daily.spec.hour.values).toEqual([0]);
    expect(daily.spec.minute.values).toEqual([0]);
  });

  it("rejects the wrong number of fields, saying how many", () => {
    const r = parseCron("* * *");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("3 of 5");
  });

  it("rejects out-of-range values and backwards ranges", () => {
    expect(parseCron("60 * * * *").ok).toBe(false);
    expect(parseCron("* 25 * * *").ok).toBe(false);
    expect(parseCron("0 0 * * *").ok).toBe(true);
    const backwards = parseCron("0 17-9 * * *");
    expect(backwards.ok).toBe(false);
    if (backwards.ok) return;
    expect(backwards.error).toContain("backwards");
  });

  it("describes a wall-clock time as a time, not as field values", () => {
    const r = parseCron("30 14 * * *");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("14:30");
  });

  it("spells out the day-of-month / day-of-week either-or rule", () => {
    const r = parseCron("0 0 13 * 5");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("either/or");
  });

  it("calls a full-coverage step 'every n', not 'every n up to the last one'", () => {
    // 0,15,30,45 reaches 45 + 15 = 60, which is the whole field. Describing the
    // commonest cron pattern of all as "every 15 up to 45" was an off-by-one.
    const r = parseCron("*/15 * * * *");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("Every 15 minutes");
    expect(r.description).not.toContain("up to");
  });

  it("describes a contiguous run as a range rather than listing it", () => {
    // "9, 10, 11, 12, 13, 14, 15, 16 and 17" is correct and unreadable.
    const r = parseCron("0 9-17 * * *");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("Hourly from 09:00 to 17:00");
    expect(r.description).not.toContain("11, 12");
  });

  it("names the days of a weekday range instead of numbering them", () => {
    const r = parseCron("0 9 * * 1-5");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("Monday to Friday");
  });

  it("still lists a genuinely irregular set", () => {
    const r = parseCron("0 0 1,15,28 * *");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("1, 15 and 28");
  });

  it("keeps a partial step honest about where it stops", () => {
    // 0,10,20,30 stops at 30; 30 + 10 = 40, well short of 60.
    const r = parseCron("0-30/10 * * * *");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toContain("up to 30");
  });
});

describe("nextRuns", () => {
  it("finds the next times for a daily job", () => {
    // A Wednesday, 10:00 local.
    const from = new Date(2026, 0, 14, 10, 0, 0);
    const r = parseCron("0 3 * * *");
    if (!r.ok) throw new Error("expected a parse");

    const runs = nextRuns(r.spec, from, 3);
    expect(runs).toHaveLength(3);
    expect(runs[0].getDate()).toBe(15); // 03:00 today has passed
    expect(runs[0].getHours()).toBe(3);
    expect(runs[1].getDate()).toBe(16);
    expect(runs[2].getDate()).toBe(17);
  });

  it("skips a time that has already passed today", () => {
    const from = new Date(2026, 0, 14, 10, 30, 0);
    const r = parseCron("0 10,11 * * *");
    if (!r.ok) throw new Error("expected a parse");

    const runs = nextRuns(r.spec, from, 1);
    expect(runs[0].getHours()).toBe(11);
    expect(runs[0].getDate()).toBe(14);
  });

  it("honours the either-or rule when both day fields are set", () => {
    // The 1st, or any Friday. January 2026: the 1st is a Thursday, 2nd a Friday.
    const from = new Date(2026, 0, 1, 12, 0, 0);
    const r = parseCron("0 0 1 * 5");
    if (!r.ok) throw new Error("expected a parse");

    const runs = nextRuns(r.spec, from, 2);
    expect(runs[0].getDate()).toBe(2); // Friday
    expect(runs[0].getDay()).toBe(5);
    expect(runs[1].getDate()).toBe(9); // the following Friday
  });

  it("restricts to the months named", () => {
    const from = new Date(2026, 0, 14, 10, 0, 0);
    const r = parseCron("0 0 1 7 *");
    if (!r.ok) throw new Error("expected a parse");

    const runs = nextRuns(r.spec, from, 2);
    expect(runs[0].getMonth()).toBe(6); // July
    expect(runs[0].getFullYear()).toBe(2026);
    expect(runs[1].getFullYear()).toBe(2027);
  });

  it("returns nothing, rather than hanging, for a date that never comes", () => {
    const r = parseCron("0 0 30 2 *"); // 30 February
    if (!r.ok) throw new Error("expected a parse");
    expect(nextRuns(r.spec, new Date(2026, 0, 1), 5)).toEqual([]);
  });
});

describe("parseDuration", () => {
  it("reads unit-suffixed parts in any order", () => {
    expect(parseDuration("1h 20m")).toEqual({ ok: true, ms: 4_800_000 });
    expect(parseDuration("20m1h")).toEqual({ ok: true, ms: 4_800_000 });
    expect(parseDuration("2 days 3 hours")).toEqual({ ok: true, ms: 183_600_000 });
  });

  it("reads a bare number as minutes", () => {
    expect(parseDuration("90")).toEqual({ ok: true, ms: 5_400_000 });
  });

  it("reads clock notation, three parts as h:m:s and two as m:s", () => {
    expect(parseDuration("01:20:30")).toEqual({ ok: true, ms: 4_830_000 });
    expect(parseDuration("2:30")).toEqual({ ok: true, ms: 150_000 });
  });

  it("allows a negative total, so subtracting needs no extra control", () => {
    const r = parseDuration("-2h");
    expect(r.ok && r.ms).toBe(-7_200_000);
  });

  it("reports a mistyped unit instead of counting it as zero", () => {
    const r = parseDuration("2 huors");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("huors");
  });

  it("refuses an empty or wordless input", () => {
    expect(parseDuration("").ok).toBe(false);
    expect(parseDuration("soon").ok).toBe(false);
  });
});

describe("formatDuration", () => {
  it("uses the largest units that fit, capped at three parts", () => {
    expect(formatDuration(4_830_000)).toBe("1 hour, 20 minutes, 30 seconds");
    expect(formatDuration(90_000, { compact: true })).toBe("1m 30s");
  });

  it("singularises", () => {
    expect(formatDuration(1000)).toBe("1 second");
    expect(formatDuration(2000)).toBe("2 seconds");
  });

  it("keeps zero readable rather than empty", () => {
    expect(formatDuration(0)).toBe("0 milliseconds");
  });

  it("keeps a negative duration signed", () => {
    expect(formatDuration(-60_000)).toBe("-1 minute");
  });
});

describe("parseTimestamp", () => {
  it("tells seconds from milliseconds by digit count", () => {
    expect(parseTimestamp("1700000000")?.ms).toBe(1_700_000_000_000);
    expect(parseTimestamp("1700000000000")?.ms).toBe(1_700_000_000_000);
  });

  it("reads micro- and nanosecond stamps", () => {
    expect(parseTimestamp("1700000000000000")?.ms).toBe(1_700_000_000_000);
    expect(parseTimestamp("1700000000000000000")?.ms).toBe(1_700_000_000_000);
  });

  it("says which unit it used, so a wrong guess is visible", () => {
    expect(parseTimestamp("1700000000")?.readAs).toContain("seconds");
    expect(parseTimestamp("1700000000000")?.readAs).toContain("milliseconds");
  });

  it("parses date strings", () => {
    expect(parseTimestamp("2026-01-14T10:00:00Z")?.ms).toBe(Date.UTC(2026, 0, 14, 10));
  });

  it("returns null for nonsense", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not a date")).toBeNull();
  });
});

describe("epoch helpers", () => {
  it("writes a local ISO string with the real offset", () => {
    const d = new Date(2026, 0, 14, 9, 5, 0);
    // Shape, not value: the offset depends on where the test runs.
    expect(localIso(d)).toMatch(/^2026-01-14T09:05:00[+-]\d{2}:\d{2}$/);
  });

  it("counts the day of the year across a leap year", () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2024, 11, 31))).toBe(366);
  });

  it("numbers ISO weeks by the first-Thursday rule", () => {
    // 1 Jan 2026 is a Thursday, so it is in week 1.
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    // 1 Jan 2027 is a Friday: week 53 of 2026, not week 1.
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
  });
});

describe("describeCron phrasing", () => {
  it("leads with the cadence when the minutes are a step", () => {
    const r = parseCron("*/15 9-17 * * 1-5");
    if (!r.ok) throw new Error("expected a parse");
    expect(r.description).toBe(
      "Every 15 minutes, between 09:00 and 17:45, on Monday to Friday.",
    );
  });
});
