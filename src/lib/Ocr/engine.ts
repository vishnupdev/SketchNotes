/**
 * The recognition engine: loading it, keeping it, and being honest about it.
 *
 * This is the only impure module in `lib/Ocr/` and the only one that touches
 * the network. Everything about that is deliberate, because the engine is by
 * far the most awkward thing in this workspace:
 *
 * - **It is about 7 MB** — a WebAssembly build of Tesseract plus a trained
 *   language model. That is too much to precache for every visitor of a
 *   workspace where most people will never open this app, so it is fetched the
 *   first time somebody actually runs a recognition.
 * - **It is fetched from jsDelivr**, pinned by the installed package version.
 *   The engine's own defaults already point there, so no URL is hardcoded here
 *   to rot on the next upgrade.
 * - **It caches itself.** Tesseract writes the language model into IndexedDB,
 *   so the download happens once per device and every later run is local. This
 *   is the one app here that needs a connection to work the *first* time, and
 *   the UI says so rather than failing mysteriously.
 * - **The picture never goes anywhere.** The engine comes to the image; the
 *   image does not go to a server. Recognition runs in a worker on this device.
 *
 * The module is imported dynamically by the panels (`await import(...)`), which
 * is what keeps the wrapper — and the code path that pulls in the engine — out
 * of the initial bundle entirely.
 */

import type { RawPage } from "./blocks";

/** What the engine is doing, for a progress line that says something useful. */
export type Phase = "idle" | "loading" | "recognising" | "done" | "error";

export interface EngineProgress {
  phase: Phase;
  /** 0–1 within the current phase, or null when the engine gives no figure. */
  ratio: number | null;
  /** A short human sentence, already suitable for display. */
  note: string;
}

export type ProgressHandler = (progress: EngineProgress) => void;

/**
 * The engine's own status strings, mapped to sentences worth reading.
 *
 * Tesseract reports things like "loading language traineddata" and
 * "initializing api", which are accurate and mean nothing to the person
 * waiting. The mapping exists so the first run can explain that a one-off
 * download is happening — the single most confusing moment in this app.
 */
const NOTES: Record<string, string> = {
  "loading tesseract core": "Fetching the recognition engine — about 3 MB, once per device.",
  "initializing tesseract": "Starting the engine…",
  "loading language traineddata": "Fetching the English model — about 4 MB, once per device.",
  "loaded language traineddata": "Model ready.",
  "initializing api": "Almost there…",
  "initialized api": "Ready.",
  "recognizing text": "Reading the picture…",
};

const noteFor = (status: string): string =>
  NOTES[status] ?? `${status.charAt(0).toUpperCase()}${status.slice(1)}…`;

/** The minimal shape this module needs from a Tesseract worker. */
interface Recogniser {
  recognize: (
    image: unknown,
    options?: { rectangle?: { left: number; top: number; width: number; height: number } },
  ) => Promise<{ data: RawPage }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}

/**
 * The one worker, shared by every recognition in the session.
 *
 * Held as the *promise* rather than the resolved worker so that two panels
 * asking at once share a single load instead of racing into two 7 MB downloads
 * and two wasm heaps.
 */
let pending: Promise<Recogniser> | null = null;

/** Whether a recognition has succeeded this session — i.e. the model is warm. */
let warm = false;

export const isWarm = (): boolean => warm;

/**
 * The error shown when the engine cannot be fetched.
 *
 * Deliberately does not consult `navigator.onLine`: it reports the browser's
 * guess about the network stack, not whether a CDN is reachable, and it is
 * wrong in both directions often enough that a pre-flight check on it produces
 * confidently incorrect messages. Attempting the load and explaining the
 * failure is more honest than predicting it.
 */
export class EngineUnavailable extends Error {
  constructor() {
    super(
      "The recognition engine could not be downloaded. It is about 7 MB and is fetched once, " +
        "so this needs a connection the first time — after that it is stored on this device and " +
        "works offline.",
    );
    this.name = "EngineUnavailable";
  }
}

/**
 * Get the shared worker, loading it if this is the first call.
 *
 * A failed load clears the cached promise, so a retry after the connection
 * comes back actually retries rather than re-throwing the first failure for the
 * rest of the session.
 */
async function getWorker(onProgress?: ProgressHandler): Promise<Recogniser> {
  if (pending) return pending;

  pending = (async () => {
    const { createWorker, OEM } = await import("tesseract.js");

    // LSTM_ONLY selects the smaller core and the integer model: the legacy
    // engine adds several megabytes and is worse at everything except
    // fixed-pitch scans of the kind nobody photographs any more.
    return (await createWorker("eng", OEM.LSTM_ONLY, {
      logger: (message) => {
        onProgress?.({
          phase: message.status === "recognizing text" ? "recognising" : "loading",
          ratio: typeof message.progress === "number" ? message.progress : null,
          note: noteFor(message.status),
        });
      },
    })) as unknown as Recogniser;
  })();

  try {
    return await pending;
  } catch {
    pending = null;
    throw new EngineUnavailable();
  }
}

export interface RecogniseOptions {
  /** Restrict recognition to a rectangle, in the image's own pixels. */
  region?: { left: number; top: number; width: number; height: number };
  /**
   * How to read the layout. "auto" finds columns and blocks; "block" treats the
   * whole picture as one paragraph, which is markedly better for a cropped
   * region or a single label, where column detection has nothing to find and
   * invents structure instead.
   */
  layout?: "auto" | "block" | "line" | "sparse";
  onProgress?: ProgressHandler;
}

/** Tesseract's page-segmentation modes, by the names this app uses. */
const PSM: Record<NonNullable<RecogniseOptions["layout"]>, string> = {
  auto: "3",
  block: "6",
  line: "7",
  sparse: "11",
};

/**
 * Recognise one image.
 *
 * `image` is anything Tesseract accepts — here always a canvas, because the
 * picture has been through the preprocessing pipeline before it arrives.
 */
export async function recognise(
  image: HTMLCanvasElement | Blob,
  options: RecogniseOptions = {},
): Promise<RawPage> {
  const { region, layout = "auto", onProgress } = options;

  const worker = await getWorker(onProgress);
  await worker.setParameters({
    tessedit_pageseg_mode: PSM[layout],
    // Without this the engine collapses runs of spaces, which destroys the
    // alignment of anything tabular — the case where "Lines" output matters.
    preserve_interword_spaces: "1",
  });

  onProgress?.({ phase: "recognising", ratio: 0, note: "Reading the picture…" });
  const { data } = await worker.recognize(image, region ? { rectangle: region } : undefined);
  warm = true;
  onProgress?.({ phase: "done", ratio: 1, note: "Done." });
  return data;
}

/**
 * Shut the engine down and free its heap.
 *
 * Called when the app unmounts. The wasm heap for a warm engine is tens of
 * megabytes, and a workspace where every app stays mounted cannot afford to
 * hold that for an app nobody is looking at.
 */
export async function release(): Promise<void> {
  const worker = pending;
  pending = null;
  if (!worker) return;
  try {
    (await worker).terminate();
  } catch {
    /* a worker that failed to load has nothing to terminate */
  }
}
