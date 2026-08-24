import { describe, expect, it } from "vitest";
import { advanceRepeat } from "./types";

/**
 * Repeat arithmetic.
 *
 * Tested for one specific reason: this logic now exists **twice** — here, and in
 * `public/sw.js`, which fires reminders while the workspace is closed and cannot
 * import from `src/`. If the two ever disagree, a repeating reminder gets a
 * different next occurrence depending on whether a tab happened to be open,
 * which is close to impossible to diagnose from the symptom.
 *
 * The calendar cases are the ones worth pinning: months are not 30 days, and
 * daylight-saving days are not 24 hours, which is why both implementations use
 * `Date` arithmetic rather than adding milliseconds.
 */
describe("advanceRepeat", () => {
  const at = (iso: string) => new Date(iso).getTime();

  it("moves a daily reminder to the same time tomorrow", () => {
    const next = advanceRepeat(at("2026-03-10T09:30:00"), "daily");
    expect(new Date(next).getDate()).toBe(11);
    expect(new Date(next).getHours()).toBe(9);
    expect(new Date(next).getMinutes()).toBe(30);
  });

  it("moves a weekly reminder to the same weekday", () => {
    const start = at("2026-03-10T09:30:00");
    const next = advanceRepeat(start, "weekly");
    expect(new Date(next).getDay()).toBe(new Date(start).getDay());
    expect(next - start).toBeGreaterThan(6 * 24 * 3600 * 1000);
  });

  it("moves a monthly reminder by a calendar month, not 30 days", () => {
    const next = advanceRepeat(at("2026-01-31T09:00:00"), "monthly");
    // JavaScript rolls 31 February into early March; what matters is that the
    // month advanced rather than a fixed 30 days being added.
    expect(new Date(next).getMonth()).toBeGreaterThan(0);
    const feb = advanceRepeat(at("2026-02-15T09:00:00"), "monthly");
    expect(new Date(feb).getMonth()).toBe(2);
    expect(new Date(feb).getDate()).toBe(15);
  });

  it("nudges a non-repeating reminder forward rather than looping", () => {
    const start = at("2026-03-10T09:30:00");
    // "none" should never be advanced, but a caller that does must not get the
    // same timestamp back — that would spin the scheduler.
    expect(advanceRepeat(start, "none")).toBeGreaterThan(start);
  });
});
