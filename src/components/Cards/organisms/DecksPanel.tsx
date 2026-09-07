"use client";

import { useState } from "react";
import { currentDeck, useCardsStore } from "@/store/useCardsStore";
import { parseImport, toText } from "@/lib/Cards/deck";
import { LEECH_LAPSES, intervalLabel, type Card } from "@/lib/Cards/srs";
import { saveBlob } from "@/lib/download";
import {
  DownloadIcon,
  ImportIcon,
  PlusIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Decks and the cards in them: write, paste in bulk, edit, back up.
 *
 * The paste box is the part that matters. Typing cards one at a time is the
 * reason most decks are never built, so an import takes whatever shape you
 * already have — a tab-separated export, `front | back` lines, a dash — works
 * out the separator from the lines themselves, and **says what it could not
 * read** rather than dropping those lines quietly (see `lib/Cards/deck.ts`).
 */
export function DecksPanel() {
  const decks = useCardsStore((s) => s.decks);
  const deck = useCardsStore(currentDeck);
  const selectDeck = useCardsStore((s) => s.selectDeck);
  const addDeck = useCardsStore((s) => s.addDeck);
  const renameDeck = useCardsStore((s) => s.renameDeck);
  const removeDeck = useCardsStore((s) => s.removeDeck);
  const addCard = useCardsStore((s) => s.addCard);
  const updateCard = useCardsStore((s) => s.updateCard);
  const removeCard = useCardsStore((s) => s.removeCard);
  const importCards = useCardsStore((s) => s.importCards);
  const importBackup = useCardsStore((s) => s.importBackup);
  const exportBackup = useCardsStore((s) => s.exportBackup);

  const [mode, setMode] = useState<"none" | "one" | "bulk">("none");
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!deck) return null;

  const loadBackup = async (file: File) => {
    try {
      const count = importBackup(await file.text());
      setNotice(`${count} card${count === 1 ? "" : "s"} added, with their schedules.`);
    } catch {
      setNotice("That file is not a deck backup this can read.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Deck picker. A row of chips rather than a select: switching deck is the
          most frequent thing done on this screen. */}
      <div className="scroll-slim -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {decks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectDeck(item.id)}
            aria-current={item.id === deck.id}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold",
              item.id === deck.id
                ? "border-accent bg-accent text-on-accent"
                : "border-border bg-panel text-ink-soft hover:border-accent hover:text-accent",
            )}
          >
            {item.name}
            <span className="pl-1.5 font-mono text-[11px] opacity-70">{item.cards.length}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => addDeck("New deck")}
          aria-label="New deck"
          className="grid size-8 flex-none place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
        >
          <PlusIcon size={15} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-[10rem] flex-1">
          <span className="sr-only">Deck name</span>
          <input
            value={deck.name}
            onChange={(event) => renameDeck(deck.id, event.target.value)}
            className="w-full rounded-xl border border-border bg-panel px-3 py-2 text-[14px] font-bold outline-none focus-visible:border-accent"
          />
        </label>

        <button
          type="button"
          onClick={() =>
            saveBlob(
              new Blob([toText(deck)], { type: "text/plain;charset=utf-8" }),
              `${deck.name.replace(/[^\w -]/g, "") || "deck"}.txt`,
            )
          }
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
        >
          <DownloadIcon size={14} />
          Text
        </button>

        <button
          type="button"
          onClick={() =>
            saveBlob(
              new Blob([exportBackup()], { type: "application/json" }),
              "cards-backup.json",
            )
          }
          title="Every deck, with its review history"
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
        >
          <DownloadIcon size={14} />
          Backup
        </button>

        <label className="tint inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent">
          <ImportIcon size={14} />
          Restore
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadBackup(file);
              event.target.value = "";
            }}
            className="hidden"
          />
        </label>

        {decks.length > 1 && (
          <button
            type="button"
            onClick={() => removeDeck(deck.id)}
            aria-label={`Delete the deck ${deck.name}`}
            className="grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-danger hover:text-danger"
          >
            <TrashSmallIcon size={15} />
          </button>
        )}
      </div>

      {notice && (
        <p className="rounded-xl border border-border bg-panel px-3 py-2 text-[12.5px]" role="status">
          {notice}
        </p>
      )}

      <div className="flex gap-2">
        {(
          [
            ["one", "Write a card"],
            ["bulk", "Paste a list"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(mode === id ? "none" : id)}
            aria-expanded={mode === id}
            className={cx(
              "flex-1 rounded-full border px-4 py-2.5 text-[13px] font-bold",
              mode === id ? "border-accent bg-accent-soft text-accent" : "border-border bg-panel",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "one" && <CardForm onSave={(front, back, hint) => addCard(front, back, hint)} />}

      {mode === "bulk" && (
        <BulkImport
          onImport={(text) => {
            const result = parseImport(text);
            const added = importCards(result.cards);
            setNotice(
              added === 0
                ? "No lines had two sides to them."
                : `${added} card${added === 1 ? "" : "s"} added${
                    result.skipped.length > 0
                      ? `. ${result.skipped.length} line${result.skipped.length === 1 ? "" : "s"} had no separator and were left out.`
                      : "."
                  }`,
            );
            setMode("none");
          }}
        />
      )}

      <ul className="flex flex-col gap-2">
        {deck.cards.map((card) =>
          editing === card.id ? (
            <li key={card.id}>
              <CardForm
                card={card}
                onSave={(front, back, hint) => {
                  updateCard(card.id, front, back, hint);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={card.id}
              className="flex items-start gap-3 rounded-[14px] border border-border bg-panel p-3"
            >
              <button
                type="button"
                onClick={() => setEditing(card.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[13.5px] font-semibold">{card.front}</span>
                <span className="block truncate text-[12.5px] text-ink-soft">{card.back}</span>
                <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft">
                  {card.phase === "new"
                    ? "new"
                    : card.phase === "learning"
                      ? "learning"
                      : `every ${intervalLabel(card.interval * 86_400_000)} · ease ${card.ease.toFixed(2)}`}
                  {card.lapses >= LEECH_LAPSES && " · worth rewriting"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => removeCard(card.id)}
                aria-label={`Delete the card ${card.front}`}
                className="grid size-8 flex-none place-items-center rounded-full border border-border text-ink-soft hover:border-danger hover:text-danger"
              >
                <TrashSmallIcon size={14} />
              </button>
            </li>
          ),
        )}
      </ul>

      {deck.cards.length === 0 && (
        <p className="rounded-[14px] border border-border bg-panel p-5 text-center text-[13px] text-ink-soft">
          No cards in this deck yet.
        </p>
      )}
    </div>
  );
}

function CardForm({
  card,
  onSave,
  onCancel,
}: {
  card?: Card;
  onSave: (front: string, back: string, hint?: string) => void;
  onCancel?: () => void;
}) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [hint, setHint] = useState(card?.hint ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (front.trim() === "" || back.trim() === "") return;
        onSave(front, back, hint);
        if (!card) {
          setFront("");
          setBack("");
          setHint("");
        }
      }}
      className="flex flex-col gap-2.5 rounded-[14px] border border-accent/45 bg-panel p-4"
    >
      {(
        [
          ["Front", front, setFront, "The question"],
          ["Back", back, setBack, "The answer"],
          ["Hint (optional)", hint, setHint, "Shown before the answer"],
        ] as const
      ).map(([label, value, set, placeholder]) => (
        <label key={label} className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            {label}
          </span>
          <textarea
            value={value}
            onChange={(event) => set(event.target.value)}
            rows={label === "Hint (optional)" ? 1 : 2}
            placeholder={placeholder}
            className="scroll-slim w-full resize-y rounded-xl border border-border bg-paper px-3 py-2 text-[13.5px] outline-none focus-visible:border-accent"
          />
        </label>
      ))}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={front.trim() === "" || back.trim() === ""}
          className="tint rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-on-accent disabled:opacity-45"
        >
          {card ? "Save" : "Add"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold"
          >
            Cancel
          </button>
        )}
      </div>

      {card && (
        <p className="text-[11.5px] leading-snug text-ink-soft">
          Editing the words keeps the schedule — fixing a typo on a card you have known for months
          should not cost you the months.
        </p>
      )}
    </form>
  );
}

function BulkImport({ onImport }: { onImport: (text: string) => void }) {
  const [text, setText] = useState("");
  const preview = text.trim() === "" ? null : parseImport(text);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim() !== "") onImport(text);
      }}
      className="flex flex-col gap-2.5 rounded-[14px] border border-accent/45 bg-panel p-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          One card a line
        </span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          autoFocus
          placeholder={"bonjour | hello\nmerci | thank you\nau revoir | goodbye"}
          className="scroll-slim w-full resize-y rounded-xl border border-border bg-paper px-3 py-2.5 font-mono text-[12.5px] outline-none focus-visible:border-accent"
        />
        <span className="text-[11.5px] leading-snug text-ink-soft">
          Split by a tab, a pipe or a dash — whichever splits the most lines. A third field becomes
          the hint, and lines starting with <code className="font-mono">#</code> are ignored.
        </span>
      </label>

      {preview && (
        <p className="text-[12px] font-semibold" role="status">
          {preview.cards.length} card{preview.cards.length === 1 ? "" : "s"} found
          {preview.skipped.length > 0 && (
            <span className="font-normal text-ink-soft">
              {" "}
              · {preview.skipped.length} line{preview.skipped.length === 1 ? "" : "s"} with only one
              side would be left out
            </span>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={!preview || preview.cards.length === 0}
        className="tint self-start rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-on-accent disabled:opacity-45"
      >
        Add them
      </button>
    </form>
  );
}
