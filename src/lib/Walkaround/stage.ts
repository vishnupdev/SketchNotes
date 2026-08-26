import type { Rect, StageAnchor, StageBlock, StageLayout } from "./types";

/**
 * The stage's geometry: where each part of a generic app screen sits, and how a
 * step's anchor resolves to a box on it.
 *
 * Everything is a percentage of the stage box, never a pixel, so the same
 * numbers place a tooltip correctly on a 320px phone and on a wide desktop
 * panel without measuring anything at runtime (rule #3, and rule #7's "no
 * layout-shifting async inserts" — the spotlight and the tooltip are positioned
 * from these constants on the first render, not after a measure pass).
 *
 * Pure and DOM-free, which is what lets `walkaround.test.ts` check every
 * authored anchor actually lands on the stage.
 */

/** The masthead: the app's icon-and-name block. */
const BRAND: Rect = { x: 5, y: 5, w: 46, h: 12 };

/** The Apps button, top right of every app's header. */
const APPS: Rect = { x: 69, y: 6, w: 26, h: 10 };

/** The working area, when the app has a bottom tab bar and when it hasn't. */
const BODY_WITH_TABS: Rect = { x: 5, y: 23, w: 90, h: 54 };
const BODY_FULL: Rect = { x: 5, y: 23, w: 90, h: 71 };

/** The floating bottom tab bar. */
const TABS: Rect = { x: 6, y: 82, w: 88, h: 12 };

/** Space between blocks, in stage percent. Small: these are hints, not a mock. */
const GAP = 2.5;

/** The working area of an app laid out like this one. */
export const bodyRect = (layout: StageLayout): Rect =>
  layout.tabs?.length ? BODY_WITH_TABS : BODY_FULL;

/** The header regions, for the stage to draw. */
export const brandRect = (): Rect => BRAND;
export const appsRect = (): Rect => APPS;

/** The tab bar's own box, or null for an app with no tab bar. */
export const tabsRect = (layout: StageLayout): Rect | null =>
  layout.tabs?.length ? TABS : null;

/**
 * Block indices grouped into rows. A full-width block is a row of its own; two
 * half-width blocks share one. Indices rather than the blocks themselves, so
 * the caller can map a rect back to the position the author wrote it in — which
 * is what `body:n` counts.
 */
function rowsOf(blocks: readonly StageBlock[]): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];

  blocks.forEach((block, i) => {
    if ((block.span ?? 2) === 2) {
      if (row.length) rows.push(row);
      row = [];
      rows.push([i]);
      return;
    }
    row.push(i);
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  });

  if (row.length) rows.push(row);
  return rows;
}

/**
 * Every block's box, indexed as authored — so `body:2` is the third block in
 * the list, wherever the row-packing above ended up putting it.
 *
 * Row heights are shared out by `grow`, which is how an app whose screen is
 * mostly one thing (a canvas, a chat log, a picture) looks like that on the
 * stage instead of like a stack of equal cards.
 */
export function blockRects(layout: StageLayout): Rect[] {
  const body = bodyRect(layout);
  const rows = rowsOf(layout.blocks);
  if (!rows.length) return [];

  const weights = rows.map((row) => Math.max(...row.map((i) => layout.blocks[i].grow ?? 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  const spare = body.h - GAP * (rows.length - 1);

  const out: Rect[] = [];
  let y = body.y;

  rows.forEach((row, r) => {
    const h = (spare * weights[r]) / total;
    const gapX = row.length > 1 ? GAP : 0;
    const w = (body.w - gapX * (row.length - 1)) / row.length;
    row.forEach((index, c) => {
      out[index] = { x: body.x + c * (w + gapX), y, w, h };
    });
    y += h + GAP;
  });

  return out;
}

/** One tab's box, left to right across the bar. */
export function tabRects(layout: StageLayout): Rect[] {
  const bar = tabsRect(layout);
  if (!bar || !layout.tabs) return [];
  const n = layout.tabs.length;
  const w = bar.w / n;
  return layout.tabs.map((_, i) => ({ x: bar.x + i * w, y: bar.y, w, h: bar.h }));
}

/** Trailing `:n` of an anchor, or null when it has none or it isn't a number. */
function indexOf(anchor: string, prefix: string): number | null {
  if (!anchor.startsWith(`${prefix}:`)) return null;
  const n = Number(anchor.slice(prefix.length + 1));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Where a step points, or null if the anchor names something this layout does
 * not have — a fourth tab on a three-tab app, say. Null rather than a fallback
 * box on purpose: a tooltip pointing confidently at the wrong place is worse
 * than one the test suite rejects before it ships.
 */
export function resolveAnchor(layout: StageLayout, anchor: StageAnchor): Rect | null {
  if (anchor === "brand") return BRAND;
  if (anchor === "apps") return APPS;
  if (anchor === "body") return bodyRect(layout);

  const block = indexOf(anchor, "body");
  if (block !== null) return blockRects(layout)[block] ?? null;

  const tab = indexOf(anchor, "tab");
  if (tab !== null) return tabRects(layout)[tab] ?? null;

  return null;
}

/** The middle of a box — where a step's pin sits. */
export const centreOf = (rect: Rect): { x: number; y: number } => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

/**
 * Roughly how much of the stage's height a tooltip takes, at its worst — the
 * narrowest phone, where the bubble is 88% of the width and the text wraps to
 * four or five lines. Used only to decide *where* the bubble goes, so an
 * over-estimate costs a slightly conservative placement and nothing else.
 */
const TIP_H = 26;

/**
 * Where a step's tooltip hangs, and off which edge.
 *
 * Three cases, in order of preference:
 *
 *  - **below** the target's bottom edge — the ordinary one;
 *  - **above** its top edge, once there is no room underneath. The bottom tab
 *    bar is the case that forces this: it is the last thing on every stage;
 *  - **below its top edge**, i.e. *inside* the target, when the target is too
 *    tall for either — a whole working area, an infinite canvas, a chat log.
 *    Putting the bubble inside a region that fills the stage is the only
 *    placement that keeps it on the stage at all.
 */
export function tipPlacement(rect: Rect): { side: "above" | "below"; edgeY: number } {
  if (rect.y + rect.h + TIP_H <= 100) return { side: "below", edgeY: rect.y + rect.h };
  if (rect.y - TIP_H >= 0) return { side: "above", edgeY: rect.y };
  return { side: "below", edgeY: rect.y };
}
