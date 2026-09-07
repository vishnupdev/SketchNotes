/**
 * The one place a canvas is involved: turning a chosen file plus a tune into
 * the bitmap the engine is handed.
 *
 * Kept out of `preprocess.ts` so the pixel maths there stays pure and testable.
 * What lives here is only the part that genuinely needs a browser — decoding
 * the file, scaling, rotating — plus the ordering that makes the rest correct.
 */

import { applyTune, scalePlan, type ScalePlan, type TuneSettings } from "./preprocess";

/** A decoded picture, with the natural size the boxes will be reported in. */
export interface Picture {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
  /** Object URL for showing it on screen; revoked by the caller. */
  url: string;
  /** The file's own size, for the "nothing is uploaded" line. */
  bytes: number;
}

/**
 * Decode a file with `createImageBitmap`, not an `<img>`.
 *
 * `createImageBitmap` decodes off the main thread and hands back something a
 * canvas can draw synchronously, so a 12-megapixel photo does not lock the UI
 * mid-load. It also fails cleanly on a file that is not an image, where an
 * `<img>` merely fires an error event with no reason attached.
 */
export async function decode(file: File): Promise<Picture> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "That file could not be read as a picture. JPEG, PNG, WebP, GIF, BMP and AVIF all work.",
    );
  }

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    name: file.name || "picture",
    url: URL.createObjectURL(file),
    bytes: file.size,
  };
}

export interface Prepared {
  canvas: HTMLCanvasElement;
  plan: ScalePlan;
  /** The threshold actually used, when one was, for the Tune panel to report. */
  scaleNote: string;
}

/**
 * Draw the picture at the tuned size and orientation, then run the pixel
 * pipeline over it.
 *
 * Rotation happens on the canvas before the pixels are touched, because a
 * quarter turn swaps the axes and everything downstream — the boxes the engine
 * reports, the overlay drawn from them — has to be in one consistent frame.
 */
export function prepare(picture: Picture, tune: TuneSettings): Prepared {
  const quarter = tune.rotate % 2 === 1;
  const sourceWidth = quarter ? picture.height : picture.width;
  const sourceHeight = quarter ? picture.width : picture.height;

  const plan = scalePlan(sourceWidth, sourceHeight, tune.scale);

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser would not give the page a canvas to work on.");

  // White rather than transparent: a PNG with transparency composited onto
  // nothing reads as black, which inverts the whole page for the engine.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((tune.rotate * Math.PI) / 2);
  const drawWidth = plan.scale * picture.width;
  const drawHeight = plan.scale * picture.height;
  context.imageSmoothingQuality = "high";
  context.drawImage(picture.bitmap, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();

  const source = context.getImageData(0, 0, canvas.width, canvas.height);
  const tuned = applyTune(source, tune);
  // Written back into the ImageData the canvas already gave us rather than a
  // freshly constructed one: the pipeline's dimensions are identical by
  // construction, and `new ImageData(...)` cannot take a buffer whose type the
  // compiler only knows as ArrayBufferLike.
  source.data.set(tuned.data);
  context.putImageData(source, 0, 0);

  return {
    canvas,
    plan,
    scaleNote: plan.clamped
      ? `Scaled to ${plan.scale.toFixed(2)}× — more than that would exceed the memory the engine can hold.`
      : `${plan.width} × ${plan.height} pixels.`,
  };
}
