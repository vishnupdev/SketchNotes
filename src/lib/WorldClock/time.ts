/**
 * Time-zone maths for the World Clock, built entirely on `Intl.DateTimeFormat`.
 *
 * Nothing here stores a fixed UTC offset. Offsets are read back out of `Intl`
 * for the instant being displayed, so daylight saving, half-hour zones
 * (India's +05:30), quarter-hour zones (Nepal's +05:45) and mid-year rule
 * changes are all handled by the platform's own tz database rather than by a
 * table we would have to keep patched.
 *
 * `Intl.DateTimeFormat` construction is comparatively expensive and the clock
 * re-renders every second across a dozen cities, so every formatter is built
 * once and cached by the options that define it.
 */

/** Broad time-of-day band, used to tint a clock card and pick its glyph. */
export type DayPhase = "night" | "dawn" | "day" | "dusk";

/** The pieces of a zoned timestamp the UI renders separately. */
export interface ZonedTime {
  /** 0–23, always, regardless of the display preference. */
  hour: number;
  minute: number;
  second: number;
  /** Calendar day-of-month in that zone. */
  day: number;
  /** 1–12. */
  month: number;
  year: number;
  /** 0 = Sunday, matching `Date#getDay`. */
  weekday: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
const labelCache = new Map<string, Intl.DateTimeFormat>();

/** A cached formatter; `key` must capture every option that varies. */
function formatter(
  cache: Map<string, Intl.DateTimeFormat>,
  key: string,
  build: () => Intl.DateTimeFormat,
): Intl.DateTimeFormat {
  let f = cache.get(key);
  if (!f) {
    f = build();
    cache.set(key, f);
  }
  return f;
}

/**
 * Whether a string is an IANA zone this browser accepts. Guards against a
 * persisted pin from an older catalog, or a platform with a trimmed tz set.
 */
export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Legacy tz names still reported by browsers, mapped to the current ones.
 *
 * Chrome resolves an Indian visitor's zone as "Asia/Calcutta" and a Ukrainian
 * one as "Europe/Kiev" — names the tz database itself renamed years ago. Both
 * spellings resolve to the same rules, so this only affects what the reader
 * sees and whether the zone matches a city in our catalog. Showing someone a
 * name their country stopped using is a small thing that reads as neglect.
 */
const ZONE_ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Istanbul": "Europe/Istanbul",
  "Europe/Kiev": "Europe/Kyiv",
  "Europe/Nicosia": "Asia/Nicosia",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Pacific/Ponape": "Pacific/Pohnpei",
};

/** The modern name for a zone, where the platform reports an old alias. */
export const canonicalZone = (zone: string): string => ZONE_ALIASES[zone] ?? zone;

/** The visitor's own IANA zone, falling back to UTC where unavailable. */
export function localZone(): string {
  try {
    return canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  } catch {
    return "UTC";
  }
}

/** Break an instant into the wall-clock fields it shows in a given zone. */
export function zonedTime(date: Date, zone: string): ZonedTime {
  const f = formatter(partsCache, zone, () =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      // hourCycle h23 keeps midnight at 0 rather than the 24 some locales emit.
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    }),
  );

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: Record<string, string> = {};
  for (const part of f.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }

  return {
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    day: Number(out.day),
    month: Number(out.month),
    year: Number(out.year),
    weekday: Math.max(0, WEEKDAYS.indexOf(out.weekday)),
  };
}

/**
 * A zone's UTC offset in minutes at a given instant (e.g. 330 for IST, -300 for
 * New York in winter). Derived by reading the zone's wall-clock fields back as
 * if they were UTC and diffing against the real instant — the standard trick,
 * and the only one that stays correct across DST boundaries.
 */
export function zoneOffsetMinutes(date: Date, zone: string): number {
  const t = zonedTime(date, zone);
  const asUtc = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  // Drop sub-second precision on both sides so the difference lands on a whole
  // minute rather than inheriting the instant's milliseconds.
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/** "UTC+05:30", "UTC−04:00", "UTC" — the offset written out. */
export function offsetLabel(minutes: number): string {
  if (minutes === 0) return "UTC";
  // U+2212 minus, not a hyphen: it aligns with digits and reads as a sign.
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

/**
 * How far a zone is from the visitor's own, in their words: "3 hours ahead",
 * "1½ hours behind", "same time as you".
 */
export function relativeOffsetLabel(deltaMinutes: number): string {
  if (deltaMinutes === 0) return "Same time as you";

  const ahead = deltaMinutes > 0;
  const abs = Math.abs(deltaMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;

  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m) parts.push(`${m} min`);

  return `${parts.join(" ")} ${ahead ? "ahead" : "behind"}`;
}

/** Compact form of the same thing, for a card corner: "+5:30", "−4", "0". */
export function shortOffsetLabel(deltaMinutes: number): string {
  if (deltaMinutes === 0) return "±0";
  const sign = deltaMinutes < 0 ? "−" : "+";
  const abs = Math.abs(deltaMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m ? `${sign}${h}:${String(m).padStart(2, "0")}` : `${sign}${h}`;
}

/**
 * Which calendar day a zone is on relative to the visitor's: -1, 0 or +1.
 * This is what lets a card say "Tomorrow" — the single most useful thing a
 * world clock can tell you, and the thing offsets alone never make obvious.
 */
export function dayDelta(here: ZonedTime, there: ZonedTime): number {
  const a = Date.UTC(here.year, here.month - 1, here.day);
  const b = Date.UTC(there.year, there.month - 1, there.day);
  return Math.round((b - a) / 86_400_000);
}

/** "Today" / "Tomorrow" / "Yesterday" for a day delta, or null when it's today. */
export function dayDeltaLabel(delta: number): string | null {
  if (delta === 0) return null;
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return delta > 0 ? `+${delta} days` : `${delta} days`;
}

/**
 * Time-of-day band. Deliberately coarse and fixed rather than solar: the point
 * is to answer "is it a reasonable hour to call?" at a glance, and a real
 * sunrise calculation would need coordinates the catalog doesn't carry.
 */
export function dayPhase(hour: number): DayPhase {
  if (hour >= 6 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

/** Plain-language read on whether it's a sociable hour to make contact. */
export function callWindow(hour: number): { label: string; ok: boolean } {
  if (hour >= 9 && hour < 18) return { label: "Working hours", ok: true };
  if (hour >= 7 && hour < 9) return { label: "Early morning", ok: true };
  if (hour >= 18 && hour < 22) return { label: "Evening", ok: true };
  return { label: "Asleep — avoid calling", ok: false };
}

/** Zero-padded "HH:MM" (or "H:MM" in 12-hour form) plus the meridiem, split so
 *  the UI can size the AM/PM down without re-parsing a formatted string. */
export function clockFace(t: ZonedTime, hour12: boolean): { time: string; suffix: string | null } {
  const mm = String(t.minute).padStart(2, "0");
  if (!hour12) return { time: `${String(t.hour).padStart(2, "0")}:${mm}`, suffix: null };
  const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
  return { time: `${h}:${mm}`, suffix: t.hour < 12 ? "AM" : "PM" };
}

/** Long date in a zone, e.g. "Mon, 11 Aug 2025". */
export function zonedDateLabel(date: Date, zone: string): string {
  const f = formatter(labelCache, `date:${zone}`, () =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  );
  return f.format(date);
}

/**
 * The zone's own abbreviation for this instant — "IST", "GMT+1", "PDT". Reads
 * it off `Intl` rather than a lookup table, so it follows DST automatically.
 * Returns null if the platform declines to name it.
 */
export function zoneAbbreviation(date: Date, zone: string): string | null {
  const f = formatter(labelCache, `abbr:${zone}`, () =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }),
  );
  const part = f.formatToParts(date).find((p) => p.type === "timeZoneName");
  return part?.value ?? null;
}

/** Whether the zone is currently observing daylight saving time. */
export function isDaylightSaving(date: Date, zone: string): boolean {
  // January and July bracket the year; the smaller offset is standard time in
  // both hemispheres, so a current offset above that minimum means DST is on.
  const year = zonedTime(date, zone).year;
  const jan = zoneOffsetMinutes(new Date(Date.UTC(year, 0, 1, 12)), zone);
  const jul = zoneOffsetMinutes(new Date(Date.UTC(year, 6, 1, 12)), zone);
  if (jan === jul) return false;
  return zoneOffsetMinutes(date, zone) > Math.min(jan, jul);
}

/** Human name for an IANA zone: "Asia/Kolkata" → "Asia / Kolkata". */
export function zoneDisplayName(zone: string): string {
  return zone.replace(/_/g, " ").replace(/\//g, " / ");
}
