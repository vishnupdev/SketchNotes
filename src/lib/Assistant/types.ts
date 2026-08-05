import type { AppId } from "@/store/useWorkspaceStore";

/** Who authored a chat turn. */
export type ChatRole = "user" | "agent";

/**
 * Which brain produced an answer:
 * - `device` — the browser's built-in on-device language model (Prompt API),
 *   grounded on the workspace knowledge base.
 * - `local`  — the bundled retrieval engine (always available, zero network).
 */
export type ReplyEngine = "device" | "local";

/** User preference for which brain to use. */
export type EngineMode = "auto" | "device" | "local";

/**
 * A one-tap thing the answer lets you do: open the app (and PDF section) it
 * describes, or open a workspace overlay such as Settings.
 */
export type AgentAction =
  | {
      kind: "app";
      label: string;
      app: AppId;
      /** PDF-editor section id; only meaningful when `app` is "pdf". */
      tool?: string | null;
    }
  | { kind: "overlay"; label: string; overlay: "settings" | "launcher" }
  | { kind: "theme"; label: string; themeId: string }
  | { kind: "chat"; label: string; op: "clear" };

/** One turn in the conversation. Persisted, so keep it JSON-serialisable. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
  /** Jump-to-app buttons offered with an agent reply. */
  actions?: AgentAction[];
  /** Follow-up questions offered as tappable chips. */
  suggestions?: string[];
  /** Which engine answered (agent turns only). */
  engine?: ReplyEngine;
}

/** What the agent returns for one question. */
export interface AgentReply {
  text: string;
  actions: AgentAction[];
  suggestions: string[];
  engine: ReplyEngine;
  /**
   * An action the agent should carry out itself, because the user asked for the
   * thing rather than asking about it ("open the timer", "turn on dark mode").
   * Deliberately not stored on the message: a persisted thread must never
   * re-fire its commands when the app is reopened.
   */
  run?: AgentAction;
}

/** One retrievable fact about the workspace. */
export interface KnowledgeEntry {
  id: string;
  /** Short human title, also used as the retrieval headline. */
  title: string;
  /** The app this fact belongs to, when it is app-specific. */
  app?: AppId;
  /** PDF-editor section id, for facts about a single PDF tool. */
  tool?: string | null;
  /** Extra query terms that should match this entry (synonyms, brand names). */
  keywords: string[];
  /** The answer text. Lines starting with "• " render as bullets. */
  answer: string;
  /** Follow-up questions to offer after this answer. */
  followUps?: string[];
}
