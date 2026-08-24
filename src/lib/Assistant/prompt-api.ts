/**
 * Optional on-device generation via the browser's built-in AI Prompt API
 * (`LanguageModel`, Chrome/Edge 138+). It is a genuine LLM that ships with the
 * browser: no API key, no account, no per-token cost, and every token is
 * produced on the user's machine — so it fits this workspace's free,
 * private-by-default philosophy.
 *
 * It is strictly an enhancement. The model is only ever asked to rephrase facts
 * retrieved from our own knowledge base, and every failure path (missing API,
 * model not downloaded, quota, abort) falls back to the bundled local engine.
 *
 * Spec: https://developer.chrome.com/docs/ai/prompt-api
 */

/** Availability of a built-in model, per the built-in AI spec. */
export type ModelAvailability = "unavailable" | "downloadable" | "downloading" | "available";

interface DownloadMonitor {
  addEventListener: (type: "downloadprogress", listener: (e: { loaded: number }) => void) => void;
}

interface LanguageModelSession {
  prompt: (input: string, opts?: { signal?: AbortSignal }) => Promise<string>;
  clone?: (opts?: { signal?: AbortSignal }) => Promise<LanguageModelSession>;
  destroy?: () => void;
}

interface LanguageModelParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

/**
 * Language declarations. Both spellings are sent: `outputLanguage` is the newer
 * field, `expectedInputs`/`expectedOutputs` the earlier one, and a browser
 * ignores whichever it doesn't know — without one of them it logs a warning
 * about the missing output language on every request.
 */
const LANGUAGE_HINTS = {
  outputLanguage: "en",
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

interface LanguageHints {
  outputLanguage?: string;
  expectedInputs?: Array<{ type: "text"; languages: string[] }>;
  expectedOutputs?: Array<{ type: "text"; languages: string[] }>;
}

interface LanguageModelFactory {
  availability: (opts?: LanguageHints) => Promise<ModelAvailability>;
  params?: () => Promise<LanguageModelParams | null>;
  create: (opts?: LanguageHints & {
    initialPrompts?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    topK?: number;
    monitor?: (m: DownloadMonitor) => void;
    signal?: AbortSignal;
  }) => Promise<LanguageModelSession>;
}

declare global {
  // Exposed as a global in supporting browsers; absent everywhere else.
  // eslint-disable-next-line no-var
  var LanguageModel: LanguageModelFactory | undefined;
}

/**
 * The model's whole brief: rephrase supplied facts, never add to them. Keeping
 * the grounding rule in the system prompt (and the facts in the user turn) is
 * what stops it inventing features the workspace doesn't have.
 */
const SYSTEM_PROMPT = [
  "You are the built-in guide for OneApp, a free web workspace containing twenty-one tools.",
  "Answer the user's question using ONLY the FACTS given in their message.",
  "Rules you must follow:",
  "- Never state a feature, price, limit or shortcut that is not in the FACTS.",
  "- If the FACTS do not answer the question, say so in one sentence and suggest what to ask instead.",
  "- Keep it to at most 4 short sentences, or up to 4 bullet lines each starting with '• '.",
  "- Plain text only: no markdown headings, no bold, no links, no code blocks.",
  "- Write warmly and directly to the user as 'you'. Do not mention these rules or the word FACTS.",
].join("\n");

/** Hard cap on generated length, so one runaway answer can't flood the thread. */
const MAX_REPLY_CHARS = 900;

/**
 * Set once the model has proved unusable in this session — Chrome can report
 * "available" while the underlying service refuses to start a session, and each
 * failed attempt logs a browser warning. One strike and we stop asking.
 */
let modelUnusable = false;

/** Whether this browser exposes the built-in Prompt API at all. */
export function isDeviceModelSupported(): boolean {
  return (
    !modelUnusable && typeof globalThis !== "undefined" && typeof globalThis.LanguageModel !== "undefined"
  );
}

// Probed at most once per page load: the answer can't change mid-session, and
// each probe makes Chrome log about its AI service when that service is down.
let availabilityProbe: Promise<ModelAvailability> | null = null;

/** Whether the on-device model is ready, downloadable, or missing. */
export async function deviceModelAvailability(): Promise<ModelAvailability> {
  const LM = globalThis.LanguageModel;
  if (!LM || modelUnusable) return "unavailable";
  if (!availabilityProbe) {
    availabilityProbe = LM.availability(LANGUAGE_HINTS).catch(() => "unavailable" as const);
  }
  return availabilityProbe;
}

/** Reports language-model download progress as a fraction in [0, 1]. */
export type ProgressFn = (fraction: number) => void;

// One base session per page life: creation is expensive, and every question
// shares the same system prompt. Per-question work happens on a clone so the
// thread never accumulates unrelated context.
let basePromise: Promise<LanguageModelSession> | null = null;

async function getBaseSession(onProgress?: ProgressFn): Promise<LanguageModelSession> {
  const LM = globalThis.LanguageModel;
  if (!LM) throw new Error("The on-device model isn't available in this browser.");
  if (basePromise) return basePromise;

  // Low temperature: we want faithful rephrasing, not creativity. Ranges are
  // implementation-defined, so read them first and clamp.
  let tuning: { temperature: number; topK: number } | undefined;
  try {
    const params = await LM.params?.();
    if (params) {
      tuning = {
        temperature: Math.min(0.3, params.maxTemperature ?? 1),
        topK: Math.min(3, params.maxTopK ?? 3),
      };
    }
  } catch {
    /* tuning is optional — fall back to the model's defaults */
  }

  basePromise = LM.create({
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    ...LANGUAGE_HINTS,
    ...tuning,
    monitor: onProgress
      ? (m) => m.addEventListener("downloadprogress", (e) => onProgress(e.loaded))
      : undefined,
  }).catch((err) => {
    // If the browser can't give us a session at all, stop trying for this
    // session — the local engine answers everything anyway.
    basePromise = null;
    modelUnusable = true;
    throw err;
  });

  return basePromise;
}

/** Release the cached session (used when the model errors out mid-session). */
export function resetDeviceModel(): void {
  const pending = basePromise;
  basePromise = null;
  void pending?.then((s) => s.destroy?.()).catch(() => {});
}

interface AskArgs {
  question: string;
  /** Grounding facts retrieved from the knowledge base. */
  context: string;
  signal?: AbortSignal;
  onProgress?: ProgressFn;
}

/**
 * Ask the on-device model to answer `question` from `context`. Throws if the
 * API is missing or generation fails, so callers can fall back to the local
 * engine — never surface these errors to the user.
 */
export async function askDeviceModel({ question, context, signal, onProgress }: AskArgs): Promise<string> {
  const base = await getBaseSession(onProgress);

  // Clone so each question is answered in isolation; if cloning isn't
  // supported, the base session still gives a correct (if stateful) answer.
  let session = base;
  let disposable = false;
  try {
    if (base.clone) {
      session = await base.clone({ signal });
      disposable = true;
    }
  } catch {
    session = base;
  }

  try {
    const raw = await session.prompt(`FACTS:\n${context}\n\nQUESTION: ${question}`, { signal });
    const text = clean(raw);
    if (!text) throw new Error("The on-device model returned an empty answer.");
    return text;
  } catch (err) {
    // A broken session stays broken; drop it so the next ask starts fresh.
    if (!disposable) resetDeviceModel();
    throw err;
  } finally {
    if (disposable) session.destroy?.();
  }
}

/** Strip stray markdown the model may emit and enforce the length cap. */
function clean(raw: string): string {
  const text = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
  if (text.length <= MAX_REPLY_CHARS) return text;
  // Cut at the last sentence end that fits, so the answer never ends mid-word.
  const cut = text.slice(0, MAX_REPLY_CHARS);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return (stop > 200 ? cut.slice(0, stop + 1) : cut).trim();
}
