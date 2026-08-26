/**
 * Perspective correction — the step that turns a photograph of a page into a scan.
 *
 * A page photographed at an angle is a *projective* transform of the rectangle it
 * really is, not a rotation or a stretch: opposite edges converge. Undoing that
 * needs a homography — the 3×3 matrix mapping the four corners you mark back onto
 * the four corners of a rectangle — which is why cropping alone never looks right.
 *
 * Eight unknowns (the ninth is fixed by scale), four point correspondences giving
 * two equations each, so an 8×8 solve. Small enough to do exactly with Gaussian
 * elimination and no linear-algebra dependency.
 *
 * Pure maths, no DOM: `applyWarp` in `enhance.ts` does the pixel work.
 */

export interface Point {
  x: number;
  y: number;
}

/** Four corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

/** Row-major 3×3, with `h[8]` normalised to 1. */
export type Homography = number[];

/**
 * Solve `A · x = b` by Gauss-Jordan elimination with partial pivoting.
 *
 * Partial pivoting is not optional here. Mark a quad with one perfectly
 * horizontal edge and the naive elimination hits a zero pivot and returns NaN —
 * which is the common case, not a pathological one, because people line the top
 * edge of a page up with the top of the screen.
 */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Work on an augmented copy so the caller's arrays are untouched.
  const m = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null; // singular: degenerate quad
    [m[col], m[pivot]] = [m[pivot], m[col]];

    const d = m[col][col];
    for (let j = col; j <= n; j++) m[col][j] /= d;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j++) m[row][j] -= factor * m[col][j];
    }
  }

  return m.map((row) => row[n]);
}

/**
 * The homography mapping `src` (the marked quad, in source pixels) onto the
 * rectangle `width × height`.
 *
 * Returns the matrix for the **forward** direction, source → destination.
 */
export function homographyFor(src: Quad, width: number, height: number): Homography | null {
  const dst: Quad = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    // u = (h0x + h1y + h2) / (h6x + h7y + 1)  →  linear in the unknowns
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

/** Invert a 3×3, for mapping each destination pixel back into the source. */
export function invert(h: Homography): Homography | null {
  const [a, b, c, d, e, f, g, i, j] = h;

  const A = e * j - f * i;
  const B = f * g - d * j;
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  return [
    A / det,
    (c * i - b * j) / det,
    (b * f - c * e) / det,
    B / det,
    (a * j - c * g) / det,
    (c * d - a * f) / det,
    C / det,
    (b * g - a * i) / det,
    (a * e - b * d) / det,
  ];
}

/** Map one point through a homography. */
export function project(h: Homography, x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8];
  // A point on the horizon maps to infinity; clamping the denominator keeps the
  // sampler in bounds instead of producing NaN coordinates.
  const safe = Math.abs(w) < 1e-12 ? 1e-12 : w;
  return {
    x: (h[0] * x + h[1] * y + h[2]) / safe,
    y: (h[3] * x + h[4] * y + h[5]) / safe,
  };
}

/**
 * A sensible output size for a marked quad.
 *
 * Uses the longest opposing edges rather than an average: the near edge of a
 * tilted page is the one photographed at the highest resolution, so sizing to it
 * keeps every pixel the camera actually captured. Capped so a huge capture cannot
 * produce a warp that takes seconds.
 */
export function outputSize(quad: Quad, maxEdge = 2200): { width: number; height: number } {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  const top = dist(quad[0], quad[1]);
  const bottom = dist(quad[3], quad[2]);
  const left = dist(quad[0], quad[3]);
  const right = dist(quad[1], quad[2]);

  let width = Math.max(top, bottom);
  let height = Math.max(left, right);

  const longest = Math.max(width, height);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    width *= scale;
    height *= scale;
  }

  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

/** The whole frame, as the starting quad before anyone drags a corner. */
export const fullFrameQuad = (width: number, height: number): Quad => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

/**
 * Order four arbitrary points into the top-left/top-right/bottom-right/bottom-left
 * sequence the rest of this module assumes.
 *
 * By centroid angle, which is robust to any starting order and to a rotated page —
 * sorting by y then x (the obvious approach) mislabels the corners as soon as the
 * page is tilted more than a little.
 */
export function orderQuad(points: Point[]): Quad | null {
  if (points.length !== 4) return null;

  const cx = points.reduce((n, p) => n + p.x, 0) / 4;
  const cy = points.reduce((n, p) => n + p.y, 0) / 4;

  const sorted = points
    .map((p) => ({ p, angle: Math.atan2(p.y - cy, p.x - cx) }))
    // Screen coordinates grow downward, so increasing angle runs clockwise from
    // the negative x axis — which starts at the top-left and goes the right way.
    .sort((a, b) => a.angle - b.angle)
    .map((entry) => entry.p);

  // Rotate so the point nearest the origin leads.
  let start = 0;
  let best = Infinity;
  sorted.forEach((p, i) => {
    const d = p.x * p.x + p.y * p.y;
    if (d < best) {
      best = d;
      start = i;
    }
  });

  return [
    sorted[start % 4],
    sorted[(start + 1) % 4],
    sorted[(start + 2) % 4],
    sorted[(start + 3) % 4],
  ];
}

/** Whether a quad is non-degenerate enough to warp. */
export function quadIsUsable(quad: Quad, minArea = 400): boolean {
  // Shoelace area. A self-intersecting quad (dragged corners crossed over) comes
  // out small or negative, which is exactly what should be rejected.
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2) >= minArea;
}
