"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

const TEXT_KEY = "sknotes:text:draft";
const COMPARE_KEY = "sknotes:text:compare";
const TOOL_KEY = "sknotes:text:tool";

/** Enough for a large document, short of the point where storage complains. */
const MAX_TEXT = 400_000;

export type TextTool = "transform" | "encode" | "json" | "diff" | "regex" | "hash";

export const TEXT_TOOLS: TextTool[] = ["transform", "encode", "json", "diff", "regex", "hash"];

const isTool = (v: unknown): v is TextTool => TEXT_TOOLS.includes(v as TextTool);

interface TextKitState {
  tool: TextTool;
  /** The working text every tool reads and writes. */
  text: string;
  /** The right-hand side, used only by the diff. */
  compare: string;

  setTool: (tool: TextTool) => void;
  setText: (text: string) => void;
  setCompare: (text: string) => void;
  /** Swap the two sides of a comparison. */
  swap: () => void;
  clear: () => void;
  /** Adopt the saved draft after mount (avoids an SSR mismatch). */
  hydrate: () => void;
}

/**
 * Text Kit's state — which tool is open, and the text being worked on.
 *
 * The text is *persisted*, and that is the point rather than a detail: the thing
 * people paste into a text tool is usually mid-task, and losing it to a refresh
 * or an app switch is the whole reason those websites feel disposable. One tool
 * hands its output to the next because they all read the same draft.
 */
export const useTextKitStore = create<TextKitState>((set, get) => ({
  tool: "transform",
  text: "",
  compare: "",

  setTool: (tool) => {
    set({ tool });
    void sSet(TOOL_KEY, tool);
  },

  setText: (text) => {
    const capped = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
    set({ text: capped });
    void sSet(TEXT_KEY, capped);
  },

  setCompare: (compare) => {
    const capped = compare.length > MAX_TEXT ? compare.slice(0, MAX_TEXT) : compare;
    set({ compare: capped });
    void sSet(COMPARE_KEY, capped);
  },

  swap: () => {
    const { text, compare } = get();
    set({ text: compare, compare: text });
    void sSet(TEXT_KEY, compare);
    void sSet(COMPARE_KEY, text);
  },

  clear: () => {
    set({ text: "", compare: "" });
    void sSet(TEXT_KEY, "");
    void sSet(COMPARE_KEY, "");
  },

  hydrate: async () => {
    const [text, compare, tool] = await Promise.all([
      sGet(TEXT_KEY),
      sGet(COMPARE_KEY),
      sGet(TOOL_KEY),
    ]);
    set({
      text: text ?? "",
      compare: compare ?? "",
      tool: isTool(tool) ? tool : "transform",
    });
  },
}));
