/**
 * Opening a camera, shared across the workspace.
 *
 * Four apps reach for `getUserMedia` — Color Lens to read a colour, QR Codes to
 * scan a code, Scan to photograph a page, Nearby to enumerate devices — and each
 * had grown its own copy of the same three things: the support probe, the
 * mapping from a `getUserMedia` rejection to something explainable, and the
 * track-stopping that turns the recording indicator off. Three copies of a
 * security-visible teardown is two too many.
 *
 * What is shared is the part that is genuinely identical: **capability,
 * classification and release**. What is *not* shared is the constraints and the
 * wording. Those differ for real reasons — Color Lens wants a modest 1080p
 * preview and can say "attach a photo instead", Scan wants every pixel the sensor
 * has and cannot, and the QR scanner wants a small fast frame. Forcing one set of
 * either would make this module a worse fit than the copies it replaces.
 *
 * Pure browser API, no React.
 */

/** Why a camera could not be opened. */
export type CameraError =
  | "unsupported"
  | "denied"
  | "notfound"
  | "inuse"
  | "insecure"
  | "unknown";

/**
 * Whether this browser can open a camera at all.
 *
 * The secure-context test is part of it rather than a separate check:
 * `getUserMedia` is undefined over plain http on most browsers, so without it the
 * failure reports as "this browser doesn't support cameras", which sends people
 * looking for a browser bug instead of at the URL bar.
 */
export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    (typeof window === "undefined" || window.isSecureContext)
  );
}

/**
 * Map a `getUserMedia` rejection onto an explainable case.
 *
 * The names come from the spec, and the groupings are the ones a person can act
 * on: permission (`NotAllowedError`, `SecurityError`), absence (`NotFoundError`,
 * `OverconstrainedError` — a constraint no device satisfies is, from the user's
 * side, "no suitable camera"), and contention (`NotReadableError`, `AbortError`,
 * which is what another app holding the device produces).
 */
export function classifyCameraError(err: unknown): CameraError {
  if (!cameraSupported()) {
    return typeof window !== "undefined" && !window.isSecureContext ? "insecure" : "unsupported";
  }
  const name =
    err instanceof DOMException ? err.name : ((err as { name?: string } | null)?.name ?? "");
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "notfound";
  if (name === "NotReadableError" || name === "AbortError") return "inuse";
  return "unknown";
}

/**
 * Open a video stream with the caller's constraints.
 *
 * Constraints are the caller's business — see the module comment. This only
 * guarantees the capability check happens first, so a caller never has to
 * distinguish "rejected" from "was never possible".
 */
export async function openCamera(video: MediaTrackConstraints): Promise<MediaStream> {
  if (!cameraSupported()) throw new DOMException("unsupported", "NotSupportedError");
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

/**
 * Stop every track, releasing the camera and turning off its indicator.
 *
 * The single most important function here. A stream left running shows a
 * recording indicator the user cannot explain or dismiss, so every exit path in
 * every app funnels through this one call.
 */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Draw the current frame into a canvas at the video's true resolution.
 *
 * `videoWidth`, never the element's laid-out size: the element is sized to fit
 * the screen, and capturing at that size throws away most of what the sensor
 * gave before anything can be done with it.
 */
export function captureFrameCanvas(video: HTMLVideoElement): HTMLCanvasElement | null {
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
