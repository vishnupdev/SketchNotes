"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/utils";
import { MORSE, spoken } from "@/lib/Morse/alphabet";
import type { PracticePool, PracticeStyle } from "@/lib/Morse/types";
import { poolChars, useMorseStore } from "@/store/useMorseStore";
import { SignalPattern } from "@/components/Morse/atoms/SignalPattern";
import { CheckIcon, CloseIcon, PlayIcon, RotateIcon } from "@/components/SketchNotes/atoms/icons";

const POOLS: { id: PracticePool; label: string }[] = [
  { id: "letters", label: "A–Z" },
  { id: "numbers", label: "0–9" },
  { id: "alphanumeric", label: "A–Z 0–9" },
  { id: "all", label: "Everything" },
];

const STYLES: { id: PracticeStyle; label: string; hint: string }[] = [
  { id: "listen", label: "Listen", hint: "Hear a signal, name the character" },
  { id: "read", label: "Read", hint: "See the pattern, name the character" },
];

/** A single number + caption in the scoreboard. */
function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-paper px-2 py-2 text-center">
      <div className={cx("font-mono text-[17px] font-bold tabular-nums leading-none", tone)}>{value}</div>
      <div className="mt-1 text-[10.5px] uppercase tracking-[.1em] text-ink-soft">{label}</div>
    </div>
  );
}

/**
 * Practice — a four-choice drill that picks its questions where the learning is:
 * unseen and shaky characters come up more often, and the distractors are
 * chosen from patterns the same length as the answer, so a right answer means
 * you actually heard the difference.
 *
 * A correct answer moves on by itself; a wrong one waits, replays the signal and
 * shows what it was, because that pause is where the association forms.
 */
export function PracticePanel() {
  const quiz = useMorseStore((s) => s.quiz);
  const picked = useMorseStore((s) => s.picked);
  const pool = useMorseStore((s) => s.pool);
  const style = useMorseStore((s) => s.style);
  const streak = useMorseStore((s) => s.streak);
  const bestStreak = useMorseStore((s) => s.bestStreak);
  const asked = useMorseStore((s) => s.asked);
  const correct = useMorseStore((s) => s.correct);
  const playing = useMorseStore((s) => s.playing);
  const hydrated = useMorseStore((s) => s.hydrated);

  const setPool = useMorseStore((s) => s.setPool);
  const setStyle = useMorseStore((s) => s.setStyle);
  const newQuestion = useMorseStore((s) => s.newQuestion);
  const answer = useMorseStore((s) => s.answer);
  const play = useMorseStore((s) => s.play);
  const resetProgress = useMorseStore((s) => s.resetProgress);

  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open the first question once settings (and so the pool) are known.
  useEffect(() => {
    if (hydrated && !quiz) newQuestion();
  }, [hydrated, quiz, newQuestion]);

  // A right answer needs no dwell time — move on while the momentum is there.
  const right = picked !== null && quiz !== null && picked === quiz.answer;
  useEffect(() => {
    if (!right) return;
    advanceRef.current = setTimeout(() => newQuestion(), 750);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [right, newQuestion]);

  const accuracy = asked > 0 ? Math.round((correct / asked) * 100) : 0;
  const poolSize = poolChars(pool).length;

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- what to drill ---------------- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-3 shadow-panel">
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-ink-soft">Characters</legend>
          <div className="flex flex-wrap gap-1.5">
            {POOLS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPool(p.id)}
                aria-pressed={pool === p.id}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  pool === p.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-paper text-ink-soft hover:text-text",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-ink-soft">Question</legend>
          <div className="flex gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                aria-pressed={style === s.id}
                title={s.hint}
                className={cx(
                  "flex-1 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  style === s.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-paper text-ink-soft hover:text-text",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* ---------------- scoreboard ---------------- */}
      <div className="flex gap-2">
        <Stat value={String(streak)} label="Streak" tone={streak > 0 ? "text-accent" : undefined} />
        <Stat value={String(bestStreak)} label="Best" />
        <Stat value={asked ? `${accuracy}%` : "—"} label="Accuracy" />
        <Stat value={`${poolSize}`} label="In pool" />
      </div>

      {/* ---------------- the question ---------------- */}
      <section
        aria-label="Practice question"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-panel p-5 shadow-panel"
      >
        <p aria-live="polite" className="text-center text-[12.5px] text-ink-soft">
          {picked === null
            ? style === "listen"
              ? "Which character was that?"
              : "Which character is this?"
            : right
              ? "Correct."
              : `That was ${quiz?.answer} — ${quiz ? spoken(MORSE[quiz.answer]) : ""}.`}
        </p>

        {style === "read" ? (
          <span className="grid min-h-11 place-items-center">
            {quiz && <SignalPattern code={MORSE[quiz.answer]} size="lg" className="text-accent" />}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => quiz && play(quiz.answer, "quiz")}
            className="hover-glow inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-bold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PlayIcon size={17} />
            {playing ? "Sending…" : "Play again"}
          </button>
        )}

        <div className="grid w-full grid-cols-2 gap-2.5 min-[520px]:grid-cols-4">
          {quiz?.options.map((option) => {
            const isAnswer = option === quiz.answer;
            const isPicked = option === picked;
            const settled = picked !== null;
            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={settled}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 font-mono text-[22px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  !settled && "hover-lift border-border bg-paper hover:border-accent hover:text-accent",
                  settled && isAnswer && "border-success bg-paper text-success",
                  settled && isPicked && !isAnswer && "border-danger bg-paper text-danger",
                  settled && !isAnswer && !isPicked && "border-border bg-paper text-ink-soft opacity-60",
                )}
              >
                <span>{option}</span>
                {settled && (
                  <SignalPattern code={MORSE[option]} size="sm" />
                )}
                {settled && isAnswer && <CheckIcon size={15} />}
                {settled && isPicked && !isAnswer && <CloseIcon size={15} />}
              </button>
            );
          })}
        </div>

        {picked !== null && !right && (
          <button
            type="button"
            onClick={() => newQuestion()}
            className="hover-glow w-full rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Next character
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={resetProgress}
        className="tint inline-flex items-center justify-center gap-2 self-center rounded-full px-4 py-2 text-[12px] font-semibold text-ink-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RotateIcon size={14} />
        Reset progress
      </button>
    </div>
  );
}
