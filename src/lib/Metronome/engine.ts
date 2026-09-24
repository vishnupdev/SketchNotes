import { beatSeconds, planBar, type Accent, type BarPlan, type Plan } from "./rhythm";

export type ClickSound = "click" | "wood" | "beep";

export const CLICK_SOUNDS: { id: ClickSound; label: string; hint: string }[] = [
  { id: "click", label: "Click", hint: "A short sine blip — the least tiring over an hour" },
  { id: "wood", label: "Wood", hint: "A woodblock knock that cuts through a band" },
  { id: "beep", label: "Beep", hint: "A square-wave beep, the loudest of the three" },
];

/** What the engine reads before every click, so a change lands on the next one. */
export interface EnginePlan extends Plan {
  sound: ClickSound;
  /** 0–1. */
  volume: number;
}

/** One scheduled click, reported back when it is heard. */
export interface Tick {
  bar: number;
  beat: number;
  /** Which subdivision of the beat — 0 is the beat itself. */
  sub: number;
  bpm: number;
  audible: boolean;
}

/** How far ahead clicks are committed to the audio clock, in seconds. */
const AHEAD = 0.12;
/**
 * The same, while the tab is hidden. Browsers slow a hidden tab's timers, and
 * although Chrome exempts a tab that is playing sound, not every browser does —
 * a longer runway keeps the click steady at the cost of a tempo change taking
 * up to a second to land, which nobody hears from another tab anyway.
 */
const AHEAD_HIDDEN = 1.2;
const LOOP_MS = 25;

type Level = Accent | "sub";

const PITCH: Record<Level, number> = { strong: 1.5, medium: 1.22, soft: 1, sub: 0.8, mute: 0 };
const GAIN: Record<Level, number> = { strong: 1, medium: 0.72, soft: 0.5, sub: 0.28, mute: 0 };

/**
 * The metronome itself: a Web Audio lookahead scheduler.
 *
 * `setTimeout` alone cannot keep time — it drifts, and it stalls whenever the
 * main thread is busy. So a coarse 25 ms timer only *books* clicks, a little
 * ahead, at exact times on the audio hardware's own clock, and the sound card
 * plays them sample-accurately however late the timer runs. The plan is
 * re-read for every click, so a tempo nudge or an accent change takes effect on
 * the next click rather than at the next bar.
 *
 * Every click is synthesised (no sample files), which is what lets the app work
 * offline from the first load.
 */
export class MetronomeEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private raf = 0;
  private queue: { time: number; tick: Tick }[] = [];

  private nextTime = 0;
  private bar = 0;
  private beat = 0;
  private sub = 0;
  private barPlan: BarPlan = { bpm: 120, audible: true };

  constructor(
    private readonly getPlan: () => EnginePlan,
    private readonly onTick: (tick: Tick) => void,
  ) {}

  get running(): boolean {
    return this.timer !== null;
  }

  /** Start from bar one. Call from a user gesture — browsers unlock audio on one. */
  start(): boolean {
    if (this.running) return true;
    const Ctor =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return false;

    this.ctx ??= new Ctor({ latencyHint: "interactive" });
    void this.ctx.resume();

    // A fresh master per run: stopping disconnects it, which silences every
    // click already booked ahead without having to track them one by one.
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);

    this.bar = 0;
    this.beat = 0;
    this.sub = 0;
    this.barPlan = planBar(this.getPlan(), 0);
    this.nextTime = this.ctx.currentTime + 0.06;
    this.queue = [];

    this.timer = setInterval(() => this.schedule(), LOOP_MS);
    this.schedule();
    this.raf = requestAnimationFrame(this.drain);
    return true;
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.raf);
    this.queue = [];
    this.master?.disconnect();
    this.master = null;
    // Suspending rather than closing: the next start reuses the context, and a
    // suspended one draws no power.
    void this.ctx?.suspend();
  }

  /** Release the audio device entirely — the app is closing. */
  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ahead = typeof document !== "undefined" && document.hidden ? AHEAD_HIDDEN : AHEAD;

    while (this.nextTime < ctx.currentTime + ahead) {
      const plan = this.getPlan();
      const beats = Math.max(1, plan.meter.beats);
      const subdivision = plan.subdivision;

      // The metre or subdivision may have shrunk under a running bar.
      if (this.sub >= subdivision) {
        this.sub = 0;
        this.beat++;
      }
      if (this.beat >= beats) this.nextBar(plan);

      const tick: Tick = {
        bar: this.bar,
        beat: this.beat,
        sub: this.sub,
        bpm: this.barPlan.bpm,
        audible: this.barPlan.audible,
      };
      if (tick.audible) {
        const level: Level = this.sub === 0 ? (plan.accents[this.beat] ?? "soft") : "sub";
        if (level !== "mute") this.click(this.nextTime, level, plan);
      }
      this.queue.push({ time: this.nextTime, tick });

      this.nextTime += beatSeconds(this.barPlan.bpm) / subdivision;
      this.sub++;
      if (this.sub >= subdivision) {
        this.sub = 0;
        this.beat++;
        if (this.beat >= beats) this.nextBar(plan);
      }
    }
  }

  private nextBar(plan: EnginePlan): void {
    this.beat = 0;
    this.bar++;
    this.barPlan = planBar(plan, this.bar);
  }

  /** Report each click as it is *heard*, which is later than it is played by the output latency. */
  private drain = (): void => {
    const ctx = this.ctx;
    if (!ctx || !this.running) return;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    while (this.queue.length && this.queue[0].time + latency <= ctx.currentTime) {
      this.onTick(this.queue.shift()!.tick);
    }
    this.raf = requestAnimationFrame(this.drain);
  };

  private click(at: number, level: Level, plan: EnginePlan): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const volume = Math.min(1, Math.max(0, plan.volume)) * GAIN[level];
    if (volume <= 0) return;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(master);

    let base: number;
    let length: number;
    let peak = volume;
    if (plan.sound === "wood") {
      // A woodblock is a fast pitch drop on a hollow tone rather than a pure one.
      base = 820;
      length = 0.05;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(base * PITCH[level] * 1.6, at);
      osc.frequency.exponentialRampToValueAtTime(base * PITCH[level], at + 0.012);
    } else if (plan.sound === "beep") {
      base = 880;
      length = 0.07;
      osc.type = "square";
      peak *= 0.35; // a square wave is several times louder than a sine at the same gain
      osc.frequency.setValueAtTime(base * PITCH[level], at);
    } else {
      base = 1000;
      length = 0.03;
      osc.type = "sine";
      osc.frequency.setValueAtTime(base * PITCH[level], at);
    }

    // A 1 ms attack, then an exponential decay — a hard edge with no ramp
    // clicks audibly in the wrong way, at the waveform's discontinuity.
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.start(at);
    osc.stop(at + length + 0.01);
  }
}
