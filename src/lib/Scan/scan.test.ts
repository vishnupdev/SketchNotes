import { describe, expect, it } from "vitest";
import {
  fullFrameQuad,
  homographyFor,
  invert,
  orderQuad,
  outputSize,
  project,
  quadIsUsable,
  type Quad,
} from "./warp";

/**
 * Scan geometry.
 *
 * This is the one part of the app that is pure maths and the one part that fails
 * invisibly: a homography that is subtly wrong produces a page that looks *almost*
 * straight, which nobody reads as a bug. The cases below pin the corners exactly,
 * and cover the two degeneracies that actually happen in use — a perfectly
 * axis-aligned quad (zero pivot) and a collapsed one (singular matrix).
 */

const near = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) < tolerance;

describe("homographyFor", () => {
  it("maps each marked corner exactly onto the output rectangle", () => {
    const quad: Quad = [
      { x: 120, y: 80 },
      { x: 900, y: 140 },
      { x: 860, y: 1180 },
      { x: 60, y: 1080 },
    ];
    const h = homographyFor(quad, 800, 1000);
    expect(h).not.toBeNull();
    if (!h) return;

    const corners = [
      [0, 0],
      [800, 0],
      [800, 1000],
      [0, 1000],
    ];
    quad.forEach((point, i) => {
      const out = project(h, point.x, point.y);
      expect(near(out.x, corners[i][0], 1e-4), `corner ${i} x`).toBe(true);
      expect(near(out.y, corners[i][1], 1e-4), `corner ${i} y`).toBe(true);
    });
  });

  it("handles an axis-aligned quad, where a naive solve hits a zero pivot", () => {
    // The common case: someone lines the page up square with the screen.
    const quad: Quad = [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 700 },
      { x: 100, y: 700 },
    ];
    const h = homographyFor(quad, 400, 600);
    expect(h).not.toBeNull();
    if (!h) return;
    const out = project(h, 300, 400); // the quad's centre
    expect(near(out.x, 200, 1e-6)).toBe(true);
    expect(near(out.y, 300, 1e-6)).toBe(true);
  });

  it("is an identity when the quad already is the output rectangle", () => {
    const h = homographyFor(fullFrameQuad(640, 480), 640, 480);
    expect(h).not.toBeNull();
    if (!h) return;
    const out = project(h, 123, 321);
    expect(near(out.x, 123, 1e-6)).toBe(true);
    expect(near(out.y, 321, 1e-6)).toBe(true);
  });

  it("returns null for a collapsed quad rather than NaN", () => {
    const collapsed: Quad = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ];
    expect(homographyFor(collapsed, 100, 100)).toBeNull();
  });
});

describe("invert", () => {
  it("round-trips a point through the forward and inverse matrices", () => {
    const quad: Quad = [
      { x: 40, y: 60 },
      { x: 700, y: 20 },
      { x: 760, y: 900 },
      { x: 10, y: 850 },
    ];
    const h = homographyFor(quad, 600, 800)!;
    const back = invert(h);
    expect(back).not.toBeNull();
    if (!back) return;

    // Destination centre → source → destination again.
    const source = project(back, 300, 400);
    const round = project(h, source.x, source.y);
    expect(near(round.x, 300, 1e-4)).toBe(true);
    expect(near(round.y, 400, 1e-4)).toBe(true);
  });

  it("returns null for a singular matrix", () => {
    expect(invert([1, 2, 3, 2, 4, 6, 3, 6, 9])).toBeNull();
  });
});

describe("outputSize", () => {
  it("sizes to the longest opposing edges, keeping the sharpest detail", () => {
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 600, y: 800 },
      { x: 0, y: 800 },
    ];
    // Top edge 400, bottom edge 600 → width 600. Sides are 800 and ~824.
    const size = outputSize(quad);
    expect(size.width).toBe(600);
    expect(size.height).toBeGreaterThanOrEqual(800);
  });

  it("caps the longest edge, keeping the aspect ratio", () => {
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 8000 },
      { x: 0, y: 8000 },
    ];
    const size = outputSize(quad, 2200);
    expect(size.height).toBe(2200);
    expect(size.width).toBe(1100);
  });

  it("never returns a zero dimension", () => {
    const size = outputSize([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 1 },
    ]);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe("orderQuad", () => {
  it("puts arbitrary corners into top-left, top-right, bottom-right, bottom-left", () => {
    const shuffled = [
      { x: 500, y: 700 }, // bottom-right
      { x: 100, y: 100 }, // top-left
      { x: 100, y: 700 }, // bottom-left
      { x: 500, y: 100 }, // top-right
    ];
    const ordered = orderQuad(shuffled);
    expect(ordered).not.toBeNull();
    if (!ordered) return;
    expect(ordered[0]).toEqual({ x: 100, y: 100 });
    expect(ordered[1]).toEqual({ x: 500, y: 100 });
    expect(ordered[2]).toEqual({ x: 500, y: 700 });
    expect(ordered[3]).toEqual({ x: 100, y: 700 });
  });

  it("refuses anything that is not four points", () => {
    expect(orderQuad([{ x: 1, y: 1 }])).toBeNull();
  });
});

describe("quadIsUsable", () => {
  it("accepts a real quad and rejects a collapsed one", () => {
    expect(quadIsUsable(fullFrameQuad(400, 400))).toBe(true);
    expect(
      quadIsUsable([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ]),
    ).toBe(false);
  });
});
