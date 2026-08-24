import { decodeFrom } from "./decode";

/**
 * A live camera QR scanner.
 *
 * Owns exactly three things — the stream, the frame loop and the sampling canvas
 * — and gives them all back on {@link Scanner.stop}. That matters here more than
 * usual: a camera left running is the workspace's most visible privacy failure
 * (the recording indicator stays lit), so every exit path stops it, including
 * switching apps, which unmounts the app entirely.
 *
 * Frames are sampled on a timer rather than every animation frame. Decoding is
 * the expensive part and ten looks a second is far past what a hand can aim, so
 * the rest of the frames are skipped instead of burning battery on them.
 *
 * `continuous` mode is what Handoff needs: a payload split across many codes
 * has to keep reading after the first hit, and repeats of a code already seen
 * are dropped so the caller only hears about new ones.
 */

export interface ScannerOptions {
  video: HTMLVideoElement;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  /** Keep scanning after the first code (default false = stop on first hit). */
  continuous?: boolean;
  /** "environment" (rear, the default) or "user" (selfie). */
  facing?: "environment" | "user";
  /** Milliseconds between decode attempts. */
  intervalMs?: number;
}

export interface Scanner {
  stop: () => void;
  /** Which camera the stream actually opened with, once known. */
  label: () => string;
}

const SAMPLE_EDGE = 640;

/** Human-readable reason a camera could not be opened. */
function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow it in your browser's site settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app or tab.";
  }
  return "The camera couldn't be started.";
}

/**
 * Open the camera and start looking for codes. Resolves once the stream is
 * playing; scanning then continues until `stop()`.
 */
export async function startScanner(options: ScannerOptions): Promise<Scanner | null> {
  const { video, onResult, onError, continuous = false, facing = "environment" } = options;
  const intervalMs = options.intervalMs ?? 100;

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    onError?.("This browser can't open a camera.");
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (error) {
    onError?.(cameraError(error));
    return null;
  }

  const canvas = document.createElement("canvas");
  let timer: number | null = null;
  let stopped = false;
  let busy = false;
  const seen = new Set<string>();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    for (const track of stream.getTracks()) track.stop();
    // Detaching the stream is what actually clears the "camera in use" state in
    // some browsers, even after the tracks have been stopped.
    video.srcObject = null;
  };

  const tick = async () => {
    if (stopped || busy) return;
    if (video.readyState < 2 || !video.videoWidth) return;
    busy = true;
    try {
      // Sample a square from the middle of the frame at a modest size: a code
      // is aimed at the centre, and decoding 720p in full is wasted work.
      const edge = Math.min(video.videoWidth, video.videoHeight);
      const size = Math.min(SAMPLE_EDGE, edge);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(
          video,
          (video.videoWidth - edge) / 2,
          (video.videoHeight - edge) / 2,
          edge,
          edge,
          0,
          0,
          size,
          size,
        );
        const text = await decodeFrom(canvas);
        if (text && !stopped && !seen.has(text)) {
          if (!continuous) {
            seen.add(text);
            stop();
            onResult(text);
            return;
          }
          seen.add(text);
          onResult(text);
        }
      }
    } catch {
      /* a frame that couldn't be read is not worth reporting; the next one will */
    } finally {
      busy = false;
    }
  };

  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;
  try {
    await video.play();
  } catch {
    // Autoplay refused (rare for a muted inline stream). The frame loop still
    // works if the user taps the element, so this isn't fatal.
  }
  if (stopped) return null;
  timer = window.setInterval(() => void tick(), intervalMs);

  return {
    stop,
    label: () => stream.getVideoTracks()[0]?.label ?? "",
  };
}

/** Whether this device reports more than one camera, so a flip button earns its place. */
export async function hasMultipleCameras(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").length > 1;
  } catch {
    return false;
  }
}
