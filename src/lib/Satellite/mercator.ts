/**
 * Web Mercator, the projection every tiled map on the web is drawn in.
 *
 * The whole map is one square. At zoom z it is 2^z tiles on a side, so a
 * position is really a *fractional tile coordinate*: tile 3.5, 1.25 at zoom 4 is
 * the middle-left of the fourth tile across, a quarter down the second tile
 * down. Working in that unit rather than in pixels is what lets the renderer
 * pick a tile, place it, and convert a pointer position back to a latitude with
 * the same three functions.
 *
 * Nothing here touches the DOM or the network — which is why it is the one part
 * of this app that can be tested outright.
 */

/** One tile is 256 CSS pixels wide at its own zoom level. */
export const TILE_SIZE = 256;

/**
 * The latitude where Mercator gives up. The projection stretches towards the
 * poles without bound, so the square is cut here — this exact value is what
 * makes the world come out square, and every web map uses it.
 */
export const MAX_LAT = 85.05112878;

/** Earth's circumference at the equator, in metres — for the scale bar. */
const EQUATOR_M = 40075016.686;

export interface LatLon {
  lat: number;
  lon: number;
}

/** A point in fractional tile units at a given zoom. */
export interface TilePoint {
  x: number;
  y: number;
}

export const clampLat = (lat: number): number => Math.min(MAX_LAT, Math.max(-MAX_LAT, lat));

/** Fold any longitude back into −180…180, so panning past the dateline works. */
export const wrapLon = (lon: number): number => (((lon + 180) % 360) + 360) % 360 - 180;

export const lonToTileX = (lon: number, zoom: number): number =>
  ((wrapLon(lon) + 180) / 360) * 2 ** zoom;

export const latToTileY = (lat: number, zoom: number): number => {
  const rad = (clampLat(lat) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

export const tileXToLon = (x: number, zoom: number): number => (x / 2 ** zoom) * 360 - 180;

export const tileYToLat = (y: number, zoom: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const project = (p: LatLon, zoom: number): TilePoint => ({
  x: lonToTileX(p.lon, zoom),
  y: latToTileY(p.lat, zoom),
});

export const unproject = (p: TilePoint, zoom: number): LatLon => ({
  lat: tileYToLat(p.y, zoom),
  lon: wrapLon(tileXToLon(p.x, zoom)),
});

/**
 * Ground distance one screen pixel covers, in metres. Mercator's scale depends
 * on latitude — a pixel near the poles covers far less ground than one at the
 * equator — which is the whole reason the scale bar has to be redrawn as the
 * map is panned north or south, not only as it is zoomed.
 */
export const metresPerPixel = (lat: number, zoom: number): number =>
  (EQUATOR_M * Math.cos((clampLat(lat) * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom);

/** Great-circle distance between two positions, in metres. */
export function distanceM(a: LatLon, b: LatLon): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** A latitude/longitude as signed decimals — the form you paste into things. */
export const formatDecimal = (p: LatLon, digits = 5): string =>
  `${p.lat.toFixed(digits)}, ${wrapLon(p.lon).toFixed(digits)}`;

const dms = (value: number, positive: string, negative: string): string => {
  const hemisphere = value < 0 ? negative : positive;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = (minFull - min) * 60;
  return `${deg}° ${String(min).padStart(2, "0")}′ ${sec.toFixed(1)}″ ${hemisphere}`;
};

/** The same position in degrees/minutes/seconds, as a map or a GPS says it. */
export const formatDms = (p: LatLon): string =>
  `${dms(p.lat, "N", "S")}  ${dms(wrapLon(p.lon), "E", "W")}`;

/**
 * Read a pair of coordinates out of typed text, so the search box accepts
 * "12.9716, 77.5946" (or a URL fragment full of them) without a round trip to a
 * geocoder that would only hand the same numbers back.
 */
export function parseLatLon(text: string): LatLon | null {
  const m = text
    .trim()
    .match(/^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** A distance in metres, written the way a person would say it. */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres)) return "—";
  if (metres < 1000) return `${Math.round(metres)} m`;
  if (metres < 100000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres / 1000).toLocaleString()} km`;
}

/**
 * The scale bar: a round number of metres, and how wide that is on screen.
 * Picked from the 1/2/5 sequence so the bar always reads as a whole quantity
 * ("500 m", "2 km") rather than whatever 100 pixels happens to work out to.
 */
export function scaleBar(lat: number, zoom: number, maxPx = 110): { label: string; px: number } {
  const mPerPx = metresPerPixel(lat, zoom);
  const maxM = mPerPx * maxPx;
  const pow = 10 ** Math.floor(Math.log10(maxM));
  const nice = [1, 2, 5, 10].filter((n) => n * pow <= maxM).pop() ?? 1;
  const metres = nice * pow;
  return { label: formatDistance(metres), px: Math.round(metres / mPerPx) };
}
