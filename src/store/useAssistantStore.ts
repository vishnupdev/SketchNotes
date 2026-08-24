"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import type { ChatMessage, EngineMode } from "@/lib/Assistant/types";

const STORE_KEY = "sknotes:assistant";

/** Keep the thread short enough that persistence stays cheap and fast to read. */
const MAX_MESSAGES = 40;

const MODES: EngineMode[] = ["auto", "device", "local"];

interface StoredState {
  messages: ChatMessage[];
  mode: EngineMode;
}

interface AssistantState {
  /** The conversation, oldest first. */
  messages: ChatMessage[];
  /** Which brain to answer with. */
  mode: EngineMode;
  /**
   * A question handed over from outside the app — the command palette passes
   * whatever was typed here when it can't match a command itself. Deliberately
   * *not* persisted: a reload must never re-ask a question on its own.
   */
  pending: string | null;

  addMessage: (message: ChatMessage) => void;
  setMode: (mode: EngineMode) => void;
  clear: () => void;
  /** Queue a question for the chat to ask as soon as it is on screen. */
  askLater: (question: string) => void;
  /** Read and clear the queued question, so it can only ever be asked once. */
  takePending: () => string | null;
  /** Adopt the persisted thread after mount (avoids an SSR mismatch). */
  hydrate: () => void;
}

/** Shape-check an untrusted stored message before letting it into the thread. */
function isMessage(v: unknown): v is ChatMessage {
  if (!v || typeof v !== "object") return false;
  const m = v as Partial<ChatMessage>;
  return (
    typeof m.id === "string" &&
    typeof m.text === "string" &&
    typeof m.ts === "number" &&
    (m.role === "user" || m.role === "agent")
  );
}

/**
 * Conversation state for the Assistant. The thread and engine preference
 * persist per browser, so returning to the app resumes where you left off.
 * Nothing here ever leaves the device.
 */
export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  mode: "auto",
  pending: null,

  askLater: (question) => set({ pending: question.trim() || null }),

  takePending: () => {
    const { pending } = get();
    if (pending !== null) set({ pending: null });
    return pending;
  },

  addMessage: (message) => {
    set((s) => ({ messages: [...s.messages, message].slice(-MAX_MESSAGES) }));
    persist(get());
  },

  setMode: (mode) => {
    set({ mode });
    persist(get());
  },

  clear: () => {
    set({ messages: [] });
    persist(get());
  },

  hydrate: async () => {
    const raw = await sGet(STORE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Partial<StoredState>;
      set({
        messages: Array.isArray(stored.messages)
          ? stored.messages.filter(isMessage).slice(-MAX_MESSAGES)
          : [],
        mode: stored.mode && MODES.includes(stored.mode) ? stored.mode : "auto",
      });
    } catch {
      /* corrupt value — start a fresh thread */
    }
  },
}));

function persist(s: AssistantState) {
  const data: StoredState = { messages: s.messages, mode: s.mode };
  void sSet(STORE_KEY, JSON.stringify(data));
}
