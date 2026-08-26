"use client";

import { invert, project, type Homography, type Quad } from "./warp";

/**
 * The pixel half of scanning: warp the marked quad flat, then make it legible.
 *
 * All of it runs on a canvas on this device. A scan is very often of something you
 * would not upload — an ID, a payslip, a signed form — which is the entire reason
 * this app exists rather than being a link to a website with an upload box.
 */

export type ScanFilter = "colour" | "grey" | "document" | "ink";

export interface FilterDef {
  id: ScanFilter;
  label: string;
  hint: string;
}

export const SCAN_FILTERS: FilterDef[] = [
  { id: "colour", label: "Colour", hint: "Left as photographed — for anything with colour in it" },
  { id: "grey", label: "Grey", hint: "Neutral greyscale, smaller files" },
  {
    id: "document",
    label: "Document",
    hint: "Whitens the paper and deepens the text. The usual choice",
  },
  { id: "ink", label: "Ink", hint: "Pure black on white — for line art and signatures" },
];

/**
 * Warp a source image so the marked quad fills the output.
 *
 * Inverse mapping with bilinear sampling: for each *destination* pixel, find where
 * it came from in the source and interpolate. Forward-mapping the source instead
 * would leave unwritten gaps wherever the transform stretches, which is the classic
 * way this comes out speckled.
 */
export function applyWarp(
  source: CanvasImageSource & { width: number; height: number },
  quad: Quad,
  width: number,
  height: number,
  forward: Homography,
): HTMLCanvasElement | null {
  const back = invert(forward);
  if (!back) return null;

  // Read the source through its own canvas — `getImageData` needs pixels, not an
  // element.
  const readCanvas = document.createElement("canvas");
  readCanvas.width = source.width;
  readCanvas.height = source.height;
  const readCtx = readCanvas.getContext("2d", { willReadFrequently: true });
  if (!readCtx) return null;
  readCtx.drawImage(source, 0, 0);

  const src = readCtx.getImageData(0, 0, source.width, source.height);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;

  const dest = outCtx.createImageData(width, height);
  const sw = src.width;
  const sh = src.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sample at the pixel centre, not its corner — offsetting by half a pixel
      // is the difference between a sharp result and a slightly soft one.
      const p = project(back, x + 0.5, y + 0.5);
      const di = (y * width + x) * 4;

      if (p.x < 0 || p.y < 0 || p.x >= sw || p.y >= sh) {
        // Outside the photo: white, so a slightly over-wide quad reads as page
        // margin rather than as a black border.
        dest.data[di] = 255;
        dest.data[di + 1] = 255;
        dest.data[di + 2] = 255;
        dest.data[di + 3] = 255;
        continue;
      }

      const x0 = Math.floor(p.x);
      const y0 = Math.floor(p.y);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = p.x - x0;
      const fy = p.y - y0;

      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const top = src.data[i00 + c] * (1 - fx) + src.data[i10 + c] * fx;
        const bottom = src.data[i01 + c] * (1 - fx) + src.data[i11 + c] * fx;
        dest.data[di + c] = top * (1 - fy) + bottom * fy;
      }
      dest.data[di + 3] = 255;
    }
  }

  outCtx.putImageData(dest, 0, 0);
  return out;
}

/**
 * Apply a legibility filter in place.
 *
 * The `document` filter is the one that matters, and it is a *local* threshold
 * rather than a global one. A photograph of a page is never evenly lit — there is
 * always a gradient from the window or a shadow from the hand holding the phone —
 * and a single global threshold either greys out the bright side or blacks out the
 * dark side. Estimating the local background from a blurred copy of the image and
 * dividing by it removes the lighting before deciding what is ink.
 */
export function applyFilter(canvas: HTMLCanvasElement, filter: ScanFilter): void {
  if (filter === "colour") return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;

  // Luminance once; every filter below works from it.
  const grey = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grey[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  if (filter === "grey") {
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const v = grey[p];
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(image, 0, 0);
    return;
  }

  // Local background estimate: a box blur wide enough to contain any glyph, so
  // what survives is the lighting rather than the text.
  const radius = Math.max(8, Math.round(Math.min(width, height) / 40));
  const background = boxBlur(grey, width, height, radius);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const bg = Math.max(1, background[p]);
    // Ratio of pixel to its local background: ~1 is paper, well below 1 is ink.
    const ratio = grey[p] / bg;

    let v: number;
    if (filter === "ink") {
      // Hard two-tone, for line art and signatures.
      v = ratio < 0.86 ? 0 : 255;
    } else {
      // "document": keep the greys between paper and ink so anti-aliased text and
      // faint pencil survive, but push the ends to true white and true black.
      const stretched = (ratio - 0.6) / (0.98 - 0.6);
      v = Math.max(0, Math.min(1, stretched)) * 255;
    }

    data[i] = data[i + 1] = data[i + 2] = v;
  }

  ctx.putImageData(image, 0, 0);
}

/**
 * Separable box blur over a single channel.
 *
 * Two passes with a running sum, so the cost is independent of the radius — which
 * matters because the radius here is a fortieth of the image and a naive kernel
 * would be tens of thousands of samples per pixel.
 */
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const horizontal = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    // Prime the window, clamping at the edges rather than wrapping.
    for (let i = -radius; i <= radius; i++) sum += src[row + Math.min(width - 1, Math.max(0, i))];
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = sum / span;
      const outgoing = src[row + Math.min(width - 1, Math.max(0, x - radius))];
      const incoming = src[row + Math.min(width - 1, Math.max(0, x + radius + 1))];
      sum += incoming - outgoing;
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      sum += horizontal[Math.min(height - 1, Math.max(0, i)) * width + x];
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / span;
      const outgoing = horizontal[Math.min(height - 1, Math.max(0, y - radius)) * width + x];
      const incoming = horizontal[Math.min(height - 1, Math.max(0, y + radius + 1)) * width + x];
      sum += incoming - outgoing;
    }
  }

  return out;
}

/** Rotate a canvas by a quarter turn, returning a new one. */
export function rotateCanvas(canvas: HTMLCanvasElement, quarters: number): HTMLCanvasElement {
  const turns = ((quarters % 4) + 4) % 4;
  if (turns === 0) return canvas;

  const swap = turns % 2 === 1;
  const out = document.createElement("canvas");
  out.width = swap ? canvas.height : canvas.width;
  out.height = swap ? canvas.width : canvas.height;

  const ctx = out.getContext("2d");
  if (!ctx) return canvas;

  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}

/** Load a data URL or object URL into an image element. */
export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image could not be opened."));
    img.src = src;
  });

/**
 * Encode a canvas as JPEG.
 *
 * JPEG rather than PNG, at 0.82: a scan is a photograph of a page, and PNG's
 * lossless encoding of camera noise makes files several times larger with nothing
 * to show for it. The "ink" filter is the exception in principle — two-tone images
 * compress better losslessly — but the difference is not worth a second code path.
 */
export const canvasToJpeg = (canvas: HTMLCanvasElement, quality = 0.82): string =>
  canvas.toDataURL("image/jpeg", quality);
