/**
 * Generating a password, and being honest about how strong it is.
 *
 * Two rules govern this file.
 *
 * **Randomness comes from `crypto.getRandomValues`, never `Math.random`.** A
 * generator seeded from the clock produces passwords that look exactly as
 * random as these and are guessable from the time they were made.
 *
 * **Strength is measured from the generator, not from the string.** A meter
 * that scores the *characters* of "Tr0ub4dor&3" gives it a high mark; the same
 * meter scores four random words as weak, and it is wrong on both counts. Here
 * the entropy is known exactly — it is a property of the alphabet and the
 * length that were asked for — so {@link estimate} reports it rather than
 * guessing, and says plainly that it only holds for a password made this way.
 */

import { BITS_PER_WORD, WORDS } from "./wordlist";

/** Character classes a generated password can draw from. */
export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /**
   * Drop the characters that get misread off a screen or a printout — `0 O o l
   * 1 I | 5 S 2 Z`. It costs a little entropy and is worth it for anything
   * anybody has to type from a piece of paper.
   */
  avoidAmbiguous: boolean;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  /** Append a digit — many sites still demand one, and refusing is not an option. */
  number: boolean;
}

export const PASSWORD_DEFAULTS: PasswordOptions = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};

export const PASSPHRASE_DEFAULTS: PassphraseOptions = {
  words: 5,
  separator: "-",
  capitalize: false,
  number: false,
};

export const MIN_LENGTH = 6;
export const MAX_LENGTH = 128;
export const MIN_WORDS = 3;
export const MAX_WORDS = 12;

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
/** Deliberately no quotes or backslashes: they break shell and CSV pasting. */
const SYMBOLS = "!#$%&()*+,-.:;<=>?@[]^_{|}~";
const AMBIGUOUS = new Set("0Oo1lI|5S2Z");

/**
 * A uniform integer in `[0, max)`.
 *
 * The rejection loop is the point. `random() % max` is biased whenever `max`
 * does not divide the range, which for a 90-character alphabet means some
 * characters appear measurably more often — a real, if small, reduction in
 * strength that the reported entropy would no longer describe.
 */
export function randomInt(max: number): number {
  if (max <= 0) throw new Error("randomInt needs a positive bound.");
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/** Fisher–Yates, so the guaranteed characters aren't all at the front. */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** The alphabet a set of options actually draws from. */
export function alphabet(options: PasswordOptions): string {
  const pools = [
    options.lower ? LOWER : "",
    options.upper ? UPPER : "",
    options.digits ? DIGITS : "",
    options.symbols ? SYMBOLS : "",
  ].join("");
  return options.avoidAmbiguous
    ? [...pools].filter((c) => !AMBIGUOUS.has(c)).join("")
    : pools;
}

/**
 * A password.
 *
 * One character is drawn from each selected class first, then the rest from the
 * union, then the whole thing is shuffled — so "must contain a digit" rules are
 * satisfied without the digit always landing in the same place. Guaranteeing a
 * class does slightly reduce entropy against a truly uniform draw, which is why
 * {@link estimate} is given the same options rather than the finished string.
 */
export function generatePassword(options: PasswordOptions): string {
  const pools = [
    options.lower ? LOWER : "",
    options.upper ? UPPER : "",
    options.digits ? DIGITS : "",
    options.symbols ? SYMBOLS : "",
  ].filter(Boolean);

  if (pools.length === 0) throw new Error("Pick at least one kind of character.");

  const all = alphabet(options);
  const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(options.length)));
  const chars: string[] = [];

  for (const pool of pools) {
    const usable = options.avoidAmbiguous ? [...pool].filter((c) => !AMBIGUOUS.has(c)) : [...pool];
    // A class emptied entirely by the ambiguity filter contributes nothing
    // rather than throwing — no selectable class can be emptied, but the guard
    // keeps a future addition from crashing the generator.
    if (usable.length > 0 && chars.length < length) chars.push(usable[randomInt(usable.length)]);
  }

  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  return shuffle(chars).join("");
}

/** A passphrase from the 256-word list. */
export function generatePassphrase(options: PassphraseOptions): string {
  const count = Math.max(MIN_WORDS, Math.min(MAX_WORDS, Math.round(options.words)));
  const words = Array.from({ length: count }, () => {
    const word = WORDS[randomInt(WORDS.length)];
    return options.capitalize ? word[0].toUpperCase() + word.slice(1) : word;
  });
  const phrase = words.join(options.separator);
  return options.number ? `${phrase}${options.separator}${randomInt(10)}` : phrase;
}

/** How a strength is described — five bands, from the entropy alone. */
export type StrengthBand = "weak" | "fair" | "good" | "strong" | "excellent";

export interface Strength {
  /** Bits of entropy in the *generator*, not in the finished string. */
  bits: number;
  band: StrengthBand;
  /** Plain-words band name for the meter. */
  label: string;
  /** How full the meter is, 0–1. Full at 128 bits, where more stops mattering. */
  fill: number;
  /** Time to exhaust half the keyspace at {@link GUESSES_PER_SECOND}. */
  crackTime: string;
}

/**
 * The assumed attack: an offline attacker with serious hardware against a fast
 * hash. A hundred billion guesses a second is roughly a handful of current GPUs
 * against unsalted SHA-1 — pessimistic for a site using bcrypt or Argon2, and
 * the right assumption to design against, since you never get to choose which
 * one a site used.
 */
export const GUESSES_PER_SECOND = 1e11;

const BANDS: [number, StrengthBand, string][] = [
  [0, "weak", "Weak"],
  [50, "fair", "Fair"],
  [70, "good", "Good"],
  [90, "strong", "Strong"],
  [110, "excellent", "Excellent"],
];

const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
const YEAR = 31_557_600;

/** A duration in the largest unit that still reads as a number. */
export function humanTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "longer than anyone will wait";
  if (seconds < SECOND) return "instantly";
  if (seconds < MINUTE) return `${Math.round(seconds)} seconds`;
  if (seconds < HOUR) return `${Math.round(seconds / MINUTE)} minutes`;
  if (seconds < DAY) return `${Math.round(seconds / HOUR)} hours`;
  if (seconds < YEAR) return `${Math.round(seconds / DAY)} days`;

  const years = seconds / YEAR;
  if (years < 1e3) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1e3)} thousand years`;
  if (years < 1e9) return `${Math.round(years / 1e6)} million years`;
  if (years < 1e12) return `${Math.round(years / 1e9)} billion years`;
  if (years < 1e15) return `${Math.round(years / 1e12)} trillion years`;
  return "longer than the universe has existed";
}

/** Grade a number of entropy bits. */
export function gradeBits(bits: number): Strength {
  const [, band, label] = [...BANDS].reverse().find(([floor]) => bits >= floor) ?? BANDS[0];
  // 2^bits / 2 guesses on average, at the assumed rate.
  const seconds = 2 ** (bits - 1) / GUESSES_PER_SECOND;

  return {
    bits,
    band,
    label,
    fill: Math.max(0, Math.min(1, bits / 128)),
    crackTime: humanTime(seconds),
  };
}

/** Strength of a password made with these options. */
export function estimatePassword(options: PasswordOptions): Strength {
  const size = alphabet(options).length;
  const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(options.length)));
  return gradeBits(size > 1 ? length * Math.log2(size) : 0);
}

/** Strength of a passphrase made with these options. */
export function estimatePassphrase(options: PassphraseOptions): Strength {
  const count = Math.max(MIN_WORDS, Math.min(MAX_WORDS, Math.round(options.words)));
  // The appended digit is one of ten, so log2(10) — not the 3.32 bits a
  // rounded-up "4 bits" would claim.
  return gradeBits(count * BITS_PER_WORD + (options.number ? Math.log2(10) : 0));
}

/**
 * A rough read of a password the user typed, for the vault's own passphrase
 * field.
 *
 * This is the guess {@link estimatePassword} exists to avoid, and it is only
 * used where there is no alternative: nothing here knows how that string was
 * chosen, so it is scored on its observed alphabet and length and then
 * penalised for the patterns that make a password predictable. It reads *low*
 * by design — under-stating a good password is a much cheaper mistake than
 * over-stating a bad one.
 */
export function estimateTyped(password: string): Strength {
  if (password === "") return gradeBits(0);

  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/\d/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 33;

  const unique = new Set(password).size;
  // Repetition is the pattern this can actually see: "aaaaaaaa" has the length
  // of a decent password and the entropy of one character.
  const effective = Math.min(password.length, unique * 2);
  let bits = effective * Math.log2(Math.max(size, 2));

  if (isWordShaped(password)) bits *= 0.34;

  return gradeBits(Math.round(bits));
}

/** The substitutions that fool a character-class meter and no attacker at all. */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
};

/**
 * True for "one word, lightly disguised" — `Passw0rd!`, `Summer2024`, `M0nkey`.
 *
 * This is the shape every cracking wordlist expands first, so scoring it on its
 * character classes over-states it by a factor of three. It is recognised by
 * *capitalisation*, not by a dictionary (there isn't one here): trailing digits
 * and punctuation are dropped, the leet substitutions are undone, and what is
 * left has to be a single run of letters with at most a leading capital.
 *
 * That last condition is what keeps a genuinely random password out. `f7Kq2xVm`
 * has capitals in the middle and a digit that is not a substitution, so it is
 * not word-shaped; `correct-horse` has a separator, so neither is it.
 */
function isWordShaped(password: string): boolean {
  const core = password.replace(/[\d!?.\-_*#]+$/, "");
  if (core.length === 0 || core.length > 16) return false;
  const letters = [...core].map((char) => LEET[char] ?? char).join("");
  return /^[A-Z]?[a-z]+$/.test(letters);
}
