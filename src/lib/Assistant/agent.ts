import type { AppId } from "@/store/useWorkspaceStore";
import {
  APP_ALIASES,
  APP_LABELS,
  APP_SUMMARIES,
  KNOWLEDGE_BY_ID,
  PDF_TOOL_LABELS,
  STARTER_QUESTIONS,
} from "./knowledge";
import { parseCommand } from "./commands";
import { CONFIDENCE_FLOOR, search, tokenize, type Match } from "./retrieval";
import type { AgentAction, AgentReply, KnowledgeEntry } from "./types";

/**
 * The agent's reasoning layer. Two things can come back from a turn:
 *
 * - an **action**, when the user told the agent to do something ("open the
 *   timer", "turn on dark mode") — parsed by {@link ./commands} and carried out
 *   by the chat organism;
 * - an **answer**, otherwise. A few intents (greeting, "list the apps") are
 *   handled exactly; everything else is answered from the retrieved knowledge
 *   entry, deterministically and offline. {@link ./prompt-api} optionally
 *   rephrases those with the browser's on-device model, from the same facts.
 */

/** Every alias paired with its app, longest first so "pdf editor" beats "pdf". */
const ALIAS_INDEX: Array<{ alias: string; app: AppId }> = Object.entries(APP_ALIASES)
  .flatMap(([app, aliases]) => aliases.map((alias) => ({ alias, app: app as AppId })))
  .sort((a, b) => b.alias.length - a.alias.length);

const APP_IDS = Object.keys(APP_LABELS) as AppId[];

/** Escape a literal for use inside a RegExp. */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The app a phrase names, if any (whole-word match). */
function appFromText(text: string): AppId | null {
  for (const { alias, app } of ALIAS_INDEX) {
    // \b is unreliable next to non-ASCII, so bound on non-letters instead.
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(alias)}($|[^\\p{L}\\p{N}])`, "u");
    if (re.test(text)) return app;
  }
  return null;
}

const GREETING_RE = /^(hi|hey|hello|yo|hai|hallo|namaste|namaskaram|good (morning|afternoon|evening))\b/;
const THANKS_RE = /^(thanks|thank you|thx|ty|cheers|nice|great|cool|awesome|perfect)\b/;
const LIST_RE = /\b(apps?|tools?|features?|everything)\b/;
const LIST_INTENT_RE = /\b(list|all|every|what|which|how many|show|available|there)\b/;
/**
 * Vocabulary a pure "what's in here?" question can be built from. If a question
 * uses anything else ("which apps need *internet*?") it has a real subject and
 * belongs to retrieval, not the roster.
 */
const LIST_ONLY_TERMS = new Set([
  "app", "apps", "tool", "tools", "feature", "features", "everything", "list", "all", "every",
  "many", "much", "show", "available", "there", "here", "thi", "this", "workspace", "oneapp",
  "exist", "included", "include", "kind", "type", "different", "total",
]);
const CAPABILITY_RE = /\b(what can you do|who are you|what are you|how do you work|help me|can you help)\b/;

/**
 * Entries that are answered by an overlay rather than an app — the assistant can
 * open those too, so "how do I change the theme?" ends in one tap.
 */
const OVERLAY_ACTIONS: Record<string, AgentAction> = {
  theme: { kind: "overlay", label: "Open Settings", overlay: "settings" },
  switching: { kind: "overlay", label: "Open the app switcher", overlay: "launcher" },
};

/** The button an entry deserves — its PDF section, its app, or an overlay. */
function actionFor(entry: KnowledgeEntry): AgentAction | null {
  const overlay = OVERLAY_ACTIONS[entry.id];
  if (overlay) return overlay;
  if (!entry.app) return null;
  const tool = entry.tool ?? null;
  const section = tool ? PDF_TOOL_LABELS[tool] : undefined;
  return {
    kind: "app",
    label: section ? `Open ${section}` : `Open ${APP_LABELS[entry.app]}`,
    app: entry.app,
    tool,
  };
}

/** Follow-ups: the entry's own, else a couple of broadly useful questions. */
function followUpsFor(entry: KnowledgeEntry): string[] {
  return entry.followUps ?? ["List all the apps", "Is my data private?"];
}

/** Bulleted roster of every app, generated from the knowledge base. */
function appsList(): string {
  const lines = APP_IDS.map((id) => `• ${APP_LABELS[id]} — ${APP_SUMMARIES[id]}`);
  return `All ${APP_IDS.length} apps in this workspace:\n${lines.join("\n")}\nAsk about any of them, or say "open" and its name and I'll take you there.`;
}

/** The reply used when nothing in the knowledge base matches well enough. */
function fallbackReply(): AgentReply {
  return {
    engine: "local",
    text:
      "I didn't catch which part of the workspace you mean. I can explain any of the eighteen apps, and things like privacy, offline use, backups, themes and keyboard shortcuts.\n" +
      "Try naming a tool — \"what can the PDF Editor do?\" — or tell me to do something, like \"open the timer\" or \"turn on dark mode\".",
    actions: [],
    suggestions: STARTER_QUESTIONS.slice(0, 4),
  };
}

/**
 * Turn ranked matches into a full reply. A runner-up only earns its own button
 * when it scored nearly as well as the winner — otherwise a stray keyword
 * overlap ("keyboard") would offer an unrelated app.
 */
function replyFromMatches(matches: Match[]): AgentReply {
  const [best, second] = matches;
  const actions: AgentAction[] = [];

  const primary = actionFor(best.entry);
  if (primary) actions.push(primary);

  const closeRunnerUp =
    second && second.confidence > CONFIDENCE_FLOOR && second.confidence >= best.confidence * 0.75;
  if (closeRunnerUp) {
    const alternate = actionFor(second.entry);
    if (alternate && !actions.some((a) => a.label === alternate.label)) actions.push(alternate);
  }

  return { engine: "local", text: best.entry.answer, actions, suggestions: followUpsFor(best.entry) };
}

/** A resolved question: the reply to give, plus the facts it was based on. */
export interface LocalAnswer {
  reply: AgentReply;
  /** Ranked knowledge entries behind the reply (empty for chit-chat). */
  matches: Match[];
  /**
   * Whether the on-device model may rephrase this reply. False for greetings,
   * navigation and generated lists, where the exact wording is the point.
   */
  rephrasable: boolean;
}

/**
 * Answer `question` from the knowledge base alone. Always succeeds — this is
 * the engine that guarantees the assistant works with no model, no network and
 * no permissions.
 */
export function answerLocally(question: string): LocalAnswer {
  const q = question.trim().toLowerCase();

  if (!q) {
    return {
      rephrasable: false,
      matches: [],
      reply: {
        engine: "local",
        text: "Ask me anything about this workspace — what a tool does, or how to get something done.",
        actions: [],
        suggestions: STARTER_QUESTIONS.slice(0, 4),
      },
    };
  }

  // An instruction ("open the timer", "turn on dark mode") — do it, and say so.
  // The same action is attached as a button so it can be repeated later.
  const command = parseCommand(question);
  if (command) {
    return {
      rephrasable: false,
      matches: [],
      reply: {
        engine: "local",
        text: command.text,
        // Somewhere to go back to, once you've been there. A theme switch or a
        // cleared thread is already done, so it gets no button.
        actions:
          command.action.kind === "app" || command.action.kind === "overlay"
            ? [command.action]
            : [],
        suggestions: command.suggestions,
        run: command.action,
      },
    };
  }

  if (GREETING_RE.test(q)) {
    return {
      rephrasable: false,
      matches: [],
      reply: {
        engine: "local",
        text: `Hello! I'm the guide to this workspace — ${APP_IDS.length} tools in one place. Ask what any of them does, or what you're trying to get done.`,
        actions: [],
        suggestions: STARTER_QUESTIONS.slice(0, 4),
      },
    };
  }

  if (THANKS_RE.test(q) && q.length < 24) {
    return {
      rephrasable: false,
      matches: [],
      reply: {
        engine: "local",
        text: "Happy to help. Ask me anything else about the workspace.",
        actions: [],
        suggestions: STARTER_QUESTIONS.slice(2, 5),
      },
    };
  }

  // "How many apps are there?" / "list all the tools" — but only when the
  // question is *just* about the roster.
  const rosterOnly = tokenize(q).every((t) => LIST_ONLY_TERMS.has(t));
  if (rosterOnly && LIST_RE.test(q) && LIST_INTENT_RE.test(q) && !appFromText(q)) {
    return {
      rephrasable: false,
      matches: [],
      reply: {
        engine: "local",
        text: appsList(),
        actions: [],
        suggestions: ["What can Sketchnotes do?", "What can the PDF Editor do?", "Is my data private?"],
      },
    };
  }

  if (CAPABILITY_RE.test(q)) {
    const entry = KNOWLEDGE_BY_ID.get("app-assistant")!;
    return {
      rephrasable: true,
      matches: search(entry.title, 1),
      reply: { engine: "local", text: entry.answer, actions: [], suggestions: followUpsFor(entry) },
    };
  }

  const matches = search(question, 3);
  if (!matches.length || matches[0].confidence < CONFIDENCE_FLOOR) {
    return { rephrasable: false, matches, reply: fallbackReply() };
  }

  return { rephrasable: true, matches, reply: replyFromMatches(matches) };
}

/**
 * Format retrieved entries as grounding facts for the on-device model. Only the
 * text here is available to it, which is what keeps generated answers truthful.
 */
export function buildContext(matches: Match[]): string {
  return matches
    .map((m, i) => `FACT ${i + 1} — ${m.entry.title}\n${m.entry.answer}`)
    .join("\n\n");
}
