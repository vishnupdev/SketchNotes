"use client";

import { useMemo } from "react";
import { currentDeck, useCardsStore } from "@/store/useCardsStore";
import { countDeck, forecast, LEECH_LAPSES, maturity } from "@/lib/Cards/srs";

const DAYS = 14;

/**
 * How the deck is going — and the two figures that are worth acting on.
 *
 * **Known** is weighted by interval, not by cards answered: a card at four
 * months counts fully, one at a day barely counts, and a card you have failed
 * ten times counts for nothing. A progress bar that filled up as you answered
 * would reach 100% on a deck you cannot recall a word of.
 *
 * **Worth rewriting** is the leech count. A card failed six times is not a card
 * you need to see again — it is a card that asks two things at once, or whose
 * answer is ambiguous, and the fix is to rewrite it.
 */
export function ProgressPanel() {
  const deck = useCardsStore(currentDeck);
  const decks = useCardsStore((s) => s.decks);
  const session = useCardsStore((s) => s.session);

  const now = Date.now();
  const counts = useMemo(() => (deck ? countDeck(deck.cards, now) : null), [deck, now]);
  const days = useMemo(() => (deck ? forecast(deck.cards, DAYS, now) : []), [deck, now]);

  if (!deck || !counts) return null;

  const known = maturity(deck.cards);
  const busiest = Math.max(1, ...days);
  const total = decks.reduce((sum, item) => sum + item.cards.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-border bg-panel p-4">
        <h2 className="text-[15px] font-extrabold">{deck.name}</h2>

        <p className="mt-3 text-[34px] font-extrabold leading-none">{Math.round(known * 100)}%</p>
        <p className="text-[12px] text-ink-soft">
          known — weighted by how far out each card is scheduled, not by how many you have answered
        </p>

        <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-border">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${Math.max(1, known * 100)}%` }}
          />
        </span>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Figure label="Cards" value={counts.total} />
          <Figure label="Never seen" value={counts.fresh} />
          <Figure label="Due now" value={counts.due + counts.learning} />
          <Figure label="Scheduled" value={counts.known} />
        </dl>
      </div>

      {counts.leeches > 0 && (
        <p className="rounded-[14px] border border-danger/50 bg-panel p-4 text-[13px] leading-relaxed">
          <strong className="font-bold">
            {counts.leeches} card{counts.leeches === 1 ? "" : "s"} worth rewriting.
          </strong>{" "}
          <span className="text-ink-soft">
            Failed {LEECH_LAPSES} times or more. Seeing them again is not the fix — a card that keeps
            being missed is usually asking two things at once, or has an answer you would phrase
            three different ways. Split it, or make the answer exact.
          </span>
        </p>
      )}

      <figure className="m-0 rounded-[14px] border border-border bg-panel p-4">
        <figcaption>
          <h3 className="text-[13.5px] font-bold">What is coming</h3>
          <p className="text-[11.5px] text-ink-soft">
            Cards falling due over the next {DAYS} days. Anything overdue is counted today, because
            that is when you will be asked for it.
          </p>
        </figcaption>

        {/* One series, one colour, and a baseline at zero — bar height is the
            count, so a floating baseline would exaggerate a quiet week. */}
        <ul className="mt-3 flex h-28 items-end gap-1">
          {days.map((count, index) => (
            <li key={index} className="flex h-full flex-1 flex-col justify-end gap-1">
              <span
                className="w-full rounded-t-[4px] bg-accent"
                style={{ height: `${(count / busiest) * 100}%`, minHeight: count > 0 ? 3 : 0 }}
                title={`${count} card${count === 1 ? "" : "s"} ${
                  index === 0 ? "today" : `in ${index} day${index === 1 ? "" : "s"}`
                }`}
              />
              <span className="text-center font-mono text-[9px] tabular-nums text-ink-soft">
                {index === 0 ? "now" : index}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-2 text-[11.5px] text-ink-soft">
          Busiest day: {busiest} card{busiest === 1 ? "" : "s"}
          {days.reduce((sum, count) => sum + count, 0) === 0 &&
            " — nothing is scheduled in this window"}
        </p>
      </figure>

      <p className="text-[12px] leading-relaxed text-ink-soft">
        {session.answered.length > 0
          ? `${session.answered.length} answered this sitting, ${session.again} of them to come back. `
          : ""}
        {decks.length} deck{decks.length === 1 ? "" : "s"} here, {total} card
        {total === 1 ? "" : "s"} in all — kept on this device, and exportable with their schedules
        from the Decks tab.
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">{label}</dt>
      <dd className="text-[19px] font-bold leading-tight tabular-nums">{value}</dd>
    </div>
  );
}
