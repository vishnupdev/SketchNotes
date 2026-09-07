"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { fromBackup, sampleDeck, toBackup, toCards, type Deck } from "@/lib/Cards/deck";
import { dueQueue, newCard, review, type Card, type Grade } from "@/lib/Cards/srs";

const DECKS_KEY = "sknotes:cards:decks";
const PREFS_KEY = "sknotes:cards:prefs";

export type CardsTool = "review" | "decks" | "stats";

export const CARDS_TOOLS: CardsTool[] = ["review", "decks", "stats"];

/** What happened in this sitting — not persisted, because a session isn't. */
export interface Session {
  /** Card ids answered, in order, so the count is honest about repeats. */
  answered: string[];
  again: number;
  started: number;
}

interface CardsState {
  tool: CardsTool;
  decks: Deck[];
  /** Which deck is being studied and edited. */
  deckId: string | null;
  /** The card on screen, or null when the queue is empty. */
  currentId: string | null;
  /** Whether the answer is showing. */
  revealed: boolean;
  session: Session;

  setTool: (tool: CardsTool) => void;
  hydrate: () => Promise<void>;

  selectDeck: (id: string) => void;
  addDeck: (name: string) => void;
  renameDeck: (id: string, name: string) => void;
  removeDeck: (id: string) => void;

  addCard: (front: string, back: string, hint?: string) => void;
  updateCard: (id: string, front: string, back: string, hint?: string) => void;
  removeCard: (id: string) => void;
  importCards: (rows: { front: string; back: string; hint?: string }[]) => number;
  importBackup: (json: string) => number;
  exportBackup: () => string;

  /** Draw the next due card into view. */
  next: () => void;
  reveal: () => void;
  answer: (grade: Grade) => void;
  endSession: () => void;
}

const emptySession = (): Session => ({ answered: [], again: 0, started: Date.now() });

/**
 * Cards' state.
 *
 * The scheduler (`lib/Cards/srs.ts`) is pure, so everything here is bookkeeping:
 * which deck, which card, and whether the back is showing. The one decision
 * worth naming is that **the queue is recomputed after every answer** rather
 * than being drawn once at the start of a session. A card answered "Again" is
 * due in a minute, and it has to come back *in this sitting* — a queue
 * snapshotted up front would show it tomorrow, which is exactly the case short
 * learning steps exist for.
 */
export const useCardsStore = create<CardsState>((set, get) => ({
  tool: "review",
  decks: [],
  deckId: null,
  currentId: null,
  revealed: false,
  session: emptySession(),

  setTool: (tool) => {
    set({ tool });
    void persistPrefs(get());
  },

  hydrate: async () => {
    const prefs = await sGet(PREFS_KEY);
    let tool: CardsTool = "review";
    let deckId: string | null = null;
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs) as { tool?: CardsTool; deckId?: string };
        if (CARDS_TOOLS.includes(parsed.tool as CardsTool)) tool = parsed.tool as CardsTool;
        deckId = typeof parsed.deckId === "string" ? parsed.deckId : null;
      } catch {
        /* corrupt prefs are simply the defaults */
      }
    }

    const raw = await sGet(DECKS_KEY);
    let decks: Deck[] = [];
    if (raw) {
      try {
        decks = fromBackup(raw, Date.now());
      } catch {
        decks = [];
      }
    }

    // A first visit gets something to study rather than an empty screen with a
    // plus sign on it.
    if (decks.length === 0) decks = [sampleDeck(Date.now())];

    set({
      tool,
      decks,
      deckId: decks.some((deck) => deck.id === deckId) ? deckId : decks[0].id,
    });
    get().next();
  },

  selectDeck: (id) => {
    set({ deckId: id, currentId: null, revealed: false, session: emptySession() });
    get().next();
    void persistPrefs(get());
  },

  addDeck: (name) => {
    const deck: Deck = {
      id: uid(),
      name: name.trim() === "" ? "New deck" : name.trim(),
      cards: [],
      created: Date.now(),
    };
    set({ decks: [...get().decks, deck], deckId: deck.id, currentId: null });
    void persist(get());
    void persistPrefs(get());
  },

  renameDeck: (id, name) => {
    set({
      decks: get().decks.map((deck) =>
        deck.id === id ? { ...deck, name: name.trim() === "" ? deck.name : name.trim() } : deck,
      ),
    });
    void persist(get());
  },

  removeDeck: (id) => {
    const decks = get().decks.filter((deck) => deck.id !== id);
    // Never leave no deck at all: the review screen would have nothing to be
    // about, and "add a deck" is a worse first thing to see than a deck.
    const next = decks.length > 0 ? decks : [sampleDeck(Date.now())];
    set({ decks: next, deckId: next[0].id, currentId: null, revealed: false });
    void persist(get());
  },

  addCard: (front, back, hint) => {
    if (front.trim() === "" || back.trim() === "") return;
    mutateDeck(set, get, (deck) => ({
      ...deck,
      cards: [...deck.cards, newCard(uid(), front.trim(), back.trim(), hint, Date.now())],
    }));
  },

  updateCard: (id, front, back, hint) => {
    mutateDeck(set, get, (deck) => ({
      ...deck,
      cards: deck.cards.map((card) =>
        card.id === id
          ? {
              ...card,
              front: front.trim() === "" ? card.front : front.trim(),
              back: back.trim() === "" ? card.back : back.trim(),
              // Editing the words does not reset the schedule: a typo fixed on
              // a card you have known for months should not cost you the months.
              ...(hint && hint.trim() !== "" ? { hint: hint.trim() } : { hint: undefined }),
            }
          : card,
      ),
    }));
  },

  removeCard: (id) => {
    mutateDeck(set, get, (deck) => ({
      ...deck,
      cards: deck.cards.filter((card) => card.id !== id),
    }));
    if (get().currentId === id) get().next();
  },

  importCards: (rows) => {
    if (rows.length === 0) return 0;
    mutateDeck(set, get, (deck) => ({
      ...deck,
      cards: [...deck.cards, ...toCards(rows, Date.now())],
    }));
    return rows.length;
  },

  importBackup: (json) => {
    const loaded = fromBackup(json, Date.now());
    if (loaded.length === 0) return 0;
    // Imported decks are added alongside, never merged into or over the
    // existing ones — a restore that silently replaced a deck you had studied
    // would be unrecoverable.
    const decks = [...get().decks, ...loaded.map((deck) => ({ ...deck, id: uid() }))];
    set({ decks, deckId: decks[get().decks.length].id, currentId: null });
    void persist(get());
    return loaded.reduce((total, deck) => total + deck.cards.length, 0);
  },

  exportBackup: () => toBackup(get().decks),

  next: () => {
    const deck = get().decks.find((item) => item.id === get().deckId);
    const queue = deck ? dueQueue(deck.cards, Date.now()) : [];
    set({ currentId: queue[0]?.id ?? null, revealed: false });
  },

  reveal: () => set({ revealed: true }),

  answer: (grade) => {
    const { currentId, session } = get();
    if (!currentId) return;

    const now = Date.now();
    mutateDeck(set, get, (deck) => ({
      ...deck,
      cards: deck.cards.map((card) => (card.id === currentId ? review(card, grade, now) : card)),
    }));

    set({
      session: {
        ...session,
        answered: [...session.answered, currentId],
        again: session.again + (grade === "again" ? 1 : 0),
      },
    });

    get().next();
  },

  endSession: () => set({ session: emptySession(), revealed: false }),
}));

/** Apply a change to the selected deck, then save. */
function mutateDeck(
  set: (partial: Partial<CardsState>) => void,
  get: () => CardsState,
  change: (deck: Deck) => Deck,
): void {
  const { decks, deckId } = get();
  if (!deckId) return;
  set({ decks: decks.map((deck) => (deck.id === deckId ? change(deck) : deck)) });
  void persist(get());
}

/** The current deck, or null — the selector most panels want. */
export const currentDeck = (state: CardsState): Deck | null =>
  state.decks.find((deck) => deck.id === state.deckId) ?? null;

/** The card on screen, or null. */
export const currentCard = (state: CardsState): Card | null => {
  const deck = currentDeck(state);
  return deck?.cards.find((card) => card.id === state.currentId) ?? null;
};

const persist = (state: CardsState): Promise<void> => sSet(DECKS_KEY, toBackup(state.decks));

const persistPrefs = (state: CardsState): Promise<void> =>
  sSet(PREFS_KEY, JSON.stringify({ tool: state.tool, deckId: state.deckId }));
