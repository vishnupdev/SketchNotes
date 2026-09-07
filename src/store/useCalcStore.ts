"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import type { Angle } from "@/lib/Calc/expression";
import { SAMPLE_TAPE } from "@/lib/Calc/tape";
import type { Base, BitOp, Width } from "@/lib/Calc/bases";
import type { PercentQuestion } from "@/lib/Calc/percent";

const TAPE_KEY = "sknotes:calc:tape";
const PREFS_KEY = "sknotes:calc:prefs";

export type CalcTool = "tape" | "bases" | "percent";

export const CALC_TOOLS: CalcTool[] = ["tape", "bases", "percent"];

interface CalcState {
  tool: CalcTool;
  /** Whether trigonometry reads degrees or radians. Shown, never guessed. */
  angle: Angle;

  /** The tape document. The one thing here worth keeping between visits. */
  tape: string;

  /** Bases: the value being read, and how it is being read and written. */
  baseText: string;
  base: Base;
  width: Width;
  signed: boolean;
  /** The second operand of a bitwise operation, in the same base. */
  operandText: string;
  bitOp: BitOp;

  /** Percent: which of the four questions, and its two inputs. */
  question: PercentQuestion;
  percentA: string;
  percentB: string;

  setTool: (tool: CalcTool) => void;
  setAngle: (angle: Angle) => void;
  setTape: (tape: string) => void;
  /** Append a line to the tape — how an example or a result gets in. */
  appendLine: (line: string) => void;
  clearTape: () => void;

  setBaseText: (text: string) => void;
  setBase: (base: Base) => void;
  setWidth: (width: Width) => void;
  setSigned: (signed: boolean) => void;
  setOperandText: (text: string) => void;
  setBitOp: (op: BitOp) => void;

  setQuestion: (question: PercentQuestion) => void;
  setPercentA: (value: string) => void;
  setPercentB: (value: string) => void;

  hydrate: () => Promise<void>;
}

/**
 * Calc's state.
 *
 * Every calculation here is a pure function of text the user typed (`lib/Calc/`),
 * so this store holds only that text and the modes around it — there is no
 * derived value in it. Panels recompute from the strings on each render, which
 * is what keeps the answer beside a line honest while the line is still being
 * edited, and means no stored figure can ever disagree with the input above it.
 *
 * Only the tape and the modes persist. The bases and percent fields are working
 * scratch: reopening the app onto whatever hex value you last inspected is
 * clutter, whereas losing a column of figures you were adding up is a loss.
 */
export const useCalcStore = create<CalcState>((set, get) => ({
  tool: "tape",
  angle: "deg",
  tape: SAMPLE_TAPE,

  baseText: "255",
  base: 10,
  width: 32,
  signed: false,
  operandText: "0x0f",
  bitOp: "and",

  question: "of",
  percentA: "18",
  percentB: "2400",

  setTool: (tool) => {
    set({ tool });
    void persistPrefs(get());
  },
  setAngle: (angle) => {
    set({ angle });
    void persistPrefs(get());
  },

  setTape: (tape) => {
    set({ tape });
    void sSet(TAPE_KEY, tape);
  },
  appendLine: (line) => {
    const { tape } = get();
    const next = tape.trimEnd() === "" ? line : `${tape.replace(/\n+$/, "")}\n${line}`;
    set({ tape: next });
    void sSet(TAPE_KEY, next);
  },
  clearTape: () => {
    set({ tape: "" });
    void sSet(TAPE_KEY, "");
  },

  setBaseText: (baseText) => set({ baseText }),
  setBase: (base) => {
    set({ base });
    void persistPrefs(get());
  },
  setWidth: (width) => {
    set({ width });
    void persistPrefs(get());
  },
  setSigned: (signed) => {
    set({ signed });
    void persistPrefs(get());
  },
  setOperandText: (operandText) => set({ operandText }),
  setBitOp: (bitOp) => set({ bitOp }),

  setQuestion: (question) => set({ question }),
  setPercentA: (percentA) => set({ percentA }),
  setPercentB: (percentB) => set({ percentB }),

  hydrate: async () => {
    // A stored empty tape is a real choice — the user cleared it — so only the
    // absence of the key falls back to the sample.
    const tape = await sGet(TAPE_KEY);
    if (tape !== null) set({ tape });

    const raw = await sGet(PREFS_KEY);
    if (!raw) return;
    try {
      const prefs = JSON.parse(raw) as Partial<Prefs>;
      set({
        tool: CALC_TOOLS.includes(prefs.tool as CalcTool) ? (prefs.tool as CalcTool) : "tape",
        angle: prefs.angle === "rad" ? "rad" : "deg",
        base: ([2, 8, 10, 16] as Base[]).includes(prefs.base as Base) ? (prefs.base as Base) : 10,
        width: ([8, 16, 32, 64] as Width[]).includes(prefs.width as Width)
          ? (prefs.width as Width)
          : 32,
        signed: prefs.signed === true,
      });
    } catch {
      /* corrupt prefs are simply the defaults */
    }
  },
}));

interface Prefs {
  tool: CalcTool;
  angle: Angle;
  base: Base;
  width: Width;
  signed: boolean;
}

const persistPrefs = (state: CalcState): Promise<void> =>
  sSet(
    PREFS_KEY,
    JSON.stringify({
      tool: state.tool,
      angle: state.angle,
      base: state.base,
      width: state.width,
      signed: state.signed,
    } satisfies Prefs),
  );
