/**
 * The International Morse Code table plus the pure functions built on it:
 * text ⇄ code conversion, the spoken "di-dah" rhythm used for learning, and the
 * character groups the reference chart is laid out from.
 *
 * Codes are written with ASCII `.` and `-`; {@link normalizeCode} accepts the
 * typographic variants people paste (·, •, −, –, —, *) so a copied message from
 * anywhere still decodes.
 */

/** Character → code. Uppercase keys; the table is ITU-R M.1677-1. */
export const MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
};

/** Code → character, for decoding. */
export const FROM_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([char, code]) => [code, char]),
);

/** A section of the reference chart. */
export interface CharGroup {
  id: string;
  label: string;
  /** Short line explaining what the group is for. */
  hint: string;
  chars: string[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = "0123456789".split("");
const PUNCTUATION = [".", ",", "?", "'", "!", "/", "(", ")", "&", ":", ";", "=", "+", "-", "_", '"', "$", "@"];

export const CHAR_GROUPS: CharGroup[] = [
  {
    id: "letters",
    label: "Letters",
    hint: "The 26 letters — start here. E and T are one signal each.",
    chars: LETTERS,
  },
  {
    id: "numbers",
    label: "Numbers",
    hint: "Five signals each, sliding from all dahs (0) to all dits (5).",
    chars: NUMBERS,
  },
  {
    id: "punctuation",
    label: "Punctuation",
    hint: "Used in real traffic — learn the full stop, comma and question mark first.",
    chars: PUNCTUATION,
  },
];

/** Every character the app can play, in chart order. */
export const ALL_CHARS: string[] = CHAR_GROUPS.flatMap((g) => g.chars);

/** Well-known prosigns — sent as one run of signals, with no gaps inside. */
export const PROSIGNS: { code: string; name: string; meaning: string }[] = [
  { code: "...---...", name: "SOS", meaning: "Distress — the one signal everyone knows" },
  { code: ".-.-.", name: "AR", meaning: "End of message" },
  { code: "-.-", name: "K", meaning: "Go ahead, over to you" },
  { code: "...-.-", name: "SK", meaning: "End of contact" },
  { code: ".-...", name: "AS", meaning: "Wait" },
  { code: "........", name: "HH", meaning: "Correction — that last word was wrong" },
];

/** Replace typographic dot/dash lookalikes with plain ASCII, and `|` with `/`. */
export function normalizeCode(raw: string): string {
  return raw
    .replace(/[·•∙*]/g, ".")
    .replace(/[−–—_]/g, "-")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ");
}

/** Code for one character, or `null` if it isn't in the table. */
export const codeFor = (char: string): string | null => MORSE[char.toUpperCase()] ?? null;

/**
 * Text → Morse. Characters are separated by a space and words by ` / `, the
 * conventional written form. Anything not in the table is skipped.
 */
export function encode(text: string): string {
  return text
    .toUpperCase()
    .split(/\s+/)
    .map((word) =>
      word
        .split("")
        .map((c) => MORSE[c])
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" / ");
}

/**
 * Morse → text. Tolerates the usual variations: `/` or `|` between words, and
 * runs of extra spaces. Unrecognised groups become `?` so a mistyped signal is
 * visible rather than silently dropped.
 */
export function decode(code: string): string {
  const cleaned = normalizeCode(code).trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s*\/\s*|\s{3,}/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => FROM_CODE[token] ?? "?")
        .join(""),
    )
    .filter(Boolean)
    .join(" ");
}

/**
 * The rhythm read aloud: a dot is "di" ("dit" when it ends the character) and a
 * dash is "dah". This is how Morse is actually taught — the sound of a letter,
 * not its shape — and it doubles as the screen-reader label for a pattern.
 */
export function spoken(code: string): string {
  return code
    .split("")
    .map((sym, i) => (sym === "-" ? "dah" : i === code.length - 1 ? "dit" : "di"))
    .join("-");
}

/** Milliseconds of one dit at `wpm`, from the PARIS standard (50 units/word). */
export const unitMs = (wpm: number): number => 1200 / wpm;

/** Duration of a character's full pattern, excluding the gap that follows it. */
export function codeDurationMs(code: string, wpm: number): number {
  const u = unitMs(wpm);
  const marks = code.split("").reduce((sum, s) => sum + (s === "-" ? 3 : 1), 0);
  return (marks + Math.max(0, code.length - 1)) * u;
}
