"use client";

/**
 * Live transcription with the Web Speech API.
 *
 * Two things to know about this API, both of which shape the code below:
 *
 *  - **It is not standardised and not universal.** Chrome and Safari expose it
 *    under `webkitSpeechRecognition`; Firefox does not implement it at all. So it
 *    is treated as an *enhancement*: the recording always works, and the
 *    transcript is a bonus where the browser can provide one. Nothing in the app
 *    depends on it existing.
 *  - **It stops on its own.** Recognition ends after a pause, on a network hiccup,
 *    or for no stated reason, and it does so silently mid-recording. A transcript
 *    that quietly stops three minutes into a ten-minute memo is worse than no
 *    transcript, so this module restarts it automatically for as long as the
 *    caller wants it running — see `keepAlive`.
 *
 * On Chrome, recognition is performed on Google's servers. That is a real privacy
 * distinction from the rest of this workspace and the UI says so plainly, with the
 * transcript off by default.
 */

/**
 * Minimal structural types. The DOM lib does not ship these, and pulling in a
 * `@types` package for one experimental API is not worth a dependency.
 */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function constructor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const transcriptionSupported = (): boolean => constructor() !== null;

/** Languages offered. Kept short — a full BCP-47 list is not a useful picker. */
export const TRANSCRIPT_LANGUAGES: { id: string; label: string }[] = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "en-IN", label: "English (India)" },
  { id: "ml-IN", label: "Malayalam" },
  { id: "hi-IN", label: "Hindi" },
  { id: "ta-IN", label: "Tamil" },
  { id: "te-IN", label: "Telugu" },
  { id: "kn-IN", label: "Kannada" },
  { id: "es-ES", label: "Spanish" },
  { id: "fr-FR", label: "French" },
  { id: "de-DE", label: "German" },
  { id: "pt-BR", label: "Portuguese (Brazil)" },
  { id: "ar-SA", label: "Arabic" },
  { id: "zh-CN", label: "Chinese (Mandarin)" },
  { id: "ja-JP", label: "Japanese" },
];

export interface TranscriptSession {
  stop: () => void;
}

export interface TranscriptHandlers {
  /** Text confirmed by the engine; append it to the transcript. */
  onFinal: (text: string) => void;
  /** The current in-progress phrase, which will be replaced or confirmed. */
  onInterim: (text: string) => void;
  /** A permanent failure — the caller should stop offering a transcript. */
  onError: (message: string) => void;
}

/**
 * Start transcribing, restarting as needed until `stop()` is called.
 *
 * `no-speech` and `aborted` are not reported as errors: the first is what silence
 * produces and the second is what our own restart produces, and surfacing either
 * would fill the UI with failures during a perfectly good recording.
 */
export function startTranscribing(
  language: string,
  handlers: TranscriptHandlers,
): TranscriptSession | null {
  const Ctor = constructor();
  if (!Ctor) return null;

  let stopped = false;
  let recognition: SpeechRecognitionLike | null = null;
  let restartTimer: number | null = null;

  const spawn = () => {
    if (stopped) return;

    const r = new Ctor();
    recognition = r;
    r.lang = language;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (!text) continue;
        if (result.isFinal) handlers.onFinal(text.trim());
        else interim += text;
      }
      handlers.onInterim(interim.trim());
    };

    r.onerror = (event) => {
      const code = event.error ?? "";
      // Silence and our own restarts are normal, not failures.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        stopped = true;
        handlers.onError("Transcription was refused by the browser.");
        return;
      }
      if (code === "network") {
        handlers.onError("Transcription needs a connection, and it could not reach the service.");
        return;
      }
      handlers.onError("Transcription stopped unexpectedly.");
    };

    // The restart that matters — see the module comment. Delayed a beat, because
    // restarting synchronously inside `onend` throws in Chrome.
    r.onend = () => {
      if (stopped) return;
      restartTimer = window.setTimeout(spawn, 250);
    };

    try {
      r.start();
    } catch {
      // "already started" is benign; anything else will surface via onerror.
    }
  };

  spawn();

  return {
    stop: () => {
      stopped = true;
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      try {
        recognition?.abort();
      } catch {
        /* already gone */
      }
      recognition = null;
    },
  };
}

/**
 * Join transcript fragments into readable text.
 *
 * The engine returns phrases with no punctuation and inconsistent capitals, so
 * this does the minimum that makes a wall of speech scannable: capitalise the
 * first letter of each fragment and end it with a full stop if it has no
 * terminator. Deliberately not more — guessing sentence boundaries inside a
 * fragment would put full stops in the wrong places.
 */
export function joinTranscript(fragments: string[]): string {
  return fragments
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => {
      const capitalised = f[0].toUpperCase() + f.slice(1);
      return /[.!?…]$/.test(capitalised) ? capitalised : `${capitalised}.`;
    })
    .join(" ");
}
