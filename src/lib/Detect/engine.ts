/**
 * The detector: loading it, keeping it, and being honest about it.
 *
 * The only impure module in `lib/Detect/` and the only one that touches the
 * network — the same shape as OCR's engine, and for the same reasons, because
 * it is the same awkward kind of dependency:
 *
 * - **It is a few megabytes of trained weights**, far too much to precache for
 *   every visitor of a workspace where most people will never open this app. So
 *   it is fetched the first time somebody actually starts a detection, and the
 *   screen says so while it happens.
 * - **The weights come from Google's model host**, the URL built by the model
 *   package from the base you pick. Nothing is hardcoded here to rot on the
 *   next upgrade.
 * - **The service worker caches them.** Unlike Tesseract, this model has no
 *   IndexedDB cache of its own — left alone it would lean on the HTTP cache,
 *   which is evictable and offers no offline guarantee at all. So `public/sw.js`
 *   holds `storage.googleapis.com/tfjs-models/` cache-first in a deliberately
 *   *unversioned* cache, and the app's offline claim is true rather than nearly
 *   true. Keep the two sides in step.
 * - **The picture never goes anywhere.** The model comes to the camera; the
 *   camera does not go to a server. Every frame is read, scored and discarded on
 *   this device, which for a live video feed of someone's home is the only
 *   defensible arrangement.
 *
 * The module is imported dynamically by the panels (`await import(...)`), which
 * is what keeps TensorFlow — by a distance the heaviest thing in the workspace's
 * dependency tree — out of the initial bundle of every other app.
 */

import type { Detection } from "./detections";

/**
 * Which trained model to run.
 *
 * A real trade rather than a settings-screen flourish, which is why it is on
 * screen: `fast` is a quantised MobileNet small enough to keep up with live
 * video on a phone, `accurate` is several times the size and finds smaller and
 * more crowded things, at a frame rate that suits a still picture better than a
 * moving one. The names say what you get, not what the architecture is called.
 */
export type ModelId = "fast" | "accurate";

/** The model package's own name for each base, and what each one costs. */
const BASES: Record<ModelId, { base: "lite_mobilenet_v2" | "mobilenet_v2"; size: string }> = {
  fast: { base: "lite_mobilenet_v2", size: "about 5 MB" },
  accurate: { base: "mobilenet_v2", size: "about 13 MB" },
};

/** How big each model is, for the line shown before anyone commits to it. */
export const modelSize = (model: ModelId): string => BASES[model].size;

/** What the engine is doing, for a progress line that says something useful. */
export type Phase = "idle" | "loading" | "ready" | "error";

export interface EngineProgress {
  phase: Phase;
  /** A short human sentence, already suitable for display. */
  note: string;
}

export type ProgressHandler = (progress: EngineProgress) => void;

/** The minimal shape this module needs from the model package. */
interface Detector {
  detect: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<{ bbox: [number, number, number, number]; class: string; score: number }[]>;
  dispose: () => void;
}

/**
 * The loaded models, keyed by id.
 *
 * Held as the *promise* rather than the resolved model so that the Live and
 * Picture panels asking at once share one load instead of racing into two
 * downloads and two copies of the weights in GPU memory.
 */
const loaded = new Map<ModelId, Promise<Detector>>();

/** Which models have completed a detection — i.e. are genuinely warm. */
const warm = new Set<ModelId>();

export const isWarm = (model: ModelId): boolean => warm.has(model);

/**
 * The error shown when the weights cannot be fetched.
 *
 * Deliberately does not consult `navigator.onLine`: it reports the browser's
 * guess about the network stack, not whether a model host is reachable, and it
 * is wrong in both directions often enough that a pre-flight check on it
 * produces confidently incorrect messages. Attempting the load and explaining
 * the failure is more honest than predicting it.
 */
export class DetectorUnavailable extends Error {
  constructor(model: ModelId) {
    super(
      `The detector could not be downloaded. It is ${modelSize(model)} and is fetched once, so ` +
        "this needs a connection the first time — after that it is stored on this device and " +
        "works offline.",
    );
    this.name = "DetectorUnavailable";
  }
}

/**
 * Pick a compute backend, preferring the GPU.
 *
 * WebGL is what makes live detection possible at all — the same model on the
 * CPU backend manages about one frame a second on a phone.
 *
 * **Both backends are registered even so, and not as a fallback.** Several of
 * the operations this model needs have no WebGL kernel at all — non-maximum
 * suppression, the step that collapses a thousand overlapping candidate boxes
 * into the handful you see, is the notable one — and the WebGL backend forwards
 * those to the CPU backend rather than implementing them. With only WebGL
 * registered, a detection still *returns a correct result* and then throws
 * `Backend name 'cpu' not found in registry` from outside the promise chain,
 * past every catch in this app. That is exactly the sort of failure that ships:
 * the feature works, and the console fills up.
 *
 * It doubles as the honest fallback for a browser with WebGL disabled or a
 * driver on Chrome's blocklist, which then gets a slow app instead of a broken
 * one.
 */
async function selectBackend(tf: typeof import("@tensorflow/tfjs-core")): Promise<void> {
  // Production mode, set before anything runs. It is what TensorFlow's own
  // `warn` checks, and without it the WebGL kernel for non-maximum suppression
  // logs "call the async version instead" on *every call* — which in the live
  // view is ten console warnings a second (rule #7). The advice cannot be taken
  // in any case: the synchronous call is inside the model package, not here.
  tf.enableProdMode();

  await Promise.all([
    import("@tensorflow/tfjs-backend-webgl"),
    import("@tensorflow/tfjs-backend-cpu"),
  ]);

  if (await tf.setBackend("webgl").catch(() => false)) {
    await tf.ready();
    return;
  }
  await tf.setBackend("cpu");
  await tf.ready();
}

/**
 * Get a model, loading it if this is the first call.
 *
 * A failed load clears the cached promise, so a retry after the connection
 * comes back actually retries rather than re-throwing the first failure for the
 * rest of the session.
 */
async function getDetector(model: ModelId, onProgress?: ProgressHandler): Promise<Detector> {
  const existing = loaded.get(model);
  if (existing) return existing;

  const pending = (async () => {
    onProgress?.({ phase: "loading", note: "Starting the graphics backend…" });
    const tf = await import("@tensorflow/tfjs-core");
    await selectBackend(tf);

    onProgress?.({
      phase: "loading",
      note: `Fetching the detector — ${modelSize(model)}, once per device.`,
    });
    const cocoSsd = await import("@tensorflow-models/coco-ssd");
    return (await cocoSsd.load({ base: BASES[model].base })) as unknown as Detector;
  })();

  loaded.set(model, pending);
  try {
    const detector = await pending;
    onProgress?.({ phase: "ready", note: "Detector ready." });
    return detector;
  } catch {
    loaded.delete(model);
    throw new DetectorUnavailable(model);
  }
}

/** Load a model without running anything — what the Start button waits on. */
export async function prepare(model: ModelId, onProgress?: ProgressHandler): Promise<void> {
  await getDetector(model, onProgress);
}

export interface DetectOptions {
  /** Ignore anything the model is less sure of than this, 0–1. */
  minScore?: number;
  /** Most boxes to return from one frame. */
  maxBoxes?: number;
  onProgress?: ProgressHandler;
}

/**
 * The pixels to hand the model, in a size that means what it says.
 *
 * TensorFlow builds its tensor from `element.width` and `element.height`, and
 * for a laid-out `<img>` those are the **rendered** size — not the picture's
 * own. Hand it the `<img>` and every box comes back measured in CSS pixels of
 * however wide the window happened to be, which produces the most
 * time-consuming kind of bug: one that looks like a bad model. The boxes are
 * plausible, roughly track the right things, and are consistently too small and
 * drifting toward one corner. Worse, the result would depend on the size of the
 * browser window, so the same photo would detect differently on a phone.
 *
 * A `<video>` is the exception — TensorFlow special-cases it and reads
 * `videoWidth`/`videoHeight`, which is already the natural size — and a canvas
 * cannot have the problem at all, because a canvas's width and height *are* its
 * pixels. So an image is copied into a canvas at its natural size first, and
 * the normalisation lives here rather than in the panels: it is a property of
 * how the model reads its input, and a caller that passes an `<img>` should
 * simply get the right answer.
 */
function sourceFor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): HTMLVideoElement | HTMLCanvasElement | null {
  if (!(input instanceof HTMLImageElement)) return input;

  const canvas = document.createElement("canvas");
  canvas.width = input.naturalWidth;
  canvas.height = input.naturalHeight;
  if (!canvas.width || !canvas.height) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(input, 0, 0);
  return canvas;
}

/**
 * Find the objects in one frame.
 *
 * `input` is the video element, a picture, or a canvas holding a still.
 * Whichever it is, the boxes come back in the source's own **natural** pixels —
 * `videoWidth`×`videoHeight` for a stream, `naturalWidth`×`naturalHeight` for a
 * picture — which is the space `lib/Detect/detections.ts` projects from. See
 * {@link sourceFor} for why that sentence needed writing down.
 */
export async function detect(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  model: ModelId,
  options: DetectOptions = {},
): Promise<Detection[]> {
  const detector = await getDetector(model, options.onProgress);
  const pixels = sourceFor(input);
  if (!pixels) return [];
  const found = await detector.detect(pixels, options.maxBoxes ?? 20, options.minScore ?? 0.5);
  warm.add(model);
  return found.map(({ bbox, class: label, score }) => ({
    label,
    score,
    box: { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] },
  }));
}

/**
 * Drop every loaded model and free its GPU memory.
 *
 * Called when the app unmounts. A warm model holds tens of megabytes of weights
 * in texture memory, and a workspace that keeps every app mounted cannot hold
 * that for one nobody is looking at. The next visit reloads it from the service
 * worker's cache, not the network.
 */
export async function release(): Promise<void> {
  const models = [...loaded.values()];
  loaded.clear();
  warm.clear();
  for (const pending of models) {
    try {
      (await pending).dispose();
    } catch {
      /* a model that failed to load has nothing to dispose */
    }
  }
}
