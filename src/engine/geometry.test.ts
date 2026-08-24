import { describe, expect, it } from "vitest";
import { bboxOf, clamp, contentBBox, dSeg, hitEl, norm, offsetEl, pointInPoly } from "./geometry";
import type { BoxElement, LineElement, PenElement, SketchElement } from "./types";

/**
 * Canvas geometry.
 *
 * The engine's hit-testing is felt rather than seen: when it drifts, selecting
 * a thin line or an emoji simply stops working reliably, and nobody can say
 * exactly what changed. It is also the one part of the engine that is pure maths
 * with no canvas involved, so it can be pinned down exactly — which makes it the
 * highest-value thing to test in the whole drawing app.
 *
 * `bboxOf` for text is deliberately not tested for exact width: it measures with
 * a canvas context when there is one and falls back to an estimate when there
 * isn't, and in Node there isn't. The tests here stay on the paths that are pure.
 */

const line = (over: Partial<LineElement> = {}): LineElement => ({
  type: "line",
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 0,
  color: "auto",
  w: 2,
  ...over,
});

const rect = (over: Partial<BoxElement> = {}): BoxElement => ({
  type: "rect",
  x1: 10,
  y1: 10,
  x2: 50,
  y2: 30,
  color: "auto",
  w: 2,
  ...over,
});

const pen = (points: Array<[number, number]>): PenElement => ({
  type: "pen",
  points: points.map(([x, y]) => ({ x, y })),
  color: "auto",
  w: 4,
});

/** Shapes are hit-tested through a caller-supplied outline; a square will do. */
const shapeAbs = () =>
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ] as [number, number][];

describe("clamp", () => {
  it("keeps a value inside its bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("norm", () => {
  it("normalises a box dragged in any direction", () => {
    const dragged = rect({ x1: 50, y1: 30, x2: 10, y2: 10 });
    expect(norm(dragged)).toEqual({ x: 10, y: 10, w: 40, h: 20 });
  });
});

describe("dSeg", () => {
  it("measures the distance to a segment, not to its infinite line", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(dSeg({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
    // Past the end, the nearest point is the endpoint itself.
    expect(dSeg({ x: 20, y: 0 }, a, b)).toBeCloseTo(10);
    // A degenerate segment is a point.
    expect(dSeg({ x: 3, y: 4 }, a, a)).toBeCloseTo(5);
  });
});

describe("pointInPoly", () => {
  const square: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it("tells inside from outside", () => {
    expect(pointInPoly({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPoly({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPoly({ x: -1, y: -1 }, square)).toBe(false);
  });
});

describe("bboxOf", () => {
  it("wraps a stroke with room for its own width", () => {
    const box = bboxOf(pen([
      [10, 10],
      [30, 20],
    ]));
    // Half the stroke width plus a couple of units of slack on every side.
    expect(box.x).toBeLessThan(10);
    expect(box.y).toBeLessThan(10);
    expect(box.x + box.w).toBeGreaterThan(30);
    expect(box.y + box.h).toBeGreaterThan(20);
  });

  it("covers a box element whichever way it was dragged", () => {
    const forward = bboxOf(rect());
    const backward = bboxOf(rect({ x1: 50, y1: 30, x2: 10, y2: 10 }));
    expect(backward).toEqual(forward);
  });
});

describe("hitEl", () => {
  it("hits a line only near the line", () => {
    expect(hitEl(line(), { x: 50, y: 0 }, 4, shapeAbs)).toBe(true);
    expect(hitEl(line(), { x: 50, y: 3 }, 4, shapeAbs)).toBe(true);
    expect(hitEl(line(), { x: 50, y: 40 }, 4, shapeAbs)).toBe(false);
    // Beyond the end of the segment, not just off its infinite line.
    expect(hitEl(line(), { x: 200, y: 0 }, 4, shapeAbs)).toBe(false);
  });

  it("hits a rectangle's edge but not its empty middle", () => {
    // Rectangles are outlines, so the inside is not a hit — which is what lets
    // you select something drawn inside one.
    expect(hitEl(rect(), { x: 10, y: 20 }, 3, shapeAbs)).toBe(true);
    expect(hitEl(rect(), { x: 30, y: 20 }, 3, shapeAbs)).toBe(false);
  });

  it("respects the tolerance it is given", () => {
    const near = { x: 50, y: 6 };
    expect(hitEl(line(), near, 2, shapeAbs)).toBe(false);
    expect(hitEl(line(), near, 10, shapeAbs)).toBe(true);
  });
});

describe("offsetEl", () => {
  it("moves every kind of element by the same delta", () => {
    const moved = rect();
    offsetEl(moved, 5, -5);
    expect([moved.x1, moved.y1, moved.x2, moved.y2]).toEqual([15, 5, 55, 25]);

    const stroke = pen([
      [0, 0],
      [10, 10],
    ]);
    offsetEl(stroke, 2, 3);
    expect(stroke.points).toEqual([
      { x: 2, y: 3 },
      { x: 12, y: 13 },
    ]);
  });
});

describe("contentBBox", () => {
  it("spans every element, and reports nothing for an empty drawing", () => {
    const els: SketchElement[] = [rect(), rect({ x1: 100, y1: 100, x2: 140, y2: 120 })];
    // Corners, not width/height — this one feeds the exporters, which crop to
    // the far edge of the content.
    const box = contentBBox(els, shapeAbs);
    expect(box).not.toBeNull();
    expect(box!.x).toBeLessThanOrEqual(10);
    expect(box!.X).toBeGreaterThanOrEqual(140);
    expect(box!.Y).toBeGreaterThanOrEqual(120);
    expect(contentBBox([], shapeAbs)).toBeNull();
  });
});
