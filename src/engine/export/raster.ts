import type { SketchElement } from "../types";
import { themeBg } from "../constants";
import { drawEl } from "../render";

/**
 * Render the whole drawing to an offscreen canvas at an auto-chosen scale,
 * padded and filled with the theme background. Used as the source for
 * PNG/JPG/WebP/PDF/DOC exports.
 */
export function rasterCanvas(
  els: SketchElement[],
  b: { x: number; y: number },
  pad: number,
  wW: number,
  wH: number,
  dark: boolean,
): HTMLCanvasElement {
  const scl = Math.max(0.5, Math.min(2, 4096 / wW, 4096 / wH));
  const oc = document.createElement("canvas");
  oc.width = Math.ceil(wW * scl);
  oc.height = Math.ceil(wH * scl);
  const g = oc.getContext("2d")!;
  g.fillStyle = themeBg(dark);
  g.fillRect(0, 0, oc.width, oc.height);
  g.setTransform(scl, 0, 0, scl, (pad - b.x) * scl, (pad - b.y) * scl);
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const el of els) drawEl(g, el, dark);
  return oc;
}

/** Promise wrapper around `canvas.toBlob`. */
export function canvasBlob(
  oc: HTMLCanvasElement,
  mime: string,
  q: number,
): Promise<Blob> {
  return new Promise((res, rej) =>
    oc.toBlob((bl) => (bl ? res(bl) : rej(new Error("encode failed"))), mime, q),
  );
}
