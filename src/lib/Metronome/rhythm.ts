/**
 * Metronome's arithmetic — tempo, metre, accents, tap tempo and the two
 * practice modes — kept pure so the parts that are easy to get subtly wrong
 * (a tap average thrown by one stray tap, a ramp that overshoots its target, a
 * silent-bar cycle off by one) are tested rather than discovered by ear.
 *
 * Nothing here knows about Web Audio; `engine.ts` asks {@link planBar} what a
 * bar should be and schedules it.
 */

export const BPM_MIN = 20;
export const BPM_MAX = 300;

/** Keep a tempo inside the range the engine plays, as a whole number. */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 120;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

/**
 * The conventional Italian name for a tempo. The bands are the ones printed on
 * most mechanical metronomes; composers never agreed on exact edges, so this is
 * a guide to the feel of a number, not a rule.
 */
const MARKINGS: [upTo: number, name: string][] = [
  [39, "Grave"],
  [59, "Largo"],
  [65, "Larghetto"],
  [75, "Adagio"],
  [107, "Andante"],
  [119, "Moderato"],
  [167, "Allegro"],
  [176, "Vivace"],
  [199, "Presto"],
];

export function tempoMarking(bpm: number): string {
  for (const [upTo, name] of MARKINGS) if (bpm <= upTo) return name;
  return "Prestissimo";
}

/** How loudly one beat of the bar sounds. `mute` keeps its place silently. */
export type Accent = "strong" | "medium" | "soft" | "mute";

export const ACCENT_ORDER: Accent[] = ["strong", "medium", "soft", "mute"];

/** The next accent a tap on a beat moves to. */
export function cycleAccent(accent: Accent): Accent {
  return ACCENT_ORDER[(ACCENT_ORDER.indexOf(accent) + 1) % ACCENT_ORDER.length];
}

export interface Meter {
  /** Beats in the bar — the top number. */
  beats: number;
  /** The note that gets the beat — the bottom number. */
  unit: 4 | 8;
}

export const METERS: Meter[] = [
  { beats: 1, unit: 4 },
  { beats: 2, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 4, unit: 4 },
  { beats: 5, unit: 4 },
  { beats: 6, unit: 8 },
  { beats: 7, unit: 8 },
  { beats: 9, unit: 8 },
  { beats: 12, unit: 8 },
];

export const meterLabel = (meter: Meter): string => `${meter.beats}/${meter.unit}`;

export const sameMeter = (a: Meter, b: Meter): boolean => a.beats === b.beats && a.unit === b.unit;

/**
 * How a bar's beats group, which is where the secondary accents go.
 *
 * Compound metres (6/8, 9/8, 12/8) are felt in threes, so a 6/8 bar is two
 * pulses and not six equal clicks — the grouping is what makes it sound like
 * 6/8 rather than like a fast 3/4. The odd metres take their commonest
 * groupings: 5/4 as 3+2, 7/8 as 2+2+3.
 */
export function groupsOf(meter: Meter): number[] {
  const { beats, unit } = meter;
  if (unit === 8 && beats % 3 === 0 && beats > 3) return Array(beats / 3).fill(3);
  if (beats === 5) return [3, 2];
  if (beats === 7) return [2, 2, 3];
  return [beats];
}

/** Strong on one, medium on the start of each later group, soft elsewhere. */
export function defaultAccents(meter: Meter): Accent[] {
  const accents: Accent[] = Array(meter.beats).fill("soft");
  let at = 0;
  groupsOf(meter).forEach((size, index) => {
    accents[at] = index === 0 ? "strong" : "medium";
    at += size;
  });
  return accents;
}

/** Clicks per beat: plain beats, eighths, triplets or sixteenths. */
export type Subdivision = 1 | 2 | 3 | 4;

export const SUBDIVISIONS: Subdivision[] = [1, 2, 3, 4];

/** Seconds between two beats at a tempo. */
export const beatSeconds = (bpm: number): number => 60 / bpm;

/** Seconds a bar lasts at a tempo. */
export const barSeconds = (bpm: number, meter: Meter): number => beatSeconds(bpm) * meter.beats;

// ─── Tap tempo ──────────────────────────────────────────────────────────────

/** A pause this long starts a new count, so an old tapping run can't skew it. */
export const TAP_RESET_MS = 2000;
/** Taps kept: enough to settle, few enough to follow a deliberate change. */
export const TAP_WINDOW = 8;

/** Add a tap at `now` to the running list, starting over after a long pause. */
export function pushTap(taps: readonly number[], now: number): number[] {
  const last = taps[taps.length - 1];
  if (last === undefined || now - last > TAP_RESET_MS || now <= last) return [now];
  return [...taps, now].slice(-TAP_WINDOW);
}

/**
 * The tempo a run of taps implies, or null until there are two.
 *
 * The **median** interval, not the mean: one late tap (a finger that missed)
 * would drag a mean several BPM away from what was meant, while the median
 * ignores it as long as the other taps agree.
 */
export function tapBpm(taps: readonly number[]): number | null {
  if (taps.length < 2) return null;
  const gaps = taps
    .slice(1)
    .map((t, i) => t - taps[i])
    .sort((a, b) => a - b);
  const mid = gaps.length >> 1;
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return clampBpm(60000 / median);
}

// ─── Practice modes ─────────────────────────────────────────────────────────

/**
 * Speed ramp: start at `from`, move by `step` BPM every `everyBars` bars, and
 * hold at `to`. Works in either direction — `to` below `from` slows down,
 * which is how a passage is brought back under control.
 */
export interface Ramp {
  from: number;
  to: number;
  step: number;
  everyBars: number;
}

/** The tempo of bar `bar` (counting from 0) on a ramp. */
export function rampBpm(ramp: Ramp, bar: number): number {
  const { from, to } = ramp;
  const step = Math.max(1, Math.abs(ramp.step));
  const every = Math.max(1, Math.floor(ramp.everyBars));
  const moved = step * Math.floor(Math.max(0, bar) / every);
  return clampBpm(to >= from ? Math.min(to, from + moved) : Math.max(to, from - moved));
}

/** The first bar played at the ramp's target tempo. */
export function barsToTarget(ramp: Ramp): number {
  const distance = Math.abs(ramp.to - ramp.from);
  const step = Math.max(1, Math.abs(ramp.step));
  return Math.ceil(distance / step) * Math.max(1, Math.floor(ramp.everyBars));
}

/** How long a ramp takes to arrive at its target, in seconds. */
export function rampSeconds(ramp: Ramp, meter: Meter): number {
  let total = 0;
  const bars = barsToTarget(ramp);
  for (let bar = 0; bar < bars; bar++) total += barSeconds(rampBpm(ramp, bar), meter);
  return total;
}

/**
 * Silent bars: `play` bars with the click, then `rest` bars without, repeating.
 * The beat keeps counting through the gap, so coming back in exactly on one is
 * the test of whether the time was yours or the metronome's.
 */
export interface Gap {
  play: number;
  rest: number;
}

export function barAudible(gap: Gap, bar: number): boolean {
  const play = Math.max(1, Math.floor(gap.play));
  const rest = Math.max(0, Math.floor(gap.rest));
  return Math.max(0, bar) % (play + rest) < play;
}

/** Everything the engine needs to know to schedule one bar. */
export interface Plan {
  bpm: number;
  meter: Meter;
  accents: readonly Accent[];
  subdivision: Subdivision;
  ramp: Ramp | null;
  gap: Gap | null;
}

export interface BarPlan {
  bpm: number;
  audible: boolean;
}

/** What bar `bar` of a run sounds like: its tempo, and whether it clicks. */
export function planBar(plan: Plan, bar: number): BarPlan {
  return {
    bpm: plan.ramp ? rampBpm(plan.ramp, bar) : clampBpm(plan.bpm),
    audible: plan.gap ? barAudible(plan.gap, bar) : true,
  };
}

/** `m:ss` for a duration in seconds — the ramp summary's clock. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
