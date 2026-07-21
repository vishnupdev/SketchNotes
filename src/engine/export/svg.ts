import type { SketchElement } from "../types";
import { FONT, mapColor, themeBg } from "../constants";
import { clamp, norm } from "../geometry";
import { shapeAbs, SHAPES } from "../shapes";

const r2 = (v: number): number => Math.round(v * 100) / 100;
const escX = (t: string): string =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** SVG markup for a single element (world coords, group handles translation). */
function svgOf(el: SketchElement, dark: boolean): string {
  const c = mapColor(el.color, dark);
  const w = el.w || 2;
  const st = `stroke="${c}" stroke-width="${w}"`;

  if (el.type === "pen") {
    const p = el.points;
    if (p.length < 2)
      return `<circle cx="${r2(p[0].x)}" cy="${r2(p[0].y)}" r="${r2(w / 1.6)}" fill="${c}"/>`;
    let d = `M${r2(p[0].x)} ${r2(p[0].y)}`;
    for (let i = 1; i < p.length - 1; i++)
      d += ` Q${r2(p[i].x)} ${r2(p[i].y)} ${r2((p[i].x + p[i + 1].x) / 2)} ${r2((p[i].y + p[i + 1].y) / 2)}`;
    d += ` L${r2(p[p.length - 1].x)} ${r2(p[p.length - 1].y)}`;
    return `<path d="${d}" ${st}/>`;
  }
  if (el.type === "line" || el.type === "arrow") {
    let d = `M${r2(el.x1)} ${r2(el.y1)} L${r2(el.x2)} ${r2(el.y2)}`;
    if (el.type === "arrow") {
      const a = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const L = clamp(w * 3 + 9, 12, 26);
      d += ` M${r2(el.x2)} ${r2(el.y2)} L${r2(el.x2 - L * Math.cos(a - 0.45))} ${r2(el.y2 - L * Math.sin(a - 0.45))}`;
      d += ` M${r2(el.x2)} ${r2(el.y2)} L${r2(el.x2 - L * Math.cos(a + 0.45))} ${r2(el.y2 - L * Math.sin(a + 0.45))}`;
    }
    return `<path d="${d}" ${st}/>`;
  }
  if (el.type === "rect") {
    const n = norm(el);
    const rr = Math.max(0, Math.min(10, n.w / 3, n.h / 3));
    return `<rect x="${r2(n.x)}" y="${r2(n.y)}" width="${r2(Math.max(1, n.w))}" height="${r2(Math.max(1, n.h))}" rx="${r2(rr)}" ${st}/>`;
  }
  if (el.type === "ellipse") {
    const n = norm(el);
    return `<ellipse cx="${r2(n.x + n.w / 2)}" cy="${r2(n.y + n.h / 2)}" rx="${r2(Math.max(1, n.w / 2))}" ry="${r2(Math.max(1, n.h / 2))}" ${st}/>`;
  }
  if (el.type === "shape") {
    const pts = shapeAbs(el);
    const sp = SHAPES[el.shape];
    let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += ` L${r2(pts[i][0])} ${r2(pts[i][1])}`;
    if (sp.closed !== false) d += " Z";
    return `<path d="${d}" ${st}/>`;
  }
  if (el.type === "emoji") {
    return `<text x="${r2(el.x)}" y="${r2(el.y)}" font-size="${el.size}" dominant-baseline="text-before-edge">${escX(el.ch)}</text>`;
  }
  if (el.type === "text") {
    return el.text
      .split("\n")
      .map(
        (ln, i) =>
          `<text x="${r2(el.x)}" y="${r2(el.y + i * el.size * 1.3)}" font-family="${FONT}" font-size="${el.size}" fill="${c}" dominant-baseline="text-before-edge">${escX(ln)}</text>`,
      )
      .join("");
  }
  return "";
}

/** Build a full standalone SVG document for the drawing. */
export function buildSVG(
  els: SketchElement[],
  b: { x: number; y: number; X: number; Y: number },
  pad: number,
  wW: number,
  wH: number,
  dark: boolean,
): string {
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(wW)}" height="${Math.ceil(wH)}" viewBox="0 0 ${Math.ceil(wW)} ${Math.ceil(wH)}">`,
    `<rect width="100%" height="100%" fill="${themeBg(dark)}"/>`,
    `<g transform="translate(${r2(pad - b.x)},${r2(pad - b.y)})" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
  ];
  for (const el of els) out.push(svgOf(el, dark));
  out.push("</g></svg>");
  return out.join("\n");
}
