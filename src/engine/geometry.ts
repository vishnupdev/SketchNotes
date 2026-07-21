import type { Bounds, CornerElement, Point, SketchElement } from "./types";
import { fontStack } from "./constants";

/** Clamp a value into [a, b]. */
export const clamp = (v: number, a: number, b: number): number =>
  Math.max(a, Math.min(b, v));

/** Normalise a two-corner element into an origin+size box. */
export const norm = (el: CornerElement): Bounds => ({
  x: Math.min(el.x1, el.x2),
  y: Math.min(el.y1, el.y2),
  w: Math.abs(el.x2 - el.x1),
  h: Math.abs(el.y2 - el.y1),
});

/** Distance from point `p` to segment `a`→`b`. */
export function dSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Even-odd point-in-polygon test. */
export function pointInPoly(p: Point, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0];
    const yi = pts[i][1];
    const xj = pts[j][0];
    const yj = pts[j][1];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/**
 * Offscreen 2d context used purely for text measurement, so bbox math works
 * without touching a visible canvas. Guarded for SSR.
 */
let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}

/** Axis-aligned world-space bounding box of a single element. */
export function bboxOf(
  el: SketchElement,
  shapeAbs: (el: Extract<SketchElement, { type: "shape" }>) => [number, number][],
): Bounds {
  if (el.type === "pen") {
    let x1 = 1e9;
    let y1 = 1e9;
    let x2 = -1e9;
    let y2 = -1e9;
    for (const p of el.points) {
      x1 = Math.min(x1, p.x);
      y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x);
      y2 = Math.max(y2, p.y);
    }
    const pd = (el.w || 2) / 2 + 2;
    return { x: x1 - pd, y: y1 - pd, w: x2 - x1 + pd * 2, h: y2 - y1 + pd * 2 };
  }
  if (el.type === "text") {
    const ctx = getMeasureCtx();
    const lines = el.text.split("\n");
    let w = 0;
    if (ctx) {
      ctx.font = `${el.size}px ${fontStack(el.font)}`;
      for (const ln of lines) w = Math.max(w, ctx.measureText(ln).width);
    } else {
      for (const ln of lines) w = Math.max(w, ln.length * el.size * 0.5);
    }
    return { x: el.x - 2, y: el.y - 2, w: w + 4, h: lines.length * el.size * 1.3 + 4 };
  }
  if (el.type === "emoji") {
    return { x: el.x - 2, y: el.y - 2, w: el.size + 4, h: el.size + 4 };
  }
  const n = norm(el);
  const pd = (el.w || 2) / 2 + 2;
  return { x: n.x - pd, y: n.y - pd, w: n.w + pd * 2, h: n.h + pd * 2 };
}

/** True if the world point `p` is within `tol` of the element's geometry. */
export function hitEl(
  el: SketchElement,
  p: Point,
  tol: number,
  shapeAbs: (el: Extract<SketchElement, { type: "shape" }>) => [number, number][],
): boolean {
  const w2 = (el.w || 2) / 2 + tol;
  if (el.type === "pen") {
    const pts = el.points;
    if (pts.length === 1)
      return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) < w2 + 2;
    for (let i = 0; i < pts.length - 1; i++)
      if (dSeg(p, pts[i], pts[i + 1]) < w2) return true;
    return false;
  }
  if (el.type === "line" || el.type === "arrow")
    return dSeg(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < w2;
  if (el.type === "rect") {
    const n = norm(el);
    const o = w2;
    const inO =
      p.x >= n.x - o && p.x <= n.x + n.w + o && p.y >= n.y - o && p.y <= n.y + n.h + o;
    const inI =
      p.x > n.x + o && p.x < n.x + n.w - o && p.y > n.y + o && p.y < n.y + n.h - o;
    return inO && !inI;
  }
  if (el.type === "ellipse") {
    const n = norm(el);
    const rx = Math.max(1, n.w / 2);
    const ry = Math.max(1, n.h / 2);
    const dx = (p.x - (n.x + rx)) / rx;
    const dy = (p.y - (n.y + ry)) / ry;
    return Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) < w2;
  }
  if (el.type === "shape") {
    const pts = shapeAbs(el);
    const closed = true; // all bundled shapes are closed
    const lim = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < lim; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (dSeg(p, { x: a[0], y: a[1] }, { x: b[0], y: b[1] }) < w2) return true;
    }
    // Also allow grabbing by the filled interior for easier selection.
    return pointInPoly(p, pts);
  }
  if (el.type === "text" || el.type === "emoji") {
    const b = bboxOf(el, shapeAbs);
    return (
      p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol
    );
  }
  return false;
}

/** Translate an element in-place by (dx, dy) in world space. */
export function offsetEl(el: SketchElement, dx: number, dy: number): void {
  if (el.type === "pen") {
    for (const p of el.points) {
      p.x += dx;
      p.y += dy;
    }
  } else if (el.type === "text" || el.type === "emoji") {
    el.x += dx;
    el.y += dy;
  } else {
    el.x1 += dx;
    el.y1 += dy;
    el.x2 += dx;
    el.y2 += dy;
  }
}

/** Combined world-space bounds of every element, or null when empty. */
export function contentBBox(
  els: SketchElement[],
  shapeAbs: (el: Extract<SketchElement, { type: "shape" }>) => [number, number][],
): { x: number; y: number; X: number; Y: number } | null {
  let b: { x: number; y: number; X: number; Y: number } | null = null;
  for (const el of els) {
    const c = bboxOf(el, shapeAbs);
    b = b
      ? {
          x: Math.min(b.x, c.x),
          y: Math.min(b.y, c.y),
          X: Math.max(b.X, c.x + c.w),
          Y: Math.max(b.Y, c.y + c.h),
        }
      : { x: c.x, y: c.y, X: c.x + c.w, Y: c.y + c.h };
  }
  return b;
}
