/**
 * What you do to the picture before the engine sees it.
 *
 * This is the part every browser OCR tool skips and the part that decides
 * whether the result is usable. Tesseract was built for scanned pages at around
 * 300 DPI, black on white, square to the page. A photograph of a receipt is
 * none of those things, and the difference between feeding it raw and feeding
 * it upscaled and binarised is routinely the difference between a page of
 * nonsense and a clean read.
 *
 * Three things carry almost all of that improvement, in order:
 *
 * 1. **Scale.** Small text is the commonest cause of a bad read. The engine
 *    wants a capital letter to be roughly 20–30 pixels tall; phone screenshots
 *    are often half that. Upscaling is not new information, but it gives the
 *    line-finder something to work with.
 * 2. **Binarisation.** Deciding each pixel is ink or paper removes the shading,
 *    JPEG mush and coloured backgrounds that the character classifier reads as
 *    texture. {@link otsuThreshold} chooses the cut automatically.
 * 3. **Inversion.** Light text on a dark background — a terminal, a dark-mode
 *    screenshot — reads as a solid black page. One flag fixes it.
 *
 * Everything here is a pure function over a `{data, width, height}` bitmap, so
 * none of it needs a canvas, a DOM or a browser to test.
 */

/** Structurally an `ImageData`, but constructible in a test. */
export interface Bitmap {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const make = (width: number, height: number): Bitmap => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
});

/**
 * Luminance-weighted greyscale (Rec. 601).
 *
 * The weights are not decoration: a flat average of the channels renders red
 * ink on white at the same value as mid-grey, which then binarises to solid
 * black. Weighting by perceived brightness keeps coloured text legible.
 */
export function toGrey(source: Bitmap): Bitmap {
  const out = make(source.width, source.height);
  for (let i = 0; i < source.data.length; i += 4) {
    const value =
      0.299 * source.data[i] + 0.587 * source.data[i + 1] + 0.114 * source.data[i + 2];
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
    out.data[i + 3] = 255;
  }
  return out;
}

/**
 * Otsu's method: the threshold that best separates the histogram into two
 * groups, found by maximising the variance *between* them.
 *
 * Chosen over a fixed 128 because a photograph is almost never centred on
 * mid-grey — a shadowed page might have its ink at 90 and its paper at 140, and
 * a fixed cut turns the whole thing black. The single pass over the 256-bin
 * histogram below is the standard incremental formulation.
 */
export function otsuThreshold(grey: Bitmap): number {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < grey.data.length; i += 4) histogram[grey.data[i]] += 1;

  const total = grey.width * grey.height;
  if (total === 0) return 128;

  let sum = 0;
  for (let level = 0; level < 256; level += 1) sum += level * histogram[level];

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let best = 0;
  let threshold = 128;

  for (let level = 0; level < 256; level += 1) {
    backgroundWeight += histogram[level];
    if (backgroundWeight === 0) continue;
    const foregroundWeight = total - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundSum += level * histogram[level];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;

    const between =
      backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (between > best) {
      best = between;
      threshold = level;
    }
  }

  return threshold;
}

/** Ink or paper, nothing between. Pixels at exactly the threshold read as ink. */
export function binarise(grey: Bitmap, threshold: number): Bitmap {
  const out = make(grey.width, grey.height);
  for (let i = 0; i < grey.data.length; i += 4) {
    const value = grey.data[i] <= threshold ? 0 : 255;
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
    out.data[i + 3] = 255;
  }
  return out;
}

export function invert(source: Bitmap): Bitmap {
  const out = make(source.width, source.height);
  for (let i = 0; i < source.data.length; i += 4) {
    out.data[i] = 255 - source.data[i];
    out.data[i + 1] = 255 - source.data[i + 1];
    out.data[i + 2] = 255 - source.data[i + 2];
    out.data[i + 3] = source.data[i + 3];
  }
  return out;
}

/**
 * Contrast about mid-grey. `amount` is a multiplier: 1 is unchanged, 2 doubles
 * the distance of every pixel from 128.
 */
export function contrast(source: Bitmap, amount: number): Bitmap {
  const out = make(source.width, source.height);
  for (let i = 0; i < source.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      out.data[i + channel] = (source.data[i + channel] - 128) * amount + 128;
    }
    out.data[i + 3] = source.data[i + 3];
  }
  return out;
}

/**
 * The upper bound on how many pixels we will hand the engine.
 *
 * Recognition time is roughly linear in pixel count and the wasm heap is not
 * generous, so an unbounded 3× upscale of a 12-megapixel phone photo is how you
 * get a dead tab rather than a slow one. 8 megapixels is comfortably more than
 * any page of text needs.
 */
export const MAX_PIXELS = 8_000_000;

export interface ScalePlan {
  scale: number;
  width: number;
  height: number;
  /** True when the requested scale had to be reduced to fit {@link MAX_PIXELS}. */
  clamped: boolean;
}

/**
 * Work out the size to render at, honouring the requested scale but never
 * exceeding the pixel budget. Reported rather than silently applied, so the
 * panel can say why it did not do what was asked.
 */
export function scalePlan(width: number, height: number, requested: number): ScalePlan {
  const safe = Math.max(0.1, requested);
  const pixels = width * height * safe * safe;
  if (pixels <= MAX_PIXELS) {
    return {
      scale: safe,
      width: Math.max(1, Math.round(width * safe)),
      height: Math.max(1, Math.round(height * safe)),
      clamped: false,
    };
  }

  const scale = Math.sqrt(MAX_PIXELS / (width * height));
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    clamped: true,
  };
}

/**
 * The scale to suggest for an image of this size.
 *
 * Aimed at getting a page of text to roughly 1600–2200 pixels on its long edge,
 * which is about where Tesseract stops improving. Small screenshots get the
 * largest boost; anything already larger than the target is left alone, because
 * downscaling text is the one transformation that only ever loses.
 */
export function suggestScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (longest >= 1600) return 1;
  if (longest >= 1000) return 1.5;
  if (longest >= 600) return 2;
  return 3;
}

export interface TuneSettings {
  scale: number;
  grey: boolean;
  threshold: "off" | "auto" | number;
  invert: boolean;
  contrast: number;
  /** Quarter turns clockwise, 0–3. */
  rotate: 0 | 1 | 2 | 3;
}

export const DEFAULT_TUNE: TuneSettings = {
  scale: 1,
  grey: true,
  threshold: "auto",
  invert: false,
  contrast: 1,
  rotate: 0,
};

/**
 * Apply the pixel-level part of a tune, in the one order that makes sense.
 *
 * Order matters and is not arbitrary: contrast before greyscale would apply to
 * each channel separately and shift the hue; thresholding before inversion
 * would leave the invert to flip an already-binary image, which is fine, but
 * inverting *first* lets Otsu see the histogram the way the engine will. Scale
 * and rotation are not here — they need a canvas, and live in the panel.
 */
export function applyTune(source: Bitmap, settings: TuneSettings): Bitmap {
  let out = source;
  if (settings.invert) out = invert(out);
  if (settings.contrast !== 1) out = contrast(out, settings.contrast);
  if (settings.grey || settings.threshold !== "off") out = toGrey(out);
  if (settings.threshold !== "off") {
    const cut = settings.threshold === "auto" ? otsuThreshold(out) : settings.threshold;
    out = binarise(out, cut);
  }
  return out;
}
