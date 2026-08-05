import { THEMES } from "@/lib/themes";
import type { AppId } from "@/store/useWorkspaceStore";
import { APP_ALIASES, APP_LABELS, APP_SUMMARIES, PDF_TOOL_LABELS } from "./knowledge";
import type { AgentAction } from "./types";

/**
 * Command parsing — the half of the agent that *does* things.
 *
 * "What can the Timer do?" is a question and gets an answer; "open the timer"
 * is an instruction and gets carried out. This module recognises the second
 * kind and returns the action to perform plus the line to say about it.
 *
 * Everything it can do goes through workspace-wide state only (active app, PDF
 * section, overlays, theme, this conversation) — never another app's internals,
 * so the Assistant can't break an app by driving it.
 */

/** Escape a literal for use inside a RegExp. */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word test that also behaves around non-ASCII text. */
function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(phrase)}($|[^\\p{L}\\p{N}])`, "u").test(text);
}

/** Politeness and filler that wraps a real instruction. */
const PREAMBLE_RE =
  /^(?:(?:hey|hi|hello|ok|okay|yo)[,!.\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+|pls\s+|kindly\s+)?(?:i\s+(?:want|need)\s+(?:to\s+)?)?/;

/**
 * Question openers. If what's left after the preamble starts with one of these,
 * the user is asking *about* something — never a command, however many verbs
 * follow ("how do I change the theme?" must stay an explanation).
 */
const QUESTION_RE = /^(what|which|who|whose|why|how|where|when|is|are|was|does|do|did|should|tell)\b/;

/** Verbs that turn a noun into an instruction. */
const VERB_RE =
  /\b(open|launch|start|go\s+to|goto|take\s+me\s+to|bring\s+up|jump\s+to|navigate\s+to|switch\s+to|switch|show|change|set|use|turn\s+on|enable|activate|apply|convert|add|make\s+it|put\s+it\s+in)\b/;

/** Aliases per app, longest first so "pdf editor" wins over "pdf". */
const ALIASES: Array<{ alias: string; app: AppId }> = Object.entries(APP_ALIASES)
  .flatMap(([app, list]) => list.map((alias) => ({ alias, app: app as AppId })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * Phrases that name a PDF-editor section. Every one of these is a PDF-only
 * concept in this workspace, so they can stand alone ("open watermark").
 */
const TOOL_PHRASES: Array<{ tool: string; phrases: string[] }> = [
  { tool: "img", phrases: ["images to pdf", "image to pdf", "jpg to pdf", "photos to pdf", "pictures to pdf"] },
  { tool: "toimg", phrases: ["pdf to images", "pdf to image", "pdf to jpg", "pdf to png"] },
  { tool: "create", phrases: ["text to pdf"] },
  { tool: "num", phrases: ["page numbers", "page numbering", "number the pages"] },
  { tool: "organize", phrases: ["organize pages", "organise pages", "reorder pages", "rearrange pages", "rotate pages", "organize", "organise"] },
  { tool: "merge", phrases: ["merge", "combine"] },
  { tool: "split", phrases: ["split", "burst"] },
  { tool: "wm", phrases: ["watermark"] },
  { tool: "meta", phrases: ["metadata"] },
  { tool: "edit", phrases: ["annotate", "highlight", "white out", "whiteout"] },
];

/** Theme names, plus the everyday words people use for the two neutral ones. */
const THEME_WORDS: Array<{ id: string; words: string[] }> = [
  ...THEMES.map((t) => ({ id: t.id, words: [t.label.toLowerCase()] })),
  { id: "dark", words: ["night", "night mode"] },
  { id: "light", words: ["day", "day mode", "bright"] },
];

/** A parsed instruction: what to do, and what to say about it. */
export interface Command {
  action: AgentAction;
  text: string;
  suggestions: string[];
}

/** The app an instruction names, if any. */
function appIn(text: string): AppId | null {
  for (const { alias, app } of ALIASES) if (hasPhrase(text, alias)) return app;
  return null;
}

/** The PDF section an instruction names, plus the phrase that named it. */
function toolIn(text: string): { tool: string; phrase: string } | null {
  for (const { tool, phrases } of TOOL_PHRASES) {
    for (const phrase of phrases) if (hasPhrase(text, phrase)) return { tool, phrase };
  }
  return null;
}

/** The theme an instruction names, if any. */
function themeIn(text: string): string | null {
  for (const { id, words } of THEME_WORDS) {
    for (const word of words) if (hasPhrase(text, word)) return id;
  }
  return null;
}

const themeLabel = (id: string) => THEMES.find((t) => t.id === id)?.label ?? id;

/**
 * Parse `question` as an instruction to carry out. Returns null for anything
 * that isn't clearly one, so ambiguous input falls through to being answered.
 */
export function parseCommand(question: string): Command | null {
  const raw = question.trim().toLowerCase().replace(/[?!.]+$/, "");
  const text = raw.replace(PREAMBLE_RE, "").trim();
  if (!text || QUESTION_RE.test(text)) return null;

  const hasVerb = VERB_RE.test(text);

  // ── Theme ───────────────────────────────────────────────────────────────
  // "dark mode"/"ocean theme" is unambiguous on its own; a bare colour word
  // ("make it dark") needs the verb to prove it's an instruction.
  const theme = themeIn(text);
  if (theme) {
    const named = hasPhrase(text, `${theme} mode`) || hasPhrase(text, `${theme} theme`) ||
      hasPhrase(text, "theme") || hasPhrase(text, "mode");
    if (named || hasVerb) {
      const label = themeLabel(theme);
      return {
        action: { kind: "theme", label: `Switch to ${label}`, themeId: theme },
        text: `Done — the ${label} theme is on across every app. You can change it any time in Settings.`,
        suggestions: ["How do I change the theme?", "List all the apps"],
      };
    }
  }

  // ── Clear this conversation ─────────────────────────────────────────────
  if (/\b(clear|reset|wipe|delete|forget)\b.*\b(chat|conversation|history|messages)\b/.test(text) ||
      /^(start over|start again)$/.test(text)) {
    return {
      action: { kind: "chat", label: "Clear chat", op: "clear" },
      text: "Cleared — this conversation is gone from your browser. Ask me anything.",
      suggestions: ["What is OneApp?", "List all the apps"],
    };
  }

  if (!hasVerb) return null;

  // ── Overlays ────────────────────────────────────────────────────────────
  if (hasPhrase(text, "settings") || hasPhrase(text, "preferences")) {
    return {
      action: { kind: "overlay", label: "Open Settings", overlay: "settings" },
      text: "Opening Settings — theme and offline options live there.",
      suggestions: ["How do I change the theme?", "How do I switch apps?"],
    };
  }
  if (/\b(app switcher|launcher|switch app|switch apps|app list|app grid)\b/.test(text)) {
    return {
      action: { kind: "overlay", label: "Open the app switcher", overlay: "launcher" },
      text: "Opening the app switcher — pick any tile, or drag a handle to reorder them.",
      suggestions: ["List all the apps", "How do I switch apps?"],
    };
  }

  // ── Go to an app (and, for the PDF editor, straight to a section) ────────
  const app = appIn(text);
  const named = toolIn(text);
  // A phrase that names PDF itself ("images to pdf") outranks an app alias
  // buried inside it — otherwise "images" would send you to Image Studio.
  const tool =
    named && (named.phrase.includes("pdf") || !app || app === "pdf") ? named.tool : null;
  if (app || tool) {
    const target: AppId = tool ? "pdf" : app!;
    const section = tool ? PDF_TOOL_LABELS[tool] : undefined;
    const where = section ? `${APP_LABELS[target]} → ${section}` : APP_LABELS[target];
    return {
      action: {
        kind: "app",
        label: section ? `Open ${section}` : `Open ${APP_LABELS[target]}`,
        app: target,
        tool: tool ?? null,
      },
      text: section
        ? `Opening ${where}.`
        : `Opening ${where} — ${APP_SUMMARIES[target]}.`,
      suggestions: [`What can ${APP_LABELS[target]} do?`, "List all the apps"],
    };
  }

  return null;
}
