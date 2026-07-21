import type { SketchElement, View } from "./types";
import { fontStack, gridColor, mapColor } from "./constants";
import { clamp, norm } from "./geometry";
import { shapeAbs, SHAPES } from "./shapes";

/**
 * Draw a single element onto any 2d context. Used for both the live canvas and
 * offscreen raster export, so it never touches view state directly — the caller
 * sets the transform first.
 */
export function drawEl(
  g: CanvasRenderingContext2D,
  el: SketchElement,
  dark: boolean,
): void {
  const cc = mapColor(el.color, dark);
  g.strokeStyle = cc;
  g.fillStyle = cc;
  g.lineWidth = el.w || 2;

  if (el.type === "pen") {
    const p = el.points;
    if (p.length < 2) {
      g.beginPath();
      g.arc(p[0].x, p[0].y, (el.w || 2) / 1.6, 0, Math.PI * 2);
      g.fill();
      return;
    }
    g.beginPath();
    g.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i].x + p[i + 1].x) / 2;
      const my = (p[i].y + p[i + 1].y) / 2;
      g.quadraticCurveTo(p[i].x, p[i].y, mx, my);
    }
    g.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    g.stroke();
  } else if (el.type === "line" || el.type === "arrow") {
    g.beginPath();
    g.moveTo(el.x1, el.y1);
    g.lineTo(el.x2, el.y2);
    g.stroke();
    if (el.type === "arrow") {
      const a = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const L = clamp((el.w || 2) * 3 + 9, 12, 26);
      g.beginPath();
      g.moveTo(el.x2, el.y2);
      g.lineTo(el.x2 - L * Math.cos(a - 0.45), el.y2 - L * Math.sin(a - 0.45));
      g.moveTo(el.x2, el.y2);
      g.lineTo(el.x2 - L * Math.cos(a + 0.45), el.y2 - L * Math.sin(a + 0.45));
      g.stroke();
    }
  } else if (el.type === "rect") {
    const n = norm(el);
    const r = Math.max(0, Math.min(10, n.w / 3, n.h / 3));
    g.beginPath();
    if (g.roundRect) g.roundRect(n.x, n.y, Math.max(1, n.w), Math.max(1, n.h), r);
    else g.rect(n.x, n.y, Math.max(1, n.w), Math.max(1, n.h));
    g.stroke();
  } else if (el.type === "ellipse") {
    const n = norm(el);
    g.beginPath();
    g.ellipse(n.x + n.w / 2, n.y + n.h / 2, Math.max(1, n.w / 2), Math.max(1, n.h / 2), 0, 0, Math.PI * 2);
    g.stroke();
  } else if (el.type === "shape") {
    const pts = shapeAbs(el);
    const sp = SHAPES[el.shape];
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (sp.closed !== false) g.closePath();
    g.stroke();
  } else if (el.type === "emoji") {
    g.font = `${el.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.textBaseline = "top";
    g.textAlign = "left";
    g.fillText(el.ch, el.x, el.y);
  } else if (el.type === "text") {
    g.font = `${el.size}px ${fontStack(el.font)}`;
    g.textBaseline = "top";
    el.text
      .split("\n")
      .forEach((ln, i) => g.fillText(ln, el.x, el.y + i * el.size * 1.3));
  }
}

/** Paint the dotted background grid for the current view. */
export function drawGrid(
  bctx: CanvasRenderingContext2D,
  view: View,
  W: number,
  H: number,
  dpr: number,
  dark: boolean,
): void {
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.clearRect(0, 0, W, H);
  let sp = 26;
  while (sp * view.s < 18) sp *= 2;
  while (sp * view.s > 72) sp /= 2;
  const step = sp * view.s;
  const ox = ((view.x % step) + step) % step;
  const oy = ((view.y % step) + step) % step;
  bctx.fillStyle = gridColor(dark);
  for (let x = ox; x < W; x += step)
    for (let y = oy; y < H; y += step) bctx.fillRect(x - 1, y - 1, 2, 2);
}
