"use client";

import { useCallback, useEffect } from "react";
import { cx } from "@/lib/utils";
import { ALL_CHARS, CHAR_GROUPS, MORSE, PROSIGNS, spoken } from "@/lib/Morse/alphabet";
import { accuracyOf, useMorseStore } from "@/store/useMorseStore";
import { SignalPattern } from "@/components/Morse/atoms/SignalPattern";
import { CharTile } from "@/components/Morse/molecules/CharTile";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
} from "@/components/SketchNotes/atoms/icons";

/** Render the spoken rhythm with the long signals stressed: "di-DAH". */
const stressed = (code: string): string =>
  spoken(code)
    .split("-")
    .map((syl) => (syl === "dah" ? "DAH" : syl))
    .join("-");

/**
 * Learn — the reference chart plus a detail card for the character in focus.
 *
 * The card leads with the sound (a big Play button and the spoken "di-DAH"
 * rhythm) rather than the written dots, because Morse is heard, not read. Every
 * tile carries the mastery earned in Practice, so the chart doubles as a map of
 * what's left to learn.
 */
export function LearnPanel() {
  const focusChar = useMorseStore((s) => s.focusChar);
  const setFocusChar = useMorseStore((s) => s.setFocusChar);
  const play = useMorseStore((s) => s.play);
  const playCode = useMorseStore((s) => s.playCode);
  const playingId = useMorseStore((s) => s.playingId);
  const stats = useMorseStore((s) => s.stats);

  const code = MORSE[focusChar] ?? MORSE.E;
  const stat = stats[focusChar];

  const select = useCallback(
    (char: string) => {
      setFocusChar(char);
      play(char, `char:${char}`);
    },
    [setFocusChar, play],
  );

  /** Step through the chart, wrapping at both ends. */
  const step = useCallback(
    (delta: number) => {
      const i = ALL_CHARS.indexOf(focusChar);
      const next = ALL_CHARS[(i + delta + ALL_CHARS.length) % ALL_CHARS.length];
      select(next);
    },
    [focusChar, select],
  );

  // Typing a character jumps the chart to it — the fastest way to look one up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const char = e.key.toUpperCase();
      if (MORSE[char]) {
        e.preventDefault();
        select(char);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  return (
    <div className="flex flex-col gap-5">
      {/* ---------------- detail card ---------------- */}
      <section
        aria-label={`Character ${focusChar}`}
        className="rounded-2xl border border-border bg-panel p-5 shadow-panel"
      >
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-[72px] flex-none place-items-center rounded-2xl bg-accent-soft font-mono text-[38px] font-extrabold leading-none text-accent"
          >
            {focusChar}
          </span>

          <div className="min-w-0 flex-1">
            <SignalPattern code={code} size="lg" className="text-accent" />
            <p className="mt-2.5 font-mono text-[13px] font-semibold tracking-[.06em]">
              {stressed(code)}
            </p>
            <p className="mt-1 text-[12px] text-ink-soft">
              {stat && stat.asked > 0
                ? `Practised ${stat.asked}× · ${Math.round(accuracyOf(stat) * 100)}% right`
                : "Not practised yet"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => play(focusChar, `char:${focusChar}`)}
            className="hover-glow inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PlayIcon size={17} />
            {playingId === `char:${focusChar}` ? "Sending…" : "Hear it"}
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous character"
            className="hover-pop grid size-11 flex-none place-items-center rounded-xl border border-border bg-paper hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next character"
            className="hover-pop grid size-11 flex-none place-items-center rounded-xl border border-border bg-paper hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        <p className="mt-3 text-[11.5px] text-ink-soft">
          Tip: press any key on a keyboard to jump straight to that character.
        </p>
      </section>

      {/* ---------------- the chart ---------------- */}
      {CHAR_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`morse-group-${group.id}`}>
          <h3 id={`morse-group-${group.id}`} className="text-[14px] font-bold">
            {group.label}
          </h3>
          <p className="mb-2.5 mt-0.5 text-[12px] text-ink-soft">{group.hint}</p>
          <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-5 min-[520px]:grid-cols-6 min-[680px]:grid-cols-8">
            {group.chars.map((char) => {
              const s = stats[char];
              return (
                <CharTile
                  key={char}
                  char={char}
                  code={MORSE[char]}
                  selected={char === focusChar}
                  playing={playingId === `char:${char}`}
                  mastery={s && s.asked > 0 ? accuracyOf(s) : null}
                  onSelect={() => select(char)}
                />
              );
            })}
          </div>
        </section>
      ))}

      {/* ---------------- prosigns ---------------- */}
      <section aria-labelledby="morse-prosigns">
        <h3 id="morse-prosigns" className="text-[14px] font-bold">
          Prosigns
        </h3>
        <p className="mb-2.5 mt-0.5 text-[12px] text-ink-soft">
          Sent as one unbroken run, with no gaps inside — that&apos;s what makes them a
          signal rather than the letters they&apos;re spelled with.
        </p>
        <ul role="list" className="overflow-hidden rounded-2xl border border-border bg-panel shadow-panel">
          {PROSIGNS.map((sign) => {
            const id = `prosign:${sign.name}`;
            return (
              <li key={sign.name} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => playCode(sign.code, id)}
                  className={cx(
                    "tint flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    playingId === id && "text-accent",
                  )}
                >
                  <span className="w-11 flex-none font-mono text-[14px] font-bold">{sign.name}</span>
                  <span className="min-w-0 flex-1">
                    <SignalPattern code={sign.code} size="sm" className="text-accent" />
                    <span className="mt-1 block text-[12px] text-ink-soft">{sign.meaning}</span>
                  </span>
                  <PlayIcon size={16} className="flex-none text-ink-soft" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
