/**
 * Breathe's patterns and the clock that plays them.
 *
 * A pattern is a list of phases, each saying how long it lasts and how full the
 * lungs should be when it ends — `level`, 0 for empty and 1 for full, with the
 * physiological sigh's top-up going past 1. Everything on screen is a function
 * of one number, the seconds elapsed, through {@link phaseAt}: the orb's size,
 * the ring's sweep, the countdown and the label. That is what lets the
 * animation be tested and paused without drifting — there is no animation
 * state, only a clock.
 */

export type PhaseKind = "in" | "hold" | "out";

export interface Phase {
  kind: PhaseKind;
  seconds: number;
  /** How full at the end of the phase. A hold keeps whatever came before. */
  level: number;
  /** What the orb says. Defaults from the kind. */
  label: string;
}

export interface Pattern {
  id: string;
  name: string;
  /** One line under the name: the rhythm, in words. */
  rhythm: string;
  /** What it is for, stated plainly and without promising a cure. */
  use: string;
  phases: Phase[];
}

const LABEL: Record<PhaseKind, string> = { in: "Breathe in", hold: "Hold", out: "Breathe out" };

const inhale = (seconds: number, level = 1, label = LABEL.in) =>
  ({ kind: "in", seconds, level, label }) as const;
const exhale = (seconds: number) => ({ kind: "out", seconds, level: 0, label: LABEL.out }) as const;
const hold = (seconds: number) => ({ kind: "hold", seconds, level: Number.NaN, label: LABEL.hold }) as const;

/** Resolve each hold's level to the one before it, so a hold never moves the orb. */
function resolve(phases: readonly Phase[]): Phase[] {
  const out: Phase[] = [];
  phases.forEach((phase, i) => {
    const before = i === 0 ? lastDefined(phases) : out[i - 1].level;
    out.push({ ...phase, level: phase.kind === "hold" ? before : phase.level });
  });
  return out;
}

function lastDefined(phases: readonly Phase[]): number {
  for (let i = phases.length - 1; i >= 0; i--) if (!Number.isNaN(phases[i].level)) return phases[i].level;
  return 0;
}

export const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box",
    rhythm: "In 4 · hold 4 · out 4 · hold 4",
    use: "Four equal sides. Easy to keep count of, which is most of why it steadies attention.",
    phases: resolve([inhale(4), hold(4), exhale(4), hold(4)]),
  },
  {
    id: "calm",
    name: "Long exhale",
    rhythm: "In 4 · out 6",
    use: "Breathing out for longer than in is the simplest way to slow down. A good first pattern.",
    phases: resolve([inhale(4), exhale(6)]),
  },
  {
    id: "coherent",
    name: "Coherent",
    rhythm: "In 5.5 · out 5.5",
    use: "About five and a half breaths a minute, evenly — the pace studied as resonance breathing.",
    phases: resolve([inhale(5.5), exhale(5.5)]),
  },
  {
    id: "478",
    name: "4-7-8",
    rhythm: "In 4 · hold 7 · out 8",
    use: "A long hold and a longer exhale. Often used to wind down before sleep. Skip the hold if it strains.",
    phases: resolve([inhale(4), hold(7), exhale(8)]),
  },
  {
    id: "sigh",
    name: "Double sigh",
    rhythm: "In 2 · top up 1 · long out 6",
    use: "Two inhales through the nose, the second a short top-up, then a slow full exhale. A few rounds is enough.",
    phases: resolve([inhale(2, 0.82), inhale(1, 1.12, "Top up"), exhale(6)]),
  },
  {
    id: "triangle",
    name: "Triangle",
    rhythm: "In 4 · hold 4 · out 4",
    use: "Box without the empty hold — gentler if holding on empty feels uncomfortable.",
    phases: resolve([inhale(4), hold(4), exhale(4)]),
  },
];

export const CUSTOM_ID = "custom";

/** The four numbers a custom pattern is made of. A zero hold is left out. */
export interface Custom {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

export const DEFAULT_CUSTOM: Custom = { inhale: 4, holdIn: 2, exhale: 6, holdOut: 0 };

export function customPattern(c: Custom): Pattern {
  const phases: Phase[] = [inhale(Math.max(1, c.inhale))];
  if (c.holdIn > 0) phases.push(hold(c.holdIn));
  phases.push(exhale(Math.max(1, c.exhale)));
  if (c.holdOut > 0) phases.push(hold(c.holdOut));
  const parts = [`In ${c.inhale}`];
  if (c.holdIn > 0) parts.push(`hold ${c.holdIn}`);
  parts.push(`out ${c.exhale}`);
  if (c.holdOut > 0) parts.push(`hold ${c.holdOut}`);
  return {
    id: CUSTOM_ID,
    name: "Your own",
    rhythm: parts.join(" · "),
    use: "Your numbers. Keep the exhale at least as long as the inhale if the point is to settle.",
    phases: resolve(phases),
  };
}

export function findPattern(id: string, custom: Custom): Pattern {
  if (id === CUSTOM_ID) return customPattern(custom);
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
}

export const cycleSeconds = (pattern: Pattern): number =>
  pattern.phases.reduce((sum, phase) => sum + phase.seconds, 0);

export const breathsPerMinute = (pattern: Pattern): number => 60 / cycleSeconds(pattern);

/** Sine ease-in-out — lungs do not start or stop moving at full speed. */
export const ease = (p: number): number => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));

export interface Moment {
  /** Whole cycles completed before this one. */
  cycle: number;
  index: number;
  phase: Phase;
  /** 0–1 through the current phase. */
  progress: number;
  /** Seconds left in the phase. */
  remaining: number;
  /** How full, eased — what the orb's size is drawn from. */
  level: number;
}

/** Where a pattern is, `elapsed` seconds in. */
export function phaseAt(pattern: Pattern, elapsed: number): Moment {
  const cycle = cycleSeconds(pattern);
  const e = Math.max(0, elapsed);
  const count = Math.floor(e / cycle);
  let t = e - count * cycle;
  const { phases } = pattern;

  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    if (t < phase.seconds || index === phases.length - 1) {
      const from = (index === 0 ? phases[phases.length - 1] : phases[index - 1]).level;
      const progress = Math.min(1, t / phase.seconds);
      return {
        cycle: count,
        index,
        phase,
        progress,
        remaining: Math.max(0, phase.seconds - t),
        level: from + (phase.level - from) * ease(progress),
      };
    }
    t -= phase.seconds;
  }
  // The loop always returns on its last phase.
  throw new Error("unreachable");
}

/** Session lengths offered, in minutes. 0 means keep going until stopped. */
export const LENGTHS = [1, 3, 5, 10, 0] as const;
export type Length = (typeof LENGTHS)[number];

/**
 * How many whole cycles a session of `minutes` runs. A session always ends on
 * an exhale rather than being cut off mid-breath, so the length is rounded to
 * the nearest whole cycle.
 */
export function sessionCycles(pattern: Pattern, minutes: Length): number {
  if (minutes === 0) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.round((minutes * 60) / cycleSeconds(pattern)));
}

/** `m:ss` for a count of seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The level curve of one cycle as an SVG polyline in a `w × h` box — the
 * pattern cards' little preview, drawn from the same phases the orb plays.
 */
export function previewPoints(pattern: Pattern, w: number, h: number, samples = 48): string {
  const total = cycleSeconds(pattern);
  const top = 1.15;
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * total;
    const { level } = phaseAt(pattern, Math.min(t, total - 1e-6));
    const x = (i / samples) * w;
    const y = h - (level / top) * (h - 2) - 1;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}
