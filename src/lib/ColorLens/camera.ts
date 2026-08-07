/**
 * Camera access for Color Lens. The stream is only ever drawn into a local
 * canvas — no frame leaves the device, and the tracks are stopped the moment
 * the user captures or closes the viewfinder so the camera light goes out.
 */

/** Which physical camera to prefer. */
export type Facing = "environment" | "user";

/** Human-readable reason a camera couldn't be opened. */
export type CameraError =
  | "unsupported"
  | "denied"
  | "notfound"
  | "inuse"
  | "insecure"
  | "unknown";

export const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser doesn't support camera capture. Attach a photo instead.",
  denied:
    "Camera access was blocked. Allow it in your browser's site settings, or attach a photo instead.",
  notfound: "No camera was found on this device. Attach a photo instead.",
  inuse: "The camera is being used by another app. Close it and try again.",
  insecure: "Camera capture needs a secure (https) connection. Attach a photo instead.",
  unknown: "Couldn't start the camera. Attach a photo instead.",
};

/** Whether this browser can open a camera stream at all. */
export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    // getUserMedia is gated on a secure context; check up front so we can say why.
    (typeof window === "undefined" || window.isSecureContext)
  );
}

/** Map a getUserMedia rejection onto one of our explainable cases. */
export function classifyError(err: unknown): CameraError {
  if (!cameraSupported()) {
    return typeof window !== "undefined" && !window.isSecureContext ? "insecure" : "unsupported";
  }
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "notfound";
  if (name === "NotReadableError" || name === "AbortError") return "inuse";
  return "unknown";
}

/**
 * Open a video stream, preferring the requested camera but accepting whatever
 * the device has — a laptop with only a front camera should still work when the
 * rear camera is asked for.
 */
export async function openCamera(facing: Facing): Promise<MediaStream> {
  if (!cameraSupported()) throw new DOMException("unsupported", "NotSupportedError");
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });
}

/** Stop every track, releasing the camera and turning off its indicator. */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Grab the current video frame as a data URL. A data URL (rather than an object
 * URL) means the captured shot has no lifetime to manage and can be re-read
 * after the stream is gone.
 */
export function captureFrame(video: HTMLVideoElement): string | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  // JPEG at high quality: a photo compresses far smaller than PNG, and the
  // colours we read back are unaffected at this quality level.
  return canvas.toDataURL("image/jpeg", 0.92);
}
