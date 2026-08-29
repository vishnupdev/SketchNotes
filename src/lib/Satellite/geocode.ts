/**
 * Turning a typed place into a position, and a position back into a place name.
 *
 * Nominatim is OpenStreetMap's own geocoder: open, keyless, and bound by a usage
 * policy of roughly one request a second. That policy is the reason this module
 * exposes only *deliberate* lookups — a search you submitted, a pin you dropped
 * — and there is no search-as-you-type anywhere in the app. Typing ahead would
 * fire a request per keystroke against a service run on donations.
 *
 * Coordinates typed straight into the box never reach here at all; `parseLatLon`
 * answers those locally (see `mercator.ts`).
 */

import { fetchJson } from "@/lib/net/fetch";
import type { LatLon } from "./mercator";

/** A place the map can be sent to. */
export interface Place extends LatLon {
  /** Stable id, so a saved place survives being re-searched. */
  id: string;
  /** Short name — what to put on the pin. */
  name: string;
  /** Full address line, for the row underneath. */
  detail: string;
  /** Suggested zoom: a country wants a different one from a doorway. */
  zoom: number;
}

interface RawResult {
  place_id?: unknown;
  osm_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
  display_name?: unknown;
  type?: unknown;
  addresstype?: unknown;
  boundingbox?: unknown;
}

const SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/**
 * How tightly to zoom on a result, worked out from how much ground it covers.
 * A bounding box is the only honest signal available: sending someone to zoom 18
 * on "France" is as unhelpful as zoom 5 on a street address.
 */
function zoomForBox(box: unknown, fallback = 14): number {
  if (!Array.isArray(box) || box.length < 4) return fallback;
  const [s, n, w, e] = box.map(Number);
  if (![s, n, w, e].every(Number.isFinite)) return fallback;
  const span = Math.max(Math.abs(n - s), Math.abs(e - w));
  if (span <= 0) return fallback;
  // 360° of longitude is one tile at zoom 0; halve the span, gain a level.
  return Math.min(17, Math.max(3, Math.round(Math.log2(360 / span)) - 1));
}

function toPlace(raw: RawResult, index: number): Place | null {
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const display = typeof raw.display_name === "string" ? raw.display_name : "";
  const name =
    (typeof raw.name === "string" && raw.name.trim()) || display.split(",")[0]?.trim() || "Place";

  return {
    id: String(raw.place_id ?? raw.osm_id ?? `${lat},${lon},${index}`),
    name,
    detail: display || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    lat,
    lon,
    zoom: zoomForBox(raw.boundingbox),
  };
}

/** Places matching a typed query, best first. Empty query returns nothing. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${SEARCH_URL}?format=jsonv2&addressdetails=0&limit=8&q=${encodeURIComponent(q)}`;
  const raw = await fetchJson<RawResult[]>(url, { signal, label: "Place search", timeoutMs: 10000 });

  return (Array.isArray(raw) ? raw : [])
    .map((r, i) => toPlace(r, i))
    .filter((p): p is Place => p !== null);
}

/**
 * What is at a position. Used for the "what am I looking at" line under the
 * map, so a failure has to be survivable: the caller falls back to coordinates,
 * which are always correct even when nobody has named the spot.
 */
export async function describePoint(point: LatLon, signal?: AbortSignal): Promise<Place | null> {
  const url =
    `${REVERSE_URL}?format=jsonv2&zoom=14&lat=${point.lat.toFixed(6)}&lon=${point.lon.toFixed(6)}`;
  const raw = await fetchJson<RawResult>(url, { signal, label: "Place lookup", timeoutMs: 10000 });
  return raw && typeof raw === "object" ? toPlace(raw, 0) : null;
}
