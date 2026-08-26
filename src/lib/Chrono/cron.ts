/**
 * Cron expressions: parse, explain in English, and work out when they next fire.
 *
 * Five fields — minute, hour, day-of-month, month, day-of-week — each parsed into
 * the explicit set of values it allows. Doing it that way rather than keeping the
 * expression as text is what makes both halves of this module easy: explaining a
 * field is describing its set, and finding the next run is searching for a time
 * whose parts are all members.
 *
 * Two details of real cron that a naive implementation gets wrong, and that this
 * one handles deliberately:
 *
 *  - **Day-of-month and day-of-week are OR, not AND**, but only when *both* are
 *    restricted. `0 0 13 * 5` fires on the 13th *and* on every Friday, which is
 *    the single most surprising rule in cron and the reason "Friday the 13th"
 *    cron jokes do not work. When either field is `*` the other simply applies.
 *  - **Sunday is both 0 and 7.** Expressions in the wild use each.
 */

export interface CronField {
  /** Every value this field admits, ascending. */
  values: number[];
  /** True when the field was `*` — needed for the day-of-month/week OR rule. */
  wildcard: boolean;
  /** The text as written, for the explanation. */
  source: string;
}

export interface CronSpec {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export type CronParse =
  | { ok: true; spec: CronSpec; description: string }
  | { ok: false; error: string };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MONTH_ALIASES: Record<string, number> = Object.fromEntries(
  MONTH_NAMES.map((name, i) => [name.slice(0, 3).toLowerCase(), i + 1]),
);

const DAY_ALIASES: Record<string, number> = Object.fromEntries(
  DAY_NAMES.map((name, i) => [name.slice(0, 3).toLowerCase(), i]),
);

/** The `@`-shorthands every cron implementation accepts. */
export const CRON_ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  aliases?: Record<string, number>;
}

const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, aliases: MONTH_ALIASES },
  { name: "day of week", min: 0, max: 7, aliases: DAY_ALIASES },
];

/** Resolve a number or a three-letter name to its numeric value. */
function readValue(token: string, field: FieldSpec): number | null {
  const alias = field.aliases?.[token.toLowerCase().slice(0, 3)];
  if (alias !== undefined) return alias;
  if (!/^\d+$/.test(token)) return null;
  return Number(token);
}

/** Parse one comma-separated field into its allowed values. */
function parseField(source: string, field: FieldSpec): CronField | string {
  const wildcard = source === "*";
  const found = new Set<number>();

  for (const part of source.split(",")) {
    if (!part) return `The ${field.name} field has an empty item.`;

    // Split a trailing step off first: "*/5", "1-30/2" and "5/10" all take one.
    const [rangePart, stepPart, ...extra] = part.split("/");
    if (extra.length > 0) return `The ${field.name} field has more than one "/" in "${part}".`;

    let step = 1;
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) < 1) {
        return `"${stepPart}" is not a valid step in the ${field.name} field.`;
      }
      step = Number(stepPart);
    }

    let start: number;
    let end: number;

    if (rangePart === "*") {
      start = field.min;
      end = field.max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-");
      const from = readValue(a, field);
      const to = readValue(b, field);
      if (from === null || to === null) return `"${rangePart}" is not a valid range in the ${field.name} field.`;
      if (from > to) return `The ${field.name} range "${rangePart}" runs backwards.`;
      start = from;
      end = to;
    } else {
      const single = readValue(rangePart, field);
      if (single === null) return `"${rangePart}" is not valid in the ${field.name} field.`;
      start = single;
      // A bare value with a step means "from here to the end of the field",
      // which is how "5/10" is read everywhere.
      end = stepPart === undefined ? single : field.max;
    }

    if (start < field.min || end > field.max) {
      return `The ${field.name} must be between ${field.min} and ${field.max}.`;
    }

    for (let v = start; v <= end; v += step) found.add(v);
  }

  if (found.size === 0) return `The ${field.name} field matches nothing.`;

  // Sunday is written as both 0 and 7; normalise to 0 so matching is one test.
  if (field.name === "day of week" && found.delete(7)) found.add(0);

  return { values: [...found].sort((a, b) => a - b), wildcard, source };
}

/** Parse a five-field expression, or an `@`-shorthand. */
export function parseCron(input: string): CronParse {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a cron expression." };

  const expanded = CRON_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const parts = expanded.split(/\s+/);

  if (parts.length !== 5) {
    return {
      ok: false,
      error:
        parts.length < 5
          ? `Only ${parts.length} of 5 fields. Cron wants: minute hour day-of-month month day-of-week.`
          : `${parts.length} fields, but cron takes 5: minute hour day-of-month month day-of-week.`,
    };
  }

  const parsed: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const result = parseField(parts[i], FIELDS[i]);
    if (typeof result === "string") return { ok: false, error: result };
    parsed.push(result);
  }

  const spec: CronSpec = {
    minute: parsed[0],
    hour: parsed[1],
    dayOfMonth: parsed[2],
    month: parsed[3],
    dayOfWeek: parsed[4],
  };

  return { ok: true, spec, description: describeCron(spec) };
}

/* ----------------------------- explanation ---------------------------- */

/** "1, 2 and 5" — an Oxford-comma-free list, which reads better in a sentence. */
function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Describe a field's set, collapsing an even step back into "every n".
 *
 * Worth the effort because a star-slash-15 step is the single most common cron
 * pattern there is, and "every 15 minutes" is a far better explanation than a
 * list of four numbers — which is all the parsed set knows by itself.
 */
function describeSet(field: CronField, total: number, name: (v: number) => string): string | null {
  if (field.wildcard || field.values.length === total) return null;
  if (field.values.length === 1) return name(field.values[0]);

  const first = field.values[0];
  const last = field.values[field.values.length - 1];
  const gaps = field.values.slice(1).map((v, i) => v - field.values[i]);
  const even = gaps.every((g) => g === gaps[0]);

  // A contiguous run reads as a range. Without this, `9-17` is described as
  // "9, 10, 11, 12, 13, 14, 15, 16 and 17", which is technically correct and
  // completely unreadable — and business-hours ranges are extremely common.
  if (even && gaps[0] === 1) return `${name(first)} to ${name(last)}`;

  // Only call it a step if it also starts where the field does — "10,20,30" is a
  // list of three, not "every 10th" (which would have included 0).
  if (even && gaps[0] > 1 && field.values.length > 2) {
    // `>=`, not `>`: values 0,15,30,45 in a 60-wide field reach 45 + 15 = 60,
    // which *is* the whole field. The stricter test called that "every 15 up to
    // 45" — the single most common cron pattern there is, described wrongly.
    const covers = last + gaps[0] >= total;
    if (first === 0 || first === 1) {
      return covers ? `every ${gaps[0]}` : `every ${gaps[0]} up to ${name(last)}`;
    }
    return `every ${gaps[0]} from ${name(first)}`;
  }

  return joinList(field.values.map(name));
}

/** Most wall-clock times to spell out before summarising them as a span. */
const WALL_CLOCK_MAX = 3;

/**
 * The hours a spec covers, as a wall-clock span — "09:00 and 17:59".
 *
 * The closing minute is the *last* minute of the final hour, not `:00`, because
 * "every 15 minutes between 09:00 and 17:00" would be wrong: a job with hour 17
 * also runs at 17:15, 17:30 and 17:45.
 */
function hourSpan(spec: CronSpec): string {
  const hours = spec.hour.values;
  const first = String(hours[0]).padStart(2, "0");
  const last = String(hours[hours.length - 1]).padStart(2, "0");
  const lastMinute = String(spec.minute.values[spec.minute.values.length - 1]).padStart(2, "0");
  return `${first}:${String(spec.minute.values[0]).padStart(2, "0")} and ${last}:${lastMinute}`;
}

/** A plain-English sentence for a parsed expression. */
export function describeCron(spec: CronSpec): string {
  const minutes = describeSet(spec.minute, 60, String);
  const hours = describeSet(spec.hour, 24, String);

  // Time of day — the part people check first, so it leads.
  let when: string;
  if (minutes === null && hours === null) {
    when = "Every minute";
  } else if (minutes !== null && hours === null) {
    when = minutes.startsWith("every")
      ? `${minutes[0].toUpperCase()}${minutes.slice(1)} minutes`
      : `At minute ${minutes} of every hour`;
  } else if (minutes === null && hours !== null) {
    when = hours.startsWith("every")
      ? `Every minute of ${hours} hours`
      : `Every minute of hour ${hours}`;
  } else if (
    spec.minute.values.length === 1 &&
    // Up to three, and no more: "At 09:00, 10:00 and 11:00" reads well, but the
    // same treatment of a nine-hour working day is a wall of clock times that
    // hides the one thing worth seeing — that it runs hourly between two hours.
    spec.hour.values.length <= WALL_CLOCK_MAX &&
    !hours!.startsWith("every")
  ) {
    // The overwhelmingly common shape: a wall-clock time.
    const times = spec.hour.values.map(
      (h) => `${String(h).padStart(2, "0")}:${String(spec.minute.values[0]).padStart(2, "0")}`,
    );
    when = `At ${joinList(times)}`;
  } else if (spec.minute.values.length === 1 && hours!.includes(" to ")) {
    // A contiguous span of hours at one minute past — the business-hours shape.
    const minute = String(spec.minute.values[0]).padStart(2, "0");
    const [from, to] = hours!.split(" to ");
    when = `Hourly from ${from.padStart(2, "0")}:${minute} to ${to.padStart(2, "0")}:${minute}`;
  } else if (minutes!.startsWith("every")) {
    // A minute *step* leads the sentence — "Every 15 minutes" is the fact, and
    // the hours restrict it. "At minute every 15 of hour 9 to 17" is the same
    // information in an order nobody reads.
    const cadence = `${minutes![0].toUpperCase()}${minutes!.slice(1)} minutes`;
    when = `${cadence}, ${hours!.startsWith("every") ? `during ${hours} hours` : `between ${hourSpan(spec)}`}`;
  } else {
    when = `At minute ${minutes} of ${hours!.startsWith("every") ? `${hours} hours` : `hour ${hours}`}`;
  }

  const parts: string[] = [when];

  const dom = describeSet(spec.dayOfMonth, 31, String);
  const dow = describeSet(spec.dayOfWeek, 7, (v) => DAY_NAMES[v] ?? String(v));
  const month = describeSet(spec.month, 12, (v) => MONTH_NAMES[v - 1] ?? String(v));

  if (dom && dow) {
    // The OR rule, spelled out — leaving it implicit is how people get caught.
    parts.push(`on day ${dom} of the month and on ${dow} (cron treats these as either/or)`);
  } else if (dom) {
    parts.push(`on day ${dom} of the month`);
  } else if (dow) {
    parts.push(dow.startsWith("every") ? `on ${dow} days of the week` : `on ${dow}`);
  }

  if (month) parts.push(`in ${month}`);

  return `${parts.join(", ")}.`;
}

/* ------------------------------ next runs ----------------------------- */

/** Whether a date's day satisfies the day-of-month / day-of-week pair. */
function dayMatches(spec: CronSpec, date: Date): boolean {
  const domOk = spec.dayOfMonth.values.includes(date.getDate());
  const dowOk = spec.dayOfWeek.values.includes(date.getDay());

  // Both restricted → either may match. Otherwise the restricted one decides.
  if (!spec.dayOfMonth.wildcard && !spec.dayOfWeek.wildcard) return domOk || dowOk;
  if (!spec.dayOfMonth.wildcard) return domOk;
  if (!spec.dayOfWeek.wildcard) return dowOk;
  return true;
}

/** How far ahead to look before declaring an expression unreachable. */
const SEARCH_DAYS = 366 * 8;

/**
 * The next `count` times an expression fires at or after `from`, in local time.
 *
 * Searched day-by-day and then across that day's allowed hours and minutes,
 * rather than minute-by-minute: a yearly expression is four million minutes away,
 * which a per-minute loop would spend real time walking. This visits at most a
 * few thousand days and a handful of times inside each.
 *
 * The search is bounded because some expressions never fire at all — 30 February
 * parses perfectly and waits forever — and an unbounded loop would hang the tab
 * rather than say so.
 */
export function nextRuns(spec: CronSpec, from: Date, count = 5): Date[] {
  const out: Date[] = [];

  // Start from the next whole minute: a job due this minute has already fired.
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const startDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());

  for (let dayOffset = 0; dayOffset < SEARCH_DAYS && out.length < count; dayOffset++) {
    const day = new Date(startDay);
    day.setDate(day.getDate() + dayOffset);

    if (!spec.month.values.includes(day.getMonth() + 1)) continue;
    if (!dayMatches(spec, day)) continue;

    for (const hour of spec.hour.values) {
      for (const minute of spec.minute.values) {
        const candidate = new Date(day);
        // Set through the Date API rather than constructing from parts, so a
        // candidate that lands in a daylight-saving gap is normalised by the
        // platform the same way a real scheduler's would be.
        candidate.setHours(hour, minute, 0, 0);
        if (candidate < cursor) continue;
        out.push(candidate);
        if (out.length >= count) break;
      }
      if (out.length >= count) break;
    }
  }

  return out;
}

/** Named patterns offered as a starting point, so nobody writes a step from memory. */
export const CRON_PRESETS: { label: string; expression: string }[] = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 5 minutes", expression: "*/5 * * * *" },
  { label: "Every 15 minutes", expression: "*/15 * * * *" },
  { label: "Hourly", expression: "0 * * * *" },
  { label: "Every 6 hours", expression: "0 */6 * * *" },
  { label: "Daily at midnight", expression: "0 0 * * *" },
  { label: "Weekdays at 9am", expression: "0 9 * * 1-5" },
  { label: "Weekly, Monday 8am", expression: "0 8 * * 1" },
  { label: "Monthly, 1st at 3am", expression: "0 3 1 * *" },
  { label: "Quarterly", expression: "0 0 1 1,4,7,10 *" },
];
