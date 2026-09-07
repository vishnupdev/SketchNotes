"use client";

import { useEffect } from "react";
import { currentCard, currentDeck, useCardsStore } from "@/store/useCardsStore";
import {
  countDeck,
  GRADE_LABELS,
  GRADES,
  intervalLabel,
  preview,
  type Grade,
} from "@/lib/Cards/srs";
import { CheckIcon, FlipIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** Which key answers which button, once the back is showing. */
const KEYS: Record<string, Grade> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };

/**
 * The review screen: one card, then four buttons.
 *
 * Deliberately the whole screen. Everything that could sit beside a card —
 * deck lists, counts, settings — makes the one decision being asked for
 * ("did you know this?") harder, and reviewing is a hundred small decisions in
 * a row.
 *
 * Each button says **when the card comes back** if you press it. That figure is
 * the only way to answer honestly: "Good" and "Easy" mean nothing on their own,
 * and seeing "3 d" against "10 d" is what makes the choice real. It comes from
 * `preview()`, which runs the same scheduler the answer will, so the promise on
 * the button is exactly what happens.
 */
export function ReviewPanel() {
  const deck = useCardsStore(currentDeck);
  const card = useCardsStore(currentCard);
  const revealed = useCardsStore((s) => s.revealed);
  const reveal = useCardsStore((s) => s.reveal);
  const answer = useCardsStore((s) => s.answer);
  const session = useCardsStore((s) => s.session);
  const setTool = useCardsStore((s) => s.setTool);

  // The keyboard is how anyone reviews more than a handful: space to flip,
  // 1–4 to answer. Ignored while typing, so editing a card is unaffected.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!card) return;

      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        reveal();
        return;
      }
      if (revealed && KEYS[event.key]) {
        event.preventDefault();
        answer(KEYS[event.key]);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, card, reveal, revealed]);

  if (!deck) return null;

  const counts = countDeck(deck.cards, Date.now());
  const now = Date.now();

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <CheckIcon size={26} />
        </span>
        <div>
          <h2 className="text-[19px] font-extrabold">
            {deck.cards.length === 0 ? "This deck is empty" : "Nothing due right now"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">
            {deck.cards.length === 0
              ? "Add a few cards, or paste a list you already have — one card a line, front and back split by a pipe or a tab."
              : session.answered.length > 0
                ? `${session.answered.length} answered this sitting. The next card is due in ${nextDue(deck.cards, now)}.`
                : `Everything here is scheduled ahead. The next card is due in ${nextDue(deck.cards, now)}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTool("decks")}
          className="tint rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-on-accent"
        >
          {deck.cards.length === 0 ? "Add cards" : "Edit this deck"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-[12px] text-ink-soft">
        <span className="truncate font-semibold text-text">{deck.name}</span>
        <span className="flex flex-none gap-2.5 tabular-nums">
          <span title="New cards">{counts.fresh} new</span>
          <span title="Cards in a learning step">{counts.learning} learning</span>
          <span title="Scheduled cards that are due">{counts.due} due</span>
        </span>
      </div>

      {/* The card. A fixed minimum height so the four buttons don't jump up the
          screen when a short answer is revealed. */}
      <div className="flex min-h-[13rem] flex-col justify-center gap-4 rounded-[18px] border border-border bg-panel p-6 text-center">
        <p className="whitespace-pre-wrap break-words text-[19px] font-bold leading-snug">
          {card.front}
        </p>

        {card.hint && !revealed && (
          <p className="text-[12.5px] italic text-ink-soft">{card.hint}</p>
        )}

        {revealed && (
          <>
            <hr className="mx-auto w-16 border-border" />
            <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed">
              {card.back}
            </p>
          </>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => answer(grade)}
              className={cx(
                "tint flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5",
                grade === "again"
                  ? "border-danger/50 hover:bg-danger hover:text-on-accent"
                  : grade === "good"
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-panel",
              )}
            >
              <span className="text-[13px] font-bold">{GRADE_LABELS[grade]}</span>
              {/* What pressing it actually does — the whole point. */}
              <span className="font-mono text-[11px] tabular-nums text-ink-soft">
                {intervalLabel(preview(card, grade, now))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={reveal}
          className="tint inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-bold text-on-accent"
        >
          <FlipIcon size={17} />
          Show the answer
        </button>
      )}

      <p className="text-center text-[11.5px] text-ink-soft">
        {revealed ? "1–4 answer · " : "Space or Enter flips · "}
        {session.answered.length} answered this sitting
        {session.again > 0 && `, ${session.again} to come back`}
      </p>
    </div>
  );
}

/** How long until the soonest card is due — the honest version of "come back later". */
function nextDue(cards: { due: number; phase: string }[], now: number): string {
  const upcoming = cards
    .filter((card) => card.phase !== "new" && card.due > now)
    .map((card) => card.due - now)
    .sort((a, b) => a - b);
  return upcoming.length > 0 ? intervalLabel(upcoming[0]) : "—";
}
