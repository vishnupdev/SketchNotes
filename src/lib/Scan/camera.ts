"use client";

/**
 * Scan's camera.
 *
 * Deliberately Scan's own rather than shared (rules #4/#5): what a document
 * scanner asks the camera for is not what a colour picker or a QR scanner asks
 * for. This one requests the **rear** camera at the highest resolution it can get,
 * because the whole output quality depends on how many pixels landed on the page —
 * where Color Lens wants a modest live preview and the QR scanner wants a fast,
 * small frame.
 *
 * Note for later: `lib/ColorLens/camera.ts` and `lib/qr/scanner.ts` already open
 * cameras with their own copies of the error classification below. Three near-copies
 * is one too many, and the constraint differences do not justify it — the honest fix
 * is a shared opener taking a constraints argument, which is a refactor of two
 * working apps and does not belong in the same change as a new one.
 */

export type CameraError = "unsupported" | "denied" | "no-camera" | "in-use" | "failed";

export const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser cannot open a camera.",
  denied:
    "Camera access was refused. Allow it for this site in your browser's address bar, then try again.",
  "no-camera": "No camera was found on this device. You can still add pictures from a file.",
  "in-use": "The camera is already in use by something else.",
  failed: "The camera could not be started.",
};

export const cameraSupported = (): boolean =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export function classifyCameraError(err: unknown): CameraError {
  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  return "failed";
}

/**
 * Open the rear camera at the best resolution available.
 *
 * The resolution is an *ideal*, not a minimum: asking for exactly 4K on a device
 * that cannot manage it fails the whole request, whereas an ideal degrades to
 * whatever the hardware has. `environment` is likewise a preference — on a laptop
 * with only a front camera, insisting would mean no camera at all.
 */
export async function openScanCamera(): Promise<MediaStream> {
  if (!cameraSupported()) {
    throw Object.assign(new Error(CAMERA_MESSAGES.unsupported), { name: "UnsupportedError" });
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 3840 },
      height: { ideal: 2160 },
    },
    audio: false,
  });
}

/** Stop every track, which is what turns the camera light off. */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Grab the current frame at the video's true resolution.
 *
 * `videoWidth`, not the element's CSS width — the element is laid out to fit the
 * screen, and capturing at that size would throw away most of the sensor's detail
 * before the warp ever runs.
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}
