"use client";

import {
  captureFrameCanvas,
  cameraSupported,
  classifyCameraError,
  closeCamera,
  openCamera,
  type CameraError,
} from "@/lib/camera";

/**
 * Scan's camera.
 *
 * The capability probe, error classification and teardown come from the shared
 * `lib/camera.ts`. What is Scan's own is the *constraints* and the *wording*, and
 * both differ for real reasons: a document scanner asks for the rear camera at the
 * highest resolution the sensor will give, because the whole output quality is
 * decided by how many pixels landed on the page — where Color Lens wants a modest
 * live preview and the QR scanner wants a small, fast frame. And Scan's failure
 * messages cannot say "attach a photo instead", because adding pictures is a
 * separate route it already offers.
 */

export type { CameraError };
export { cameraSupported, closeCamera };

export const CAMERA_MESSAGES: Record<CameraError, string> = {
  unsupported: "This browser cannot open a camera. You can still add pictures from a file.",
  denied:
    "Camera access was refused. Allow it for this site in your browser's address bar, then try again.",
  notfound: "No camera was found on this device. You can still add pictures from a file.",
  inuse: "The camera is already in use by something else.",
  insecure: "Using the camera needs a secure (https) connection. You can still add pictures from a file.",
  unknown: "The camera could not be started.",
};

export { classifyCameraError };

/**
 * Open the rear camera at the best resolution available.
 *
 * The resolution is an *ideal*, not a minimum: asking for exactly 4K on a device
 * that cannot manage it fails the whole request, whereas an ideal degrades to
 * whatever the hardware has. `environment` is likewise a preference — on a laptop
 * with only a front camera, insisting would mean no camera at all.
 */
export async function openScanCamera(): Promise<MediaStream> {
  return openCamera({
    facingMode: { ideal: "environment" },
    width: { ideal: 3840 },
    height: { ideal: 2160 },
  });
}

/** Grab the current frame at the video's true resolution. */
export const captureFrame = captureFrameCanvas;
