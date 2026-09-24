"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { currentPattern, elapsedOf, useBreatheStore } from "@/store/useBreatheStore";
import { clock, cycleSeconds, phaseAt, sessionCycles } from "@/lib/Breathe/patterns";
import { buzz, playPhase } from "@/lib/Breathe/cues";

/** Particles around the orb: angle, orbit band and direction, fixed per dot. */
const DOTS = Array.from({ length: 14 }, (_, i) => ({
  a: (360 / 14) * i + (i % 2) * 9,
  j: i % 3,
  dir: i % 2 ? 1 : -1,
}));

const RINGS = [0, 1, 2];

interface Shown {
  index: number;
  cycle: number;
}

/**
 * The orb — the whole instruction, drawn.
 *
 * A frame loop runs only while a session is playing. Each frame it reads the
 * session clock, asks the pattern where that puts the breath, and writes three
 * CSS variables on the stage (`--level`, `--p`, `--spin`); every layer is
 * styled from those in `globals.css`, so a frame costs a style update and a
 * composite and never a React render. React re-renders only when the *phase*
 * changes, which is also where the cues fire.
 */
export function BreathStage() {
  const status = useBreatheStore((s) => s.status);
  const patternId = useBreatheStore((s) => s.patternId);
  const custom = useBreatheStore((s) => s.custom);
  const length = useBreatheStore((s) => s.length);
  const last = useBreatheStore((s) => s.last);
  // Memoised: the frame loop below restarts whenever the pattern object changes.
  const pattern = useMemo(() => currentPattern({ patternId, custom }), [patternId, custom]);

  const stage = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  const target = sessionCycles(pattern, length);
  const total = Number.isFinite(target) ? target * cycleSeconds(pattern) : null;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;

    const draw = (elapsed: number) => {
      const m = phaseAt(pattern, elapsed);
      el.style.setProperty("--level", m.level.toFixed(4));
      el.style.setProperty("--p", m.progress.toFixed(4));
      el.style.setProperty("--spin", (elapsed * 7).toFixed(2));
      if (count.current) count.current.textContent = String(Math.max(1, Math.ceil(m.remaining)));
      if (left.current)
        left.current.textContent = total === null ? clock(elapsed) : `${clock(total - elapsed)} left`;
      return m;
    };

    if (status === "paused") {
      draw(elapsedOf(useBreatheStore.getState()));
      return;
    }
    if (status !== "running") {
      el.style.removeProperty("--level");
      el.style.setProperty("--p", "0");
      setShown(null);
      return;
    }

    let raf = 0;
    let prev = "";
    const frame = () => {
      const s = useBreatheStore.getState();
      const elapsed = elapsedOf(s);
      const cycle = Math.floor(elapsed / cycleSeconds(pattern));
      if (cycle >= target) {
        s.finish();
        return;
      }
      const m = draw(elapsed);
      const key = `${m.cycle}:${m.index}`;
      if (key !== prev) {
        prev = key;
        setShown({ index: m.index, cycle: m.cycle });
        // A cue belongs to the *start* of a phase. Resuming mid-phase, or
        // the first frame arriving late, must not replay one half-way through.
        if (m.progress < 0.15) {
          if (s.sound) playPhase({ ...m.phase, seconds: m.remaining }, s.volume);
          if (s.haptics) buzz(m.phase);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status, pattern, target, total]);

  // Keep the screen awake through a session: a phone that dims at thirty
  // seconds is a phone that ends a five-minute exercise.
  useEffect(() => {
    if (status !== "running" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let dead = false;
    navigator.wakeLock
      .request("screen")
      .then((l) => (dead ? void l.release() : (lock = l)))
      .catch(() => {});
    return () => {
      dead = true;
      void lock?.release();
    };
  }, [status]);

  const phase = shown ? pattern.phases[shown.index] : null;
  const live = status === "running" || status === "paused";

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        ref={stage}
        data-state={status === "done" ? "done" : live ? "live" : "idle"}
        data-phase={phase?.kind}
        className="breathe-stage"
      >
        <div className="breathe-aura" aria-hidden />
        {RINGS.map((i) => (
          <div key={i} className="breathe-ring" style={{ "--i": i } as CSSProperties} aria-hidden />
        ))}
        <div aria-hidden>
          {DOTS.map((d, i) => (
            <span
              key={i}
              className="breathe-dot"
              style={{ "--a": d.a, "--j": d.j, "--dir": d.dir } as CSSProperties}
            />
          ))}
        </div>

        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="48.5" fill="none" strokeWidth="1" className="stroke-border" />
          <circle
            cx="50"
            cy="50"
            r="48.5"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            className="breathe-sweep"
          />
        </svg>

        <div className="breathe-orb" aria-hidden />

        {status === "done" &&
          RINGS.map((i) => (
            <div key={`b${i}`} className="breathe-bloom" style={{ "--i": i } as CSSProperties} aria-hidden />
          ))}

        {/* Each state keys its own content: the live countdown is written to
            the DOM directly, and a reused node would carry that text into the
            next state. The words sit on the orb in the page's own text colour on a soft
            paper wash, so they hold AA contrast whatever size the orb is. */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center rounded-full bg-paper/70 px-5 py-3 text-center backdrop-blur-sm">
            {status === "done" ? (
              <Fragment key="done">
                <svg viewBox="0 0 24 24" className="breathe-check size-9 text-accent" aria-hidden>
                  <path
                    d="M5 12.5 10 17.5 19 7"
                    pathLength={1}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="breathe-label mt-1 text-[17px] font-extrabold">Well done</span>
                {last && (
                  <span className="breathe-label font-mono text-[11px] text-ink-soft">
                    {clock(last.seconds)} · {last.cycles} breath{last.cycles === 1 ? "" : "s"}
                  </span>
                )}
              </Fragment>
            ) : live && phase ? (
              <Fragment key="live">
                <span key={`${shown?.cycle}:${shown?.index}`} className="breathe-label text-[19px] font-extrabold">
                  {status === "paused" ? "Paused" : phase.label}
                </span>
                <span ref={count} className="text-[40px] font-extrabold leading-none tabular-nums" />
                <span ref={left} className="mt-1 font-mono text-[10.5px] uppercase tracking-[.12em] text-ink-soft" />
              </Fragment>
            ) : (
              <Fragment key="idle">
                <span className="text-[17px] font-extrabold">{pattern.name}</span>
                <span className="font-mono text-[11px] text-ink-soft">{pattern.rhythm}</span>
              </Fragment>
            )}
          </div>
        </div>
      </div>

      {/* What a screen reader gets instead of the orb: the phase, once per change. */}
      <p className="sr-only" aria-live="polite">
        {status === "running" && phase ? `${phase.label}, ${Math.round(phase.seconds)} seconds` : ""}
        {status === "done" ? "Session complete" : ""}
      </p>
    </div>
  );
}
