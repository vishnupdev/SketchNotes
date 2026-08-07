"use client";

import { create } from "zustand";
import { CHAR_GROUPS, MORSE } from "@/lib/Morse/alphabet";
import { buildCodePlan, playMorse, primeAudio, type Beat, type Playback } from "@/lib/Morse/audio";
import {
  defaultSnapshot,
  loadMorse,
  saveMorse,
  TONE_MAX,
  TONE_MIN,
  WPM_MAX,
  WPM_MIN,
} from "@/lib/Morse/morse-api";
import type {
  CharStat,
  MorseMode,
  MorseSettings,
  MorseSnapshot,
  PracticePool,
  PracticeStyle,
  Quiz,
} from "@/lib/Morse/types";

const GROUP = Object.fromEntries(CHAR_GROUPS.map((g) => [g.id, g.chars])) as Record<string, string[]>;

/** The characters a drill draws from, per pool setting. */
export function poolChars(pool: PracticePool): string[] {
  if (pool === "letters") return GROUP.letters;
  if (pool === "numbers") return GROUP.numbers;
  if (pool === "alphanumeric") return [...GROUP.letters, ...GROUP.numbers];
  return [...GROUP.letters, ...GROUP.numbers, ...GROUP.punctuation];
}

/** 0–1 confidence in a character, from its practice history. */
export const accuracyOf = (stat: CharStat | undefined): number =>
  stat && stat.asked > 0 ? stat.right / stat.asked : 0;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * Choose the next character to test. Unseen and shaky characters come up more
 * often than ones already answered correctly, so a session spends its time
 * where the learning is — without ever fully retiring a character.
 */
function nextChar(pool: string[], stats: Record<string, CharStat>, avoid: string | null): string {
  const candidates = pool.length > 1 && avoid ? pool.filter((c) => c !== avoid) : pool;
  const weights = candidates.map((c) => {
    const stat = stats[c];
    if (!stat || stat.asked === 0) return 3;
    return 1 + (1 - accuracyOf(stat)) * 3;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/**
 * Build the four choices. Distractors prefer characters whose code is the same
 * length as the answer's — telling `S` from `H` is the skill that matters, and
 * an obviously-wrong option teaches nothing.
 */
function buildOptions(answer: string, pool: string[]): string[] {
  const others = pool.filter((c) => c !== answer);
  const sameLength = others.filter((c) => MORSE[c].length === MORSE[answer].length);
  const bag = [...sameLength];
  const rest = others.filter((c) => !sameLength.includes(c));
  const options = [answer];
  while (options.length < Math.min(4, pool.length)) {
    const source = bag.length ? bag : rest;
    if (!source.length) break;
    const choice = pick(source);
    source.splice(source.indexOf(choice), 1);
    options.push(choice);
  }
  // Fisher–Yates, so the answer isn't always first.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/** The playback in flight, if any. Module-level so it survives re-renders. */
let active: Playback | null = null;

interface MorseState extends MorseSnapshot {
  /** Which tool is on screen. */
  mode: MorseMode;
  /** True once the persisted snapshot has been merged in. */
  hydrated: boolean;

  /** Whether a message is being sent right now. */
  playing: boolean;
  /** Live lamp state — drives the beacon and any tile that is sounding. */
  signalOn: boolean;
  /** Id of whatever is playing ("char:A", "translate", "quiz"), for UI state. */
  playingId: string | null;
  /** Index of the source character currently being sent, for highlighting. */
  playingIndex: number | null;

  /** Character opened in the Learn detail card. */
  focusChar: string;

  /** The live practice question, or null before the first one. */
  quiz: Quiz | null;
  /** The option the learner picked, or null while the question is open. */
  picked: string | null;
  streak: number;
  asked: number;
  correct: number;

  /** Translate panel input. */
  input: string;
  /** Which way the translator is converting. */
  toMorse: boolean;

  hydrate: () => void;
  setMode: (mode: MorseMode) => void;
  updateSettings: (patch: Partial<MorseSettings>) => void;

  /** Send `text` as Morse, replacing anything already playing. */
  play: (text: string, id: string) => void;
  /** Send a raw code string (a prosign) as one unbroken run of signals. */
  playCode: (code: string, id: string) => void;
  stop: () => void;

  setFocusChar: (char: string) => void;

  setPool: (pool: PracticePool) => void;
  setStyle: (style: PracticeStyle) => void;
  newQuestion: () => void;
  answer: (choice: string) => void;
  resetProgress: () => void;

  setInput: (text: string) => void;
  setToMorse: (toMorse: boolean) => void;
}

export const useMorseStore = create<MorseState>((set, get) => {
  /** Write the persistable slice of the current state. */
  const persist = () => {
    const { settings, pool, style, stats, bestStreak } = get();
    saveMorse({ settings, pool, style, stats, bestStreak });
  };

  /** Start a message, cancelling whatever was already on the air. */
  const send = (source: string | Beat[], id: string) => {
    active?.cancel();
    active = null;
    const { settings } = get();
    primeAudio();
    set({ playing: true, playingId: id, signalOn: false, playingIndex: null });
    active = playMorse(source, {
      ...settings,
      onSignal: (on) => set({ signalOn: on }),
      onChar: (index) => set({ playingIndex: index }),
      onDone: () => {
        active = null;
        set({ playing: false, playingId: null, signalOn: false, playingIndex: null });
      },
    });
  };

  return {
    ...defaultSnapshot(),
    mode: "learn",
    hydrated: false,

    playing: false,
    signalOn: false,
    playingId: null,
    playingIndex: null,

    focusChar: "E",

    quiz: null,
    picked: null,
    streak: 0,
    asked: 0,
    correct: 0,

    input: "HELLO WORLD",
    toMorse: true,

    hydrate: async () => {
      if (get().hydrated) return;
      const snap = await loadMorse();
      set({ ...snap, hydrated: true });
    },

    setMode: (mode) => {
      get().stop();
      set({ mode });
    },

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      settings.wpm = clamp(settings.wpm, WPM_MIN, WPM_MAX);
      settings.tone = clamp(settings.tone, TONE_MIN, TONE_MAX);
      set({ settings });
      persist();
    },

    play: (text, id) => send(text, id),

    playCode: (code, id) => send(buildCodePlan(code, get().settings.wpm), id),

    stop: () => {
      active?.cancel();
      active = null;
      if (get().playing || get().signalOn) {
        set({ playing: false, playingId: null, signalOn: false, playingIndex: null });
      }
    },

    setFocusChar: (focusChar) => set({ focusChar }),

    setPool: (pool) => {
      set({ pool, quiz: null, picked: null });
      persist();
      get().newQuestion();
    },

    setStyle: (style) => {
      set({ style, quiz: null, picked: null });
      persist();
      get().newQuestion();
    },

    newQuestion: () => {
      const { pool, stats, style, quiz } = get();
      const chars = poolChars(pool);
      const answer = nextChar(chars, stats, quiz?.answer ?? null);
      const next: Quiz = { answer, options: buildOptions(answer, chars), style };
      set({ quiz: next, picked: null });
      // A listening drill needs the signal before it can be answered.
      if (style === "listen") get().play(answer, "quiz");
    },

    answer: (choice) => {
      const { quiz, picked, stats, streak, bestStreak, asked, correct } = get();
      if (!quiz || picked) return;
      const right = choice === quiz.answer;
      const prev = stats[quiz.answer] ?? { asked: 0, right: 0 };
      const nextStreak = right ? streak + 1 : 0;
      set({
        picked: choice,
        streak: nextStreak,
        bestStreak: Math.max(bestStreak, nextStreak),
        asked: asked + 1,
        correct: correct + (right ? 1 : 0),
        stats: {
          ...stats,
          [quiz.answer]: { asked: prev.asked + 1, right: prev.right + (right ? 1 : 0) },
        },
      });
      persist();
      // Hearing the right answer immediately after a guess is what builds the
      // association, so a wrong pick replays it.
      if (!right && quiz.style === "listen") get().play(quiz.answer, "quiz");
    },

    resetProgress: () => {
      set({ stats: {}, bestStreak: 0, streak: 0, asked: 0, correct: 0 });
      persist();
    },

    setInput: (input) => set({ input }),
    setToMorse: (toMorse) => set({ toMorse }),
  };
});
