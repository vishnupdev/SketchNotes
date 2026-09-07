/**
 * Spaced repetition — the schedule, and nothing else.
 *
 * An SM-2 variant, the algorithm Anki and SuperMemo made ordinary: each card
 * carries an *ease* factor and an interval, a good answer multiplies the
 * interval by the ease, and a failed answer sends the card back to the short
 * learning steps. New and lapsed cards go through {@link LEARNING_STEPS} in
 * minutes before earning their first interval in days, because a card you have
 * just got wrong needs to come back in this session, not tomorrow.
 *
 * Two properties are worth stating, because they are what a scheduler is for
 * and both are easy to break:
 *
 *  - **A review only ever moves a card forward in one way.** `review()` is a
 *    pure function of the card, the grade and the moment — no clock reads, no
 *    mutation — so the same answer at the same time always yields the same
 *    schedule, and the tests can drive months of study in a millisecond.
 *  - **Ease is clamped and floors at {@link MIN_EASE}.** Without the floor a
 *    run of failures drives the multiplier towards zero and the card is stuck
 *    at a one-day interval for ever — the classic "leech" that makes a deck
 *    feel broken.
 */

/** What the four answer buttons mean. */
export type Grade = "again" | "hard" | "good" | "easy";

export const GRADES: Grade[] = ["again", "hard", "good", "easy"];

export const GRADE_LABELS: Record<Grade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** Where a card is in its life. */
export type Phase = "new" | "learning" | "review";

export interface Card {
  id: string;
  front: string;
  back: string;
  /** Optional nudge, revealed before the answer. */
  hint?: string;
  phase: Phase;
  /** Index into {@link LEARNING_STEPS}; meaningless outside `learning`. */
  step: number;
  /** Current interval in days. 0 until the card graduates. */
  interval: number;
  /** SM-2 ease factor. */
  ease: number;
  /** When it is next due, in epoch ms. */
  due: number;
  /** Total answers given. */
  reps: number;
  /** Times it was failed after having graduated — the leech signal. */
  lapses: number;
  /** When it was created, so a deck can be shown in the order it was written. */
  created: number;
}

/** Minutes a new or lapsed card steps through before earning a real interval. */
export const LEARNING_STEPS = [1, 10] as const;

/** Interval, in days, a card gets when it leaves the learning steps. */
export const GRADUATING_INTERVAL = 1;
/** …and when it leaves them on "Easy", skipping the rest. */
export const EASY_INTERVAL = 4;

export const STARTING_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.2;

/** Nothing is ever scheduled beyond this — a card is not useful in 30 years. */
export const MAX_INTERVAL = 365 * 10;

const MINUTE = 60_000;
const DAY = 86_400_000;

const clampEase = (ease: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
const clampInterval = (days: number) => Math.min(MAX_INTERVAL, Math.max(1, days));

/** A brand-new card, due immediately. */
export function newCard(
  id: string,
  front: string,
  back: string,
  hint: string | undefined,
  now: number,
): Card {
  return {
    id,
    front,
    back,
    ...(hint && hint.trim() !== "" ? { hint: hint.trim() } : {}),
    phase: "new",
    step: 0,
    interval: 0,
    ease: STARTING_EASE,
    due: now,
    reps: 0,
    lapses: 0,
    created: now,
  };
}

/**
 * Answer a card.
 *
 * The ease adjustments are SM-2's, in the form Anki states them: again −0.20,
 * hard −0.15, good unchanged, easy +0.15. "Hard" deliberately still advances
 * the interval (by 1.2 rather than by the ease) instead of holding it: a card
 * you got right, slowly, should not come back as often as one you failed.
 */
export function review(card: Card, grade: Grade, now: number): Card {
  const reps = card.reps + 1;

  // Learning and new cards work through the minute-scale steps. A failure
  // restarts them; "easy" leaves them at once.
  if (card.phase !== "review") {
    if (grade === "again") {
      return { ...card, phase: "learning", step: 0, reps, due: now + LEARNING_STEPS[0] * MINUTE };
    }
    if (grade === "easy") {
      return {
        ...card,
        phase: "review",
        step: 0,
        interval: EASY_INTERVAL,
        due: now + EASY_INTERVAL * DAY,
        reps,
      };
    }
    // "Hard" repeats the current step rather than advancing.
    const step = grade === "hard" ? card.step : card.step + 1;
    if (step >= LEARNING_STEPS.length) {
      return {
        ...card,
        phase: "review",
        step: 0,
        interval: GRADUATING_INTERVAL,
        due: now + GRADUATING_INTERVAL * DAY,
        reps,
      };
    }
    return { ...card, phase: "learning", step, reps, due: now + LEARNING_STEPS[step] * MINUTE };
  }

  if (grade === "again") {
    return {
      ...card,
      phase: "learning",
      step: 0,
      // The interval is kept, not zeroed: a lapsed card that had reached three
      // months is still better known than a new one, and re-graduating it from
      // one day would waste weeks of reviews.
      ease: clampEase(card.ease - 0.2),
      due: now + LEARNING_STEPS[0] * MINUTE,
      reps,
      lapses: card.lapses + 1,
    };
  }

  const ease = clampEase(card.ease + (grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0));
  const factor = grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease;
  const interval = clampInterval(Math.round(Math.max(card.interval, 1) * factor));

  return { ...card, phase: "review", step: 0, ease, interval, due: now + interval * DAY, reps };
}

/** What the next interval would be, so a button can say "in 4 days". */
export function preview(card: Card, grade: Grade, now: number): number {
  return review(card, grade, now).due - now;
}

/** True if the card is ready to be shown. */
export const isDue = (card: Card, now: number): boolean => card.due <= now;

/**
 * The queue, in the order a session should see it.
 *
 * Learning cards come first — they are due in minutes and the whole point of a
 * short step is that it happens now — then everything else by how overdue it
 * is. New cards are interleaved at the end rather than at the front, so a big
 * import can't bury the reviews that are the reason to open the app at all.
 */
export function dueQueue(cards: Card[], now: number): Card[] {
  const due = cards.filter((card) => isDue(card, now));
  const rank = (card: Card) => (card.phase === "learning" ? 0 : card.phase === "review" ? 1 : 2);
  return due.sort((a, b) => rank(a) - rank(b) || a.due - b.due || a.created - b.created);
}

export interface DeckCounts {
  total: number;
  /** Never answered. */
  fresh: number;
  learning: number;
  /** Graduated cards that are due now. */
  due: number;
  /** Graduated and not yet due. */
  known: number;
  /** Cards failed enough times to be worth rewriting. */
  leeches: number;
}

/** Cards lapsed this often are worth rewriting rather than re-reviewing. */
export const LEECH_LAPSES = 6;

export function countDeck(cards: Card[], now: number): DeckCounts {
  return {
    total: cards.length,
    fresh: cards.filter((card) => card.phase === "new").length,
    learning: cards.filter((card) => card.phase === "learning" && isDue(card, now)).length,
    due: cards.filter((card) => card.phase === "review" && isDue(card, now)).length,
    known: cards.filter((card) => card.phase === "review" && !isDue(card, now)).length,
    leeches: cards.filter((card) => card.lapses >= LEECH_LAPSES).length,
  };
}

/**
 * How many cards fall due on each of the next `days` days, starting today.
 *
 * Anything already overdue lands in day 0 — the forecast is what you will be
 * asked to do, and a card that was due last week is asked today.
 */
export function forecast(cards: Card[], days: number, now: number): number[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const buckets = new Array(Math.max(1, days)).fill(0) as number[];

  for (const card of cards) {
    if (card.phase === "new") continue;
    const day = Math.floor((card.due - startOfToday) / DAY);
    const index = Math.max(0, day);
    if (index < buckets.length) buckets[index] += 1;
  }

  return buckets;
}

/** An interval as a phrase — "10 minutes", "3 days", "2.5 months". */
export function intervalLabel(ms: number): string {
  if (ms < MINUTE) return "now";
  if (ms < 45 * MINUTE) return `${Math.round(ms / MINUTE)} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} hr`;

  const days = ms / DAY;
  if (days < 31) return `${Math.round(days)} d`;
  if (days < 365) return `${(days / 30.44).toFixed(days < 62 ? 1 : 0)} mo`;
  return `${(days / 365.25).toFixed(days < 730 ? 1 : 0)} yr`;
}

/**
 * How well a deck is known, 0–1, for the one figure worth putting on screen.
 *
 * Weighted by interval rather than by "cards answered": a card at four months
 * counts fully, one at a day barely counts, and a card you have seen once and
 * forgotten does not count at all. It is the honest version of a progress bar —
 * answering the same card wrongly ten times moves it nowhere.
 */
export function maturity(cards: Card[]): number {
  if (cards.length === 0) return 0;
  const mature = 21; // The interval at which a card is conventionally "known".
  const total = cards.reduce(
    (sum, card) => sum + Math.min(1, card.phase === "review" ? card.interval / mature : 0),
    0,
  );
  return total / cards.length;
}
