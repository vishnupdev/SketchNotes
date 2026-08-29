/**
 * Drawing the map: turning a centre, a zoom and a tile service into pixels.
 *
 * Kept out of the React component because none of it is React's business — it
 * is arithmetic and one canvas context, and it is far easier to reason about
 * (and to fix) when it is not tangled up with effects and refs.
 *
 * The one idea worth knowing before reading it: zoom is *fractional*. Tiles only
 * exist at whole levels, so a view at zoom 12.4 is drawn from level-12 tiles
 * scaled up by 2^0.4. That is what makes a pinch or a wheel feel continuous
 * instead of snapping between levels, and it is why almost every function here
 * takes both `zoom` (where the view is) and a derived `tileZ` (which tiles to
 * ask for).
 */

import { TILE_SIZE, latToTileY, lonToTileX, unproject, type LatLon } from "./mercator";
import type { TileSource } from "./layers";
import type { TileCache } from "./tile-cache";

export interface Viewport {
  /** CSS pixels. */
  width: number;
  height: number;
  center: LatLon;
  /** Fractional zoom. */
  zoom: number;
}

/** How many coarser levels to borrow from while a tile is still loading. */
const FALLBACK_DEPTH = 4;

/** The whole-number tile level a fractional zoom is drawn from. */
export const tileLevelFor = (zoom: number, maxZoom: number): number =>
  Math.max(0, Math.min(maxZoom, Math.round(zoom)));

/** Screen position of a latitude/longitude, in CSS pixels from the canvas's top left. */
export function latLonToScreen(view: Viewport, p: LatLon): { x: number; y: number } {
  const world = 2 ** view.zoom;
  let dx = lonToTileX(p.lon, view.zoom) - lonToTileX(view.center.lon, view.zoom);
  // Take the short way round: a point just east of the dateline is a few pixels
  // from a centre just west of it, not a world away.
  if (dx > world / 2) dx -= world;
  if (dx < -world / 2) dx += world;
  const dy = latToTileY(p.lat, view.zoom) - latToTileY(view.center.lat, view.zoom);
  return {
    x: view.width / 2 + dx * TILE_SIZE,
    y: view.height / 2 + dy * TILE_SIZE,
  };
}

/** The latitude/longitude under a point on the canvas. */
export function screenToLatLon(view: Viewport, x: number, y: number): LatLon {
  return unproject(
    {
      x: lonToTileX(view.center.lon, view.zoom) + (x - view.width / 2) / TILE_SIZE,
      y: latToTileY(view.center.lat, view.zoom) + (y - view.height / 2) / TILE_SIZE,
    },
    view.zoom,
  );
}

/**
 * Re-centre so that `anchor` — a point on the canvas — still shows the same
 * ground after a zoom change. Without this a wheel zoom drifts towards the
 * middle of the screen and you chase the thing you were looking at.
 */
export function zoomAround(
  view: Viewport,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
): LatLon {
  const held = screenToLatLon(view, anchorX, anchorY);
  // Put `held` at the centre of a view at the new zoom, then read off the point
  // whose offset from the middle is the *opposite* of the anchor's. That is the
  // centre which pushes `held` back out to where the pointer is.
  const after: Viewport = { ...view, zoom: nextZoom, center: held };
  return screenToLatLon(after, view.width - anchorX, view.height - anchorY);
}

/** Pan by a screen-pixel delta, returning the new centre. */
export function panBy(view: Viewport, dxPx: number, dyPx: number): LatLon {
  return screenToLatLon(view, view.width / 2 - dxPx, view.height / 2 - dyPx);
}

interface TilePlacement {
  /** Column, before wrapping — may be outside 0…n-1 when panned past an edge. */
  col: number;
  row: number;
  x: number;
  y: number;
  size: number;
}

/** Every tile position the viewport currently covers, at `tileZ`. */
function coverage(view: Viewport, tileZ: number): TilePlacement[] {
  const scale = 2 ** (view.zoom - tileZ);
  const size = TILE_SIZE * scale;
  const n = 2 ** tileZ;

  const originX = view.width / 2 - lonToTileX(view.center.lon, tileZ) * size;
  const originY = view.height / 2 - latToTileY(view.center.lat, tileZ) * size;

  const first = Math.floor(-originX / size);
  const last = Math.floor((view.width - originX) / size);
  const top = Math.max(0, Math.floor(-originY / size));
  const bottom = Math.min(n - 1, Math.floor((view.height - originY) / size));

  const out: TilePlacement[] = [];
  for (let row = top; row <= bottom; row++) {
    for (let col = first; col <= last; col++) {
      out.push({ col, row, x: originX + col * size, y: originY + row * size, size });
    }
  }
  return out;
}

/** Fold a column back into 0…n-1, so panning across the dateline repeats. */
const wrapCol = (col: number, n: number): number => ((col % n) + n) % n;

/**
 * Draw one tiled layer.
 *
 * A tile that has not arrived is not left blank: the same ground is drawn from
 * the nearest coarser level already in the cache, cropped to the quadrant this
 * tile occupies. That is why zooming looks like the image sharpening rather than
 * like the map disappearing and coming back.
 */
export function drawTileLayer(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  source: TileSource,
  cache: TileCache,
  alpha = 1,
): void {
  const tileZ = tileLevelFor(view.zoom, source.maxZoom);
  const n = 2 ** tileZ;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (const tile of coverage(view, tileZ)) {
    const col = wrapCol(tile.col, n);
    const image = cache.get(source.url(col, tile.row, tileZ));

    if (image) {
      // A hair of overlap: tiles land on fractional pixels, and a half-pixel gap
      // between them reads as a grid of seams across the whole map.
      ctx.drawImage(image, tile.x, tile.y, tile.size + 0.5, tile.size + 0.5);
      continue;
    }

    for (let up = 1; up <= FALLBACK_DEPTH && tileZ - up >= 0; up++) {
      const step = 2 ** up;
      const parentZ = tileZ - up;
      const parentCol = Math.floor(col / step);
      const parentRow = Math.floor(tile.row / step);
      const parent = cache.peek(source.url(parentCol, parentRow, parentZ));
      if (!parent) continue;

      const part = TILE_SIZE / step;
      ctx.drawImage(
        parent,
        (col % step) * part,
        (tile.row % step) * part,
        part,
        part,
        tile.x,
        tile.y,
        tile.size + 0.5,
        tile.size + 0.5,
      );
      break;
    }
  }

  ctx.restore();
}
