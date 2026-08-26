/**
 * Camera access for Color Lens. The stream is only ever drawn into a local
 * canvas — no frame leaves the device, and the tracks are stopped the moment
 * the user captures or closes the viewfinder so the camera light goes out.
 *
 * The capability probe, the error classification and the track teardown are the
 * workspace's shared ones (`lib/camera.ts`) — four apps open cameras and three
 * had grown their own copy of that logic. What stays here is what is genuinely
 * this app's: the constraints it wants, the wording of its failures (which can
 * offer "attach a photo instead", where a document scanner cannot), and a capture
 * that returns a data URL.
 */

import {
  captureFrameCanvas,
  cameraSupported,
  classifyCameraError,
  closeCamera,
  openCamera as openStream,
  type CameraError,
} from "@/lib/camera";

/** Which physical camera to prefer. */
export type Facing = "environment" | "user";

// Re-exported so every existing Color Lens import keeps working unchanged.
export { cameraSupported, closeCamera, type CameraError };

/** Map a getUserMedia rejection onto one of our explainable cases. */
export const classifyError = classifyCameraError;

export const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser doesn't support camera capture. Attach a photo instead.",
  denied:
    "Camera access was blocked. Allow it in your browser's site settings, or attach a photo instead.",
  notfound: "No camera was found on this device. Attach a photo instead.",
  inuse: "The camera is being used by another app. Close it and try again.",
  insecure: "Camera capture needs a secure (https) connection. Attach a photo instead.",
  unknown: "Couldn't start the camera. Attach a photo instead.",
};

/**
 * Open a video stream, preferring the requested camera but accepting whatever
 * the device has — a laptop with only a front camera should still work when the
 * rear camera is asked for.
 */
export async function openCamera(facing: Facing): Promise<MediaStream> {
  return openStream({
    facingMode: { ideal: facing },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  });
}

/**
 * Grab the current video frame as a data URL. A data URL (rather than an object
 * URL) means the captured shot has no lifetime to manage and can be re-read
 * after the stream is gone.
 */
export function captureFrame(video: HTMLVideoElement): string | null {
  const canvas = captureFrameCanvas(video);
  // JPEG at high quality: a photo compresses far smaller than PNG, and the
  // colours we read back are unaffected at this quality level.
  return canvas ? canvas.toDataURL("image/jpeg", 0.92) : null;
}
