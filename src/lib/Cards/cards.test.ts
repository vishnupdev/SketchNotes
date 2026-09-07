import { describe, expect, it } from "vitest";
import {
  countDeck,
  dueQueue,
  EASY_INTERVAL,
  forecast,
  GRADUATING_INTERVAL,
  intervalLabel,
  LEARNING_STEPS,
  LEECH_LAPSES,
  MAX_EASE,
  MAX_INTERVAL,
  maturity,
  MIN_EASE,
  newCard,
  preview,
  review,
  type Card,
  type Grade,
} from "./srs";
import { fromBackup, parseImport, sampleDeck, toBackup, toCards, toText } from "./deck";

/**
 * Cards.
 *
 * A scheduler cannot be checked by using it — you would have to study for a
 * month to find out it was wrong, and a wrong schedule doesn't look wrong, it
 * just quietly stops teaching you. So the tests drive it: sequences of answers
 * against a fixed clock, checking the properties that make spaced repetition
 * work — intervals that grow, ease that is clamped, failures that come back in
 * minutes, and a card that is never lost.
 */

const NOW = Date.UTC(2026, 0, 15, 9, 0, 0);
const MINUTE = 60_000;
const DAY = 86_400_000;

const make = (over: Partial<Card> = {}): Card => ({
  ...newCard("c1", "front", "back", undefined, NOW),
  ...over,
});

/** Answer a card a number of times, advancing the clock to each due date. */
function study(card: Card, grades: Grade[]): Card {
  let current = card;
  let clock = NOW;
  for (const grade of grades) {
    clock = Math.max(clock, current.due);
    current = review(current, grade, clock);
  }
  return current;
}

describe("a new card", () => {
  it("is due at once and has been seen never", () => {
    const card = make();
    expect(card.phase).toBe("new");
    expect(card.due).toBe(NOW);
    expect(card.reps).toBe(0);
    expect(card.interval).toBe(0);
  });

  it("steps through the learning steps on Good", () => {
    const first = review(make(), "good", NOW);
    expect(first.phase).toBe("learning");
    expect(first.step).toBe(1);
    expect(first.due).toBe(NOW + LEARNING_STEPS[1] * MINUTE);

    const graduated = review(first, "good", first.due);
    expect(graduated.phase).toBe("review");
    expect(graduated.interval).toBe(GRADUATING_INTERVAL);
    expect(graduated.due).toBe(first.due + GRADUATING_INTERVAL * DAY);
  });

  it("leaves the steps at once on Easy", () => {
    const card = review(make(), "easy", NOW);
    expect(card.phase).toBe("review");
    expect(card.interval).toBe(EASY_INTERVAL);
  });

  it("repeats the step it is on for Hard, rather than advancing", () => {
    const card = review(make(), "hard", NOW);
    expect(card.step).toBe(0);
    expect(card.due).toBe(NOW + LEARNING_STEPS[0] * MINUTE);
  });

  it("comes back in a minute when failed", () => {
    const card = review(make(), "again", NOW);
    expect(card.phase).toBe("learning");
    expect(card.due).toBe(NOW + LEARNING_STEPS[0] * MINUTE);
    // A card never studied cannot lapse — there was nothing to forget.
    expect(card.lapses).toBe(0);
  });
});

describe("a graduated card", () => {
  const graduated = study(make(), ["good", "good"]);

  it("multiplies its interval by its ease on Good", () => {
    const next = review(graduated, "good", graduated.due);
    expect(next.interval).toBe(Math.round(GRADUATING_INTERVAL * 2.5));
    expect(next.ease).toBe(2.5);
  });

  it("advances more slowly on Hard, but still advances", () => {
    const next = review({ ...graduated, interval: 10 }, "hard", graduated.due);
    expect(next.interval).toBe(12);
    expect(next.ease).toBeCloseTo(2.35, 5);
    expect(next.interval).toBeGreaterThan(10);
  });

  it("advances fastest on Easy, and raises the ease", () => {
    const next = review({ ...graduated, interval: 10 }, "easy", graduated.due);
    expect(next.ease).toBeCloseTo(2.65, 5);
    expect(next.interval).toBe(Math.round(10 * 2.65 * 1.3));
  });

  it("grows the interval every time it is known", () => {
    let card = graduated;
    const intervals: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      card = review(card, "good", card.due);
      intervals.push(card.interval);
    }
    // 1 → 3 → 6 → 15 → 38 → …, each strictly larger than the last.
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
    expect(intervals[intervals.length - 1]).toBeGreaterThan(300);
  });

  it("goes back to minutes when failed, and counts the lapse", () => {
    const lapsed = review({ ...graduated, interval: 90 }, "again", graduated.due);
    expect(lapsed.phase).toBe("learning");
    expect(lapsed.due).toBe(graduated.due + LEARNING_STEPS[0] * MINUTE);
    expect(lapsed.lapses).toBe(1);
    // The interval is kept: a card that had reached three months is still
    // better known than a new one, and re-graduating from a day wastes weeks.
    expect(lapsed.interval).toBe(90);
    expect(lapsed.ease).toBeCloseTo(2.3, 5);
  });

  it("re-graduates a lapsed card from the interval it kept", () => {
    const lapsed = review({ ...graduated, interval: 90 }, "again", graduated.due);
    const back = study(lapsed, ["good", "good"]);
    expect(back.phase).toBe("review");
    // Graduating sets the standard interval; the *next* Good multiplies from it.
    expect(back.interval).toBe(GRADUATING_INTERVAL);
  });
});

describe("ease", () => {
  it("only charges a lapse once per failure, not once per relearning step", () => {
    // Failing again while relearning is not a second lapse — the card has
    // already been sent back, and charging it twice would drive a card that is
    // merely new-to-you straight to the ease floor.
    const card = study(make(), ["good", "good", "again", "again", "again"]);
    expect(card.lapses).toBe(1);
    expect(card.ease).toBeCloseTo(2.3, 5);
  });

  it("floors, so a repeatedly-failed card is never stuck at one day for ever", () => {
    // Twelve full lapse-and-relearn cycles, which is what actually charges the
    // ease each time: −0.2 a cycle would reach 0.1 without the clamp.
    const cycles = Array.from({ length: 12 }, () => ["again", "good", "good"] as Grade[]).flat();
    const card = study(make(), ["good", "good", ...cycles]);
    expect(card.ease).toBe(MIN_EASE);
  });

  it("ceilings, so an easy card does not run away", () => {
    const card = study(make(), ["easy", ...Array<Grade>(20).fill("easy")]);
    expect(card.ease).toBe(MAX_EASE);
  });

  it("caps the interval at ten years", () => {
    const card = study(make(), ["easy", ...Array<Grade>(40).fill("easy")]);
    expect(card.interval).toBe(MAX_INTERVAL);
    expect(card.due).toBe(card.due); // finite, not Infinity
    expect(Number.isFinite(card.due)).toBe(true);
  });
});

describe("review", () => {
  it("does not mutate the card it is given", () => {
    const card = make();
    const snapshot = { ...card };
    review(card, "good", NOW);
    expect(card).toEqual(snapshot);
  });

  it("counts every answer, right or wrong", () => {
    expect(study(make(), ["again", "good", "again", "hard", "good"]).reps).toBe(5);
  });

  it("previews the interval each button would give, in order", () => {
    const card = { ...study(make(), ["good", "good"]), interval: 10 };
    const at = card.due;
    expect(preview(card, "again", at)).toBeLessThan(preview(card, "hard", at));
    expect(preview(card, "hard", at)).toBeLessThan(preview(card, "good", at));
    expect(preview(card, "good", at)).toBeLessThan(preview(card, "easy", at));
  });

  it("can show Good and Easy as the same interval on a one-day card", () => {
    // 1 × 2.5 and 1 × 2.65 × 1.3 both round to three days. Worth pinning: the
    // buttons agreeing here is arithmetic, not a bug to be papered over.
    const fresh = study(make(), ["good", "good"]);
    expect(preview(fresh, "good", fresh.due)).toBe(preview(fresh, "easy", fresh.due));
  });
});

describe("the queue", () => {
  const cards: Card[] = [
    make({ id: "new", phase: "new", due: NOW }),
    make({ id: "later", phase: "review", interval: 5, due: NOW + 3 * DAY }),
    make({ id: "overdue", phase: "review", interval: 5, due: NOW - 4 * DAY }),
    make({ id: "learning", phase: "learning", due: NOW - MINUTE }),
    make({ id: "duetoday", phase: "review", interval: 5, due: NOW - MINUTE }),
  ];

  it("holds back what is not due yet", () => {
    expect(dueQueue(cards, NOW).map((card) => card.id)).not.toContain("later");
  });

  it("puts learning first, then the most overdue, then new", () => {
    expect(dueQueue(cards, NOW).map((card) => card.id)).toEqual([
      "learning",
      "overdue",
      "duetoday",
      "new",
    ]);
  });

  it("is empty when nothing is due", () => {
    expect(dueQueue([cards[1]], NOW)).toEqual([]);
  });
});

describe("counting a deck", () => {
  it("separates fresh, learning, due, known and leeches", () => {
    const counts = countDeck(
      [
        make({ phase: "new" }),
        make({ phase: "new" }),
        make({ phase: "learning", due: NOW - MINUTE }),
        make({ phase: "review", due: NOW - DAY, interval: 3 }),
        make({ phase: "review", due: NOW + DAY, interval: 30 }),
        make({ phase: "review", due: NOW + DAY, interval: 30, lapses: LEECH_LAPSES }),
      ],
      NOW,
    );
    expect(counts).toMatchObject({ total: 6, fresh: 2, learning: 1, due: 1, known: 2, leeches: 1 });
  });
});

describe("forecast", () => {
  it("puts everything overdue in today, and buckets the rest by day", () => {
    const days = forecast(
      [
        make({ phase: "review", due: NOW - 10 * DAY }),
        make({ phase: "review", due: NOW }),
        make({ phase: "review", due: NOW + DAY }),
        make({ phase: "review", due: NOW + DAY }),
        make({ phase: "review", due: NOW + 6 * DAY }),
        make({ phase: "new" }), // never scheduled, so never forecast
      ],
      7,
      NOW,
    );
    expect(days).toHaveLength(7);
    expect(days[0]).toBe(2);
    expect(days[1]).toBe(2);
    expect(days[6]).toBe(1);
    expect(days.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("drops what falls beyond the window rather than piling it on the last day", () => {
    expect(forecast([make({ phase: "review", due: NOW + 90 * DAY })], 7, NOW)).toEqual(
      new Array(7).fill(0),
    );
  });
});

describe("maturity", () => {
  it("weights by interval, so repeated failures move nothing", () => {
    expect(maturity([])).toBe(0);
    expect(maturity([make({ phase: "new" })])).toBe(0);
    expect(maturity([make({ phase: "learning", reps: 20, interval: 60 })])).toBe(0);
    expect(maturity([make({ phase: "review", interval: 60 })])).toBe(1);
    expect(maturity([make({ phase: "review", interval: 21 })])).toBe(1);
    expect(maturity([make({ phase: "review", interval: 21 }), make({ phase: "new" })])).toBe(0.5);
  });
});

describe("intervalLabel", () => {
  it("reads as a phrase at every scale", () => {
    expect(intervalLabel(30_000)).toBe("now");
    expect(intervalLabel(10 * MINUTE)).toBe("10 min");
    expect(intervalLabel(4 * 3_600_000)).toBe("4 hr");
    expect(intervalLabel(3 * DAY)).toBe("3 d");
    expect(intervalLabel(45 * DAY)).toMatch(/mo$/);
    expect(intervalLabel(400 * DAY)).toMatch(/yr$/);
  });
});

describe("parseImport", () => {
  it("reads a tab-separated export", () => {
    const result = parseImport("front\tback\nsecond\tanswer");
    expect(result.separator).toBe("\t");
    expect(result.cards).toEqual([
      { front: "front", back: "back" },
      { front: "second", back: "answer" },
    ]);
  });

  it("reads pipe-separated lines, and a third field as a hint", () => {
    const result = parseImport("q | a | a nudge");
    expect(result.cards[0]).toEqual({ front: "q", back: "a", hint: "a nudge" });
  });

  it("picks the separator that splits the most lines, not the first one seen", () => {
    // Commas are everywhere in the text; the pipe is the real separator.
    const result = parseImport(
      "Ada Lovelace, mathematician | wrote the first algorithm\nGrace Hopper, admiral | built the first compiler",
    );
    expect(result.separator).toBe(" | ");
    expect(result.cards[0].front).toBe("Ada Lovelace, mathematician");
  });

  it("skips comments and blank lines", () => {
    const result = parseImport("# My deck\n\nq|a\n\n# another note\n");
    expect(result.cards).toHaveLength(1);
    expect(result.skipped).toEqual([]);
  });

  it("reports the lines it could not split instead of dropping them", () => {
    const result = parseImport("q|a\njust one side\nalso one side");
    expect(result.cards).toHaveLength(1);
    expect(result.skipped).toEqual(["just one side", "also one side"]);
  });

  it("reads nothing out of nothing", () => {
    expect(parseImport("   \n\n").cards).toEqual([]);
  });

  it("turns rows into new, unstudied cards with distinct ids", () => {
    const cards = toCards(parseImport("a|1\nb|2\nc|3").cards, NOW);
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.id)).size).toBe(3);
    for (const card of cards) expect(card.phase).toBe("new");
  });
});

describe("export and backup", () => {
  it("writes the text form back in a shape the importer reads", () => {
    const deck = sampleDeck(NOW);
    const round = parseImport(toText(deck));
    expect(round.cards.map((card) => card.front)).toEqual(deck.cards.map((card) => card.front));
    expect(round.cards.map((card) => card.back)).toEqual(deck.cards.map((card) => card.back));
  });

  it("round-trips the schedule through a JSON backup", () => {
    const deck = sampleDeck(NOW);
    deck.cards[0] = study(deck.cards[0], ["good", "good", "good", "easy"]);

    const [restored] = fromBackup(toBackup([deck]), NOW);
    expect(restored.name).toBe(deck.name);
    expect(restored.cards).toHaveLength(deck.cards.length);
    // The whole point of the JSON form: the review history survives.
    expect(restored.cards[0]).toMatchObject({
      phase: deck.cards[0].phase,
      interval: deck.cards[0].interval,
      ease: deck.cards[0].ease,
      reps: deck.cards[0].reps,
      due: deck.cards[0].due,
    });
  });

  it("loads a backup that is missing fields rather than crashing on it", () => {
    const json = JSON.stringify({ decks: [{ cards: [{ front: "q", back: "a" }] }] });
    const [deck] = fromBackup(json, NOW);
    expect(deck.name).toBe("Imported deck");
    expect(deck.id).not.toBe("");
    expect(deck.cards[0]).toMatchObject({ phase: "new", ease: 2.5, reps: 0 });
  });

  it("drops entries that are not cards, and keeps the ones that are", () => {
    const json = JSON.stringify({ decks: [{ name: "d", cards: [null, 7, { front: "q", back: "a" }, {}] }] });
    expect(fromBackup(json, NOW)[0].cards).toHaveLength(1);
  });

  it("refuses something that is not a backup", () => {
    expect(() => fromBackup("[]", NOW)).toThrow(/no decks/);
    expect(() => fromBackup('"hello"', NOW)).toThrow();
    expect(() => fromBackup("{ not json", NOW)).toThrow();
  });
});
