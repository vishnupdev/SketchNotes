import {
  cameraSupported,
  classifyCameraError,
  closeCamera,
  openCamera,
  type CameraError,
} from "@/lib/camera";
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

/**
 * The scanner's wording for each failure.
 *
 * The *classification* is the workspace's shared one (`lib/camera.ts`) — three
 * apps had grown their own copy of the same DOMException-name mapping. Only the
 * wording stays here, because it is the one part that is genuinely this app's:
 * a scanner can suggest reading a code from a picture instead, which the others
 * have no equivalent of.
 */
const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser can't open a camera. Read a code from a picture instead.",
  denied: "Camera access was blocked. Allow it in your browser's site settings, then try again.",
  notfound: "No camera was found on this device.",
  inuse: "The camera is already in use by another app or tab.",
  insecure: "Using the camera needs a secure (https) connection. Read a code from a picture instead.",
  unknown: "The camera couldn't be started.",
};

const cameraError = (error: unknown): string => CAMERA_MESSAGES[classifyCameraError(error)];

/**
 * Open the camera and start looking for codes. Resolves once the stream is
 * playing; scanning then continues until `stop()`.
 */
export async function startScanner(options: ScannerOptions): Promise<Scanner | null> {
  const { video, onResult, onError, continuous = false, facing = "environment" } = options;
  const intervalMs = options.intervalMs ?? 100;

  if (!cameraSupported()) {
    onError?.(cameraError(new DOMException("unsupported", "NotSupportedError")));
    return null;
  }

  let stream: MediaStream;
  try {
    // 720p: big enough to resolve a dense code, small enough that a decode pass
    // every 100ms stays cheap. Deliberately not the sensor's maximum.
    stream = await openCamera({
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
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
    closeCamera(stream);
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
