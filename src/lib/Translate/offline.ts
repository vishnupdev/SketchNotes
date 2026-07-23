/**
 * On-device (offline) translation via the browser's built-in AI Translator and
 * Language Detector APIs (Chrome 138+). These run entirely on the user's
 * machine: after the (one-time) language-pack download, translation needs no
 * network and no data ever leaves the device — matching the workspace's
 * offline-first, all-local philosophy.
 *
 * The APIs are progressively enhanced: if the globals are absent (Firefox,
 * Safari, older Chrome) every capability check returns false and callers fall
 * back to the online engine.
 *
 * Spec: https://developer.chrome.com/docs/ai/translator-api
 */

import { AUTO } from "./languages";

/** Availability of a model, per the built-in AI spec. */
export type ModelAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

interface DownloadMonitor {
  addEventListener: (
    type: "downloadprogress",
    listener: (e: { loaded: number }) => void,
  ) => void;
}
type CreateMonitor = (m: DownloadMonitor) => void;

interface TranslatorInstance {
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
}
interface TranslatorFactory {
  availability: (opts: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<ModelAvailability>;
  create: (opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: CreateMonitor;
  }) => Promise<TranslatorInstance>;
}

interface DetectionResult {
  detectedLanguage: string;
  confidence: number;
}
interface DetectorInstance {
  detect: (text: string) => Promise<DetectionResult[]>;
  destroy?: () => void;
}
interface DetectorFactory {
  availability: () => Promise<ModelAvailability>;
  create: (opts?: { monitor?: CreateMonitor }) => Promise<DetectorInstance>;
}

declare global {
  // Exposed as globals on `window`/`self` in supporting browsers.
  // eslint-disable-next-line no-var
  var Translator: TranslatorFactory | undefined;
  // eslint-disable-next-line no-var
  var LanguageDetector: DetectorFactory | undefined;
}

/** Progress callback: fraction downloaded in [0, 1]. */
export type ProgressFn = (fraction: number) => void;

/** Whether the on-device translator exists in this browser. */
export function isOfflineTranslateSupported(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.Translator !== "undefined";
}

/** Whether on-device language detection exists in this browser. */
export function isOfflineDetectSupported(): boolean {
  return (
    typeof globalThis !== "undefined" && typeof globalThis.LanguageDetector !== "undefined"
  );
}

/**
 * Availability of the on-device model for a concrete pair. Returns
 * "unavailable" when the API is missing or the source equals the target.
 */
export async function offlineAvailability(
  source: string,
  target: string,
): Promise<ModelAvailability> {
  const T = globalThis.Translator;
  if (!T || !source || source === AUTO || !target || source === target) return "unavailable";
  try {
    return await T.availability({ sourceLanguage: source, targetLanguage: target });
  } catch {
    return "unavailable";
  }
}

// Reuse created translators across calls — creation (and any download) is
// expensive, and the same pair is used repeatedly as the user types.
const translatorCache = new Map<string, Promise<TranslatorInstance>>();

function getTranslator(
  source: string,
  target: string,
  onProgress?: ProgressFn,
): Promise<TranslatorInstance> {
  const T = globalThis.Translator;
  if (!T) return Promise.reject(new Error("On-device translation is not supported here."));
  const key = `${source}:${target}`;
  let inst = translatorCache.get(key);
  if (!inst) {
    inst = T.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor: onProgress
        ? (m) => m.addEventListener("downloadprogress", (e) => onProgress(e.loaded))
        : undefined,
    }).catch((err) => {
      // Don't cache a failed creation, so a later retry can succeed.
      translatorCache.delete(key);
      throw err;
    });
    translatorCache.set(key, inst);
  }
  return inst;
}

let detectorInst: Promise<DetectorInstance> | null = null;

function getDetector(): Promise<DetectorInstance> {
  const D = globalThis.LanguageDetector;
  if (!D) return Promise.reject(new Error("On-device language detection is not supported here."));
  if (!detectorInst) {
    detectorInst = D.create().catch((err) => {
      detectorInst = null;
      throw err;
    });
  }
  return detectorInst;
}

/**
 * Detect the dominant language of `text` on-device. Returns a BCP-47 code, or
 * null if detection is unsupported or inconclusive.
 */
export async function detectLanguageOffline(text: string): Promise<string | null> {
  if (!isOfflineDetectSupported() || !text.trim()) return null;
  try {
    const detector = await getDetector();
    const results = await detector.detect(text);
    const top = results?.[0];
    if (!top || top.detectedLanguage === "und") return null;
    return top.detectedLanguage;
  } catch {
    return null;
  }
}

/**
 * Translate on-device. When `source` is AUTO it is detected first (also
 * on-device). `onProgress` reports language-pack download progress the first
 * time a pair is used. Throws if the API is missing or the pair can't be served
 * offline — callers decide whether to fall back online.
 */
export async function translateOffline(
  text: string,
  source: string,
  target: string,
  onProgress?: ProgressFn,
): Promise<{ text: string; detectedSource: string }> {
  const resolvedSource = source === AUTO ? await detectLanguageOffline(text) : source;
  if (!resolvedSource) {
    throw new Error("Couldn't detect the language on-device — pick a source language.");
  }
  if (resolvedSource === target) {
    // Nothing to translate; return the input verbatim.
    return { text, detectedSource: resolvedSource };
  }
  const availability = await offlineAvailability(resolvedSource, target);
  if (availability === "unavailable") {
    throw new Error("This language pair isn't available on-device.");
  }
  const translator = await getTranslator(resolvedSource, target, onProgress);
  const out = await translator.translate(text);
  return { text: out, detectedSource: resolvedSource };
}
