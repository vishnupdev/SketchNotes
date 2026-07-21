import type { ShapeElement } from "./types";
import { norm } from "./geometry";

/**
 * Parametric shape library. Each shape is a set of unit points in a 0..1 box
 * that gets mapped onto the drag rectangle at draw time. `rect`/`ellipse` are
 * handled specially by the renderer and are not part of this table.
 */
export interface ShapeDef {
  pts: [number, number][];
  closed?: boolean;
}

/** N-pointed star, `inner` is the inner radius as a fraction of 0.5. */
function starPts(n: number, inner: number): [number, number][] {
  const a: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : 0.5;
    const ang = -Math.PI / 2 + (i * Math.PI) / n;
    a.push([0.5 + r * Math.cos(ang), 0.5 + r * Math.sin(ang)]);
  }
  return a;
}

/** Regular n-gon inscribed in the unit box, starting at rotation `rot`. */
function regPts(n: number, rot: number): [number, number][] {
  const a: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ang = rot + (i * 2 * Math.PI) / n;
    a.push([0.5 + 0.5 * Math.cos(ang), 0.5 + 0.5 * Math.sin(ang)]);
  }
  return a;
}

export const SHAPES: Record<string, ShapeDef> = {
  triangle: { pts: [[0.5, 0], [1, 1], [0, 1]], closed: true },
  diamond: { pts: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], closed: true },
  pentagon: { pts: regPts(5, -Math.PI / 2), closed: true },
  hexagon: { pts: regPts(6, -Math.PI / 2), closed: true },
  star: { pts: starPts(5, 0.21), closed: true },
  star6: { pts: starPts(6, 0.28), closed: true },
  rtriangle: { pts: [[0, 0], [0, 1], [1, 1]], closed: true },
  trapezoid: { pts: [[0.22, 0], [0.78, 0], [1, 1], [0, 1]], closed: true },
  parallelogram: { pts: [[0.25, 0], [1, 0], [0.75, 1], [0, 1]], closed: true },
  chevron: {
    pts: [[0, 0], [0.55, 0], [1, 0.5], [0.55, 1], [0, 1], [0.45, 0.5]],
    closed: true,
  },
  arrowR: {
    pts: [[0, 0.3], [0.6, 0.3], [0.6, 0.05], [1, 0.5], [0.6, 0.95], [0.6, 0.7], [0, 0.7]],
    closed: true,
  },
  arrowL: {
    pts: [[1, 0.3], [0.4, 0.3], [0.4, 0.05], [0, 0.5], [0.4, 0.95], [0.4, 0.7], [1, 0.7]],
    closed: true,
  },
  arrowU: {
    pts: [[0.3, 1], [0.3, 0.4], [0.05, 0.4], [0.5, 0], [0.95, 0.4], [0.7, 0.4], [0.7, 1]],
    closed: true,
  },
  heart: {
    pts: (() => {
      const a: [number, number][] = [];
      for (let i = 0; i <= 28; i++) {
        const t = (Math.PI * 2 * i) / 28;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        a.push([0.5 + x / 34, 0.5 - y / 34]);
      }
      return a;
    })(),
    closed: true,
  },
  cloud: {
    pts: (() => {
      const bumps = [
        [0.2, 0.68, 0.2],
        [0.42, 0.5, 0.26],
        [0.68, 0.52, 0.24],
        [0.83, 0.7, 0.18],
      ];
      const a: [number, number][] = [];
      a.push([0.12, 0.85]);
      for (const [cx, cy, r] of bumps)
        for (let k = 0; k <= 8; k++) {
          const ang = Math.PI * (1 + -0.15 + (1.2 * k) / 8);
          a.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
        }
      a.push([0.9, 0.85]);
      return a;
    })(),
    closed: true,
  },
  speech: {
    pts: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.72], [0.4, 0.72], [0.2, 0.98], [0.24, 0.72], [0.05, 0.72]],
    closed: true,
  },
  cross: {
    pts: [
      [0.35, 0], [0.65, 0], [0.65, 0.35], [1, 0.35], [1, 0.65], [0.65, 0.65],
      [0.65, 1], [0.35, 1], [0.35, 0.65], [0, 0.65], [0, 0.35], [0.35, 0.35],
    ],
    closed: true,
  },
  plus: {
    pts: [
      [0.42, 0], [0.58, 0], [0.58, 0.42], [1, 0.42], [1, 0.58], [0.58, 0.58],
      [0.58, 1], [0.42, 1], [0.42, 0.58], [0, 0.58], [0, 0.42], [0.42, 0.42],
    ],
    closed: true,
  },
};

export const SHAPE_KEYS = Object.keys(SHAPES);

/** True if the given tool key names a parametric shape. */
export const isShape = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(SHAPES, key);

/** Order shapes appear in the picker (includes special rect/ellipse). */
export const SHAPE_ORDER = [
  "rect", "ellipse", "triangle", "rtriangle", "diamond", "pentagon", "hexagon",
  "trapezoid", "parallelogram", "chevron", "star", "star6", "heart", "cloud",
  "speech", "arrowR", "arrowL", "arrowU", "plus", "cross",
] as const;

export const SHAPE_LABEL: Record<string, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  rtriangle: "Right triangle",
  diamond: "Diamond",
  pentagon: "Pentagon",
  hexagon: "Hexagon",
  trapezoid: "Trapezoid",
  parallelogram: "Parallelogram",
  chevron: "Chevron",
  star: "Star",
  star6: "6-point star",
  heart: "Heart",
  cloud: "Cloud",
  speech: "Speech bubble",
  arrowR: "Arrow right",
  arrowL: "Arrow left",
  arrowU: "Arrow up",
  plus: "Plus",
  cross: "Cross",
};

/** Absolute (world-space) polygon points for a placed shape element. */
export function shapeAbs(el: ShapeElement): [number, number][] {
  const n = norm(el);
  const sp = SHAPES[el.shape];
  return sp.pts.map(([x, y]) => [
    n.x + x * Math.max(1, n.w),
    n.y + y * Math.max(1, n.h),
  ]);
}

/** Inner SVG markup (24x24 viewBox) previewing a shape in the picker. */
export function shapeIcon(key: string): string {
  if (key === "rect") return '<rect x="3" y="6" width="18" height="12" rx="2"/>';
  if (key === "ellipse") return '<ellipse cx="12" cy="12" rx="9" ry="7"/>';
  const sp = SHAPES[key];
  const P = sp.pts
    .map(([x, y]) => `${(3 + x * 18).toFixed(1)},${(3 + y * 18).toFixed(1)}`)
    .join(" ");
  return sp.closed !== false
    ? `<polygon points="${P}"/>`
    : `<polyline points="${P}"/>`;
}
