/** Shared types for the Morse Code app (lib, store and components). */

/** Which tool of the app is on screen. */
export type MorseMode = "learn" | "practice" | "translate" | "key";

/** Which characters a practice drill draws from. */
export type PracticePool = "letters" | "numbers" | "alphanumeric" | "all";

/** How a practice question is presented. */
export type PracticeStyle = "listen" | "read";

/** Playback + output preferences, shared by every mode. */
export interface MorseSettings {
  /** Words per minute (PARIS standard) — drives every dit/dah duration. */
  wpm: number;
  /** Sidetone pitch in Hz. */
  tone: number;
  /** Play an audible tone. */
  sound: boolean;
  /** Flash the on-screen lamp. */
  light: boolean;
  /** Buzz the device (where the Vibration API exists). */
  haptics: boolean;
}

/** How well one character is known, from practice answers. */
export interface CharStat {
  asked: number;
  right: number;
}

/** A single practice question. */
export interface Quiz {
  /** The character being tested. */
  answer: string;
  /** Four candidate characters, including the answer. */
  options: string[];
  /** Whether the prompt is heard or read. */
  style: PracticeStyle;
}

/** The persisted slice of the app — settings plus learning progress. */
export interface MorseSnapshot {
  settings: MorseSettings;
  pool: PracticePool;
  style: PracticeStyle;
  stats: Record<string, CharStat>;
  bestStreak: number;
}
