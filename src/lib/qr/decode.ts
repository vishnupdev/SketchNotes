/**
 * Reading QR codes out of pixels.
 *
 * Two engines, in preference order:
 *
 *  1. **`BarcodeDetector`** — the browser's own, hardware-accelerated where
 *     available (Chromium, Android). Costs nothing to ship and is markedly
 *     faster on a live camera feed.
 *  2. **jsQR** — a small pure-JS decoder, imported only if the first is missing
 *     (Firefox, Safari desktop). Loaded dynamically so browsers that never need
 *     it never download it.
 *
 * Everything here runs on-device on pixels the page already has: nothing is
 * uploaded, and no frame is kept after it has been looked at.
 */

let detector: BarcodeDetector | null = null;
let detectorChecked = false;

/** The browser's own QR reader, if it has one and it supports QR. */
async function nativeDetector(): Promise<BarcodeDetector | null> {
  if (detectorChecked) return detector;
  detectorChecked = true;
  try {
    if (typeof window === "undefined" || !window.BarcodeDetector) return null;
    const formats = (await window.BarcodeDetector.getSupportedFormats?.()) ?? [];
    if (formats.length && !formats.includes("qr_code")) return null;
    detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    detector = null;
  }
  return detector;
}

/** Whether decoding will use the browser's built-in reader. */
export async function usingNativeDecoder(): Promise<boolean> {
  return (await nativeDetector()) !== null;
}

/** jsQR's call signature, narrowed to what is used here. */
type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" },
) => { data: string } | null;

let jsqr: Promise<JsQrDecoder> | null = null;

/** Load the fallback decoder once, tolerating either module shape. */
function loadJsQr(): Promise<JsQrDecoder> {
  if (!jsqr) {
    jsqr = import("jsqr").then((mod) => {
      const holder = mod as unknown as { default?: JsQrDecoder };
      return (holder.default ?? (mod as unknown as JsQrDecoder)) as JsQrDecoder;
    });
  }
  return jsqr;
}

/**
 * Decode from a canvas or video frame. Returns the payload, or null when there
 * is no readable code in the image — which is the common case on a live feed and
 * never an error.
 */
export async function decodeFrom(source: HTMLCanvasElement): Promise<string | null> {
  const native = await nativeDetector();
  if (native) {
    try {
      const found = await native.detect(source);
      const value = found.find((r) => r.rawValue)?.rawValue;
      if (value) return value;
      // A native detector that found nothing is authoritative for this frame.
      return null;
    } catch {
      // A detector that throws (some Linux builds ship a stub) is not worth
      // asking again — fall through to jsQR for this and every later frame.
      detector = null;
    }
  }

  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const image = ctx.getImageData(0, 0, source.width, source.height);
  const decode = await loadJsQr();
  // "attemptBoth" also reads a code printed light-on-dark, which is common on
  // dark posters and in screenshots of dark-themed pages.
  const result = decode(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data || null;
}

/**
 * Decode a still image — a photo, a screenshot, a pasted picture.
 *
 * Large images are scaled down first: a 12-megapixel photo is both slow to
 * decode and no more readable than the 1600px version, and jsQR walks every
 * pixel.
 */
export async function decodeImageFile(file: File | Blob): Promise<string | null> {
  const bitmap = await loadBitmap(file);
  if (!bitmap) return null;
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();
  return decodeFrom(canvas);
}

/** An ImageBitmap where the browser has one, else a decoded <img>. */
async function loadBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    if (typeof createImageBitmap === "function") return await createImageBitmap(file);
  } catch {
    /* fall through to the <img> path */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
