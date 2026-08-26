import { describe, expect, it } from "vitest";
import { TOURS } from "./tours";
import { blockRects, resolveAnchor, tabRects, tipPlacement } from "./stage";
import type { Tour } from "./types";

/**
 * Walkaround.
 *
 * The failure this suite exists for is a tooltip that points at nothing. A step
 * anchored to `tab:3` on a three-tab app, or `body:5` on a four-block layout,
 * renders as a pin somewhere plausible and a confident sentence about a control
 * that isn't there — and nothing throws. So every authored anchor is resolved
 * here, and every resolved box is checked to be inside the stage.
 *
 * The rest is the small layout engine: rows have to fill the body exactly, or
 * the blocks drift off the bottom as an app gains regions.
 */

const tours = Object.entries(TOURS) as [string, Tour][];

describe("every tour", () => {
  it("covers every app in the workspace", () => {
    // `Record<AppId, Tour>` makes a missing app a type error; this catches the
    // other direction — an id left behind after an app was renamed.
    expect(tours.length).toBeGreaterThan(20);
  });

  it.each(tours)("%s has steps that all point somewhere", (_id, tour) => {
    expect(tour.steps.length).toBeGreaterThanOrEqual(3);
    for (const step of tour.steps) {
      const rect = resolveAnchor(tour.layout, step.at);
      expect(rect, `${step.at} → "${step.title}"`).not.toBeNull();
    }
  });

  it.each(tours)("%s keeps every box inside the stage", (_id, tour) => {
    for (const step of tour.steps) {
      const r = resolveAnchor(tour.layout, step.at)!;
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(100);
      expect(r.y + r.h).toBeLessThanOrEqual(100);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    }
  });

  it.each(tours)("%s writes copy that reads as copy", (_id, tour) => {
    for (const step of tour.steps) {
      expect(step.title.length, step.title).toBeLessThanOrEqual(34);
      // A direction that doesn't end in a full stop is usually a truncation.
      expect(step.direction.trim().endsWith(".") || step.direction.trim().endsWith("”")).toBe(true);
      expect(step.suggestion.length).toBeGreaterThan(20);
    }
  });

  it.each(tours)("%s labels every block and tab it draws", (_id, tour) => {
    for (const block of tour.layout.blocks) expect(block.label.trim()).not.toBe("");
    for (const tab of tour.layout.tabs ?? []) expect(tab.trim()).not.toBe("");
  });
});

describe("blockRects", () => {
  it("fills the body exactly, whatever the row mix", () => {
    const layout = {
      blocks: [
        { label: "a", grow: 2 },
        { label: "b", span: 1 as const },
        { label: "c", span: 1 as const },
        { label: "d" },
      ],
    };
    const rects = blockRects(layout);
    expect(rects).toHaveLength(4);

    // b and c share a row: same y and height, side by side.
    expect(rects[1].y).toBeCloseTo(rects[2].y);
    expect(rects[1].h).toBeCloseTo(rects[2].h);
    expect(rects[1].x).toBeLessThan(rects[2].x);

    // The last row ends where the body does.
    const bottom = Math.max(...rects.map((r) => r.y + r.h));
    expect(bottom).toBeCloseTo(23 + 71, 4);
  });

  it("gives a tabbed app a shorter body, so the bar has room", () => {
    const blocks = [{ label: "only" }];
    const plain = blockRects({ blocks })[0];
    const tabbed = blockRects({ blocks, tabs: ["one", "two"] })[0];
    expect(tabbed.h).toBeLessThan(plain.h);
  });

  it("shares height out by grow", () => {
    const [big, small] = blockRects({ blocks: [{ label: "a", grow: 3 }, { label: "b", grow: 1 }] });
    expect(big.h / small.h).toBeCloseTo(3, 1);
  });
});

describe("tabRects", () => {
  it("slices the bar evenly and has none for a tabless app", () => {
    const rects = tabRects({ blocks: [], tabs: ["a", "b", "c", "d"] });
    expect(rects).toHaveLength(4);
    expect(rects[1].x - rects[0].x).toBeCloseTo(rects[3].x - rects[2].x);
    expect(tabRects({ blocks: [] })).toHaveLength(0);
  });
});

describe("resolveAnchor", () => {
  const layout = { blocks: [{ label: "a" }, { label: "b" }], tabs: ["one", "two"] };

  it("refuses an anchor the layout hasn't got", () => {
    expect(resolveAnchor(layout, "body:2")).toBeNull();
    expect(resolveAnchor(layout, "tab:2")).toBeNull();
    expect(resolveAnchor({ blocks: [{ label: "a" }] }, "tab:0")).toBeNull();
  });

  it("resolves the header regions without a layout", () => {
    expect(resolveAnchor({ blocks: [] }, "brand")).not.toBeNull();
    expect(resolveAnchor({ blocks: [] }, "apps")).not.toBeNull();
  });
});

describe("tipPlacement", () => {
  it("hangs below an ordinary target", () => {
    expect(tipPlacement({ x: 5, y: 25, w: 90, h: 20 })).toEqual({ side: "below", edgeY: 45 });
  });

  it("flips above the bottom tab bar", () => {
    // The bar is the last thing on every stage, so there is never room under it.
    expect(tipPlacement({ x: 6, y: 82, w: 88, h: 12 })).toEqual({ side: "above", edgeY: 82 });
  });

  it("goes inside a target too tall for either side", () => {
    // A whole working area leaves no room above or below; inside its top edge is
    // the only placement that keeps the bubble on the stage.
    expect(tipPlacement({ x: 5, y: 23, w: 90, h: 71 })).toEqual({ side: "below", edgeY: 23 });
  });

  it("keeps every authored tooltip on the stage", () => {
    for (const [, tour] of tours) {
      for (const step of tour.steps) {
        const rect = resolveAnchor(tour.layout, step.at)!;
        const { side, edgeY } = tipPlacement(rect);
        // 26 is the bubble's worst-case share of the stage height (see stage.ts).
        const top = side === "below" ? edgeY : edgeY - 26;
        expect(top, `${step.at} → "${step.title}"`).toBeGreaterThanOrEqual(0);
        expect(top + 26, `${step.at} → "${step.title}"`).toBeLessThanOrEqual(100);
      }
    }
  });
});
