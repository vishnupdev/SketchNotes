/**
 * The live half of this app: the sheets of imagery that are actually current.
 *
 * A satellite *basemap* is a photograph, and photographs of the ground are
 * months or years old — no consumer imagery service is live, and an app that
 * implies otherwise is lying to its user. Two things genuinely are current,
 * global, free and keyless, so those are what this module fetches:
 *
 *  - **Rain radar** from RainViewer — precipitation as radar sees it, re-published
 *    about every ten minutes, as a run of time-stamped frames covering the last
 *    couple of hours.
 *  - **Today from orbit** from NASA's GIBS — the true-colour mosaic the polar
 *    satellites build of the whole planet each day, available within hours of
 *    the pass. Yesterday's Earth, and the six days before it.
 *
 * The two have completely different cadences — minutes against days — and the
 * one thing they must share is that every frame says *when it was taken*. So
 * each frame carries its own label, and the UI never invents freshness it cannot
 * point at.
 */

import { fetchJson } from "@/lib/net/fetch";

/** Which live sheet is drawn over the basemap. */
export type OverlayId = "none" | "radar" | "daily";

export interface OverlayMeta {
  id: OverlayId;
  name: string;
  /** What the picture actually shows — not what it is called. */
  blurb: string;
}

export const OVERLAYS: readonly OverlayMeta[] = [
  { id: "none", name: "Off", blurb: "Just the base map, with nothing drawn over it." },
  {
    id: "radar",
    name: "Rain radar",
    blurb:
      "Precipitation as radar sees it — where it is raining or snowing, re-published every ten minutes.",
  },
  {
    id: "daily",
    name: "Today from orbit",
    blurb:
      "NASA's true-colour mosaic of the whole planet, rebuilt daily. Turn the strength to 100% to see the day's imagery on its own.",
  },
];

/** One captured moment, and where its tiles live. */
export interface WeatherFrame {
  /** Capture time, in seconds since 1970. */
  time: number;
  /** Path or date identifying this frame on its own service. */
  path: string;
  /** A frame already observed, or one a nowcast projects forward. */
  forecast: boolean;
  /** How this frame names itself — a clock time, or a date. */
  label: string;
}

export interface WeatherIndex {
  host: string;
  /** When the index itself was published, in ms. */
  generated: number;
  radar: WeatherFrame[];
}

interface RawFrame {
  time?: unknown;
  path?: unknown;
}

interface RawIndex {
  host?: unknown;
  generated?: unknown;
  radar?: { past?: unknown; nowcast?: unknown };
}

const INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";

/** RainViewer's radar colour schemes; 4 is the blue/green/red one people read. */
const RADAR_COLOUR = 4;

/** GIBS publishes this product to zoom 9; RainViewer's radar to about 12. */
const MAX_ZOOM: Record<Exclude<OverlayId, "none">, number> = { radar: 12, daily: 9 };

/** The deepest tile level a live layer actually has. Beyond it, it is scaled up. */
export const overlayMaxZoom = (overlay: Exclude<OverlayId, "none">): number => MAX_ZOOM[overlay];

/** "14:20" in the reader's own zone — a radar stamp is only useful locally. */
const clockLabel = (seconds: number): string =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const readFrames = (raw: unknown, forecast: boolean): WeatherFrame[] =>
  Array.isArray(raw)
    ? raw
        .map((f) => f as RawFrame)
        .filter((f) => typeof f.time === "number" && typeof f.path === "string")
        .map((f) => ({
          time: f.time as number,
          path: f.path as string,
          forecast,
          label: clockLabel(f.time as number),
        }))
    : [];

/**
 * Fetch the radar frame index. Observed frames and the nowcast are concatenated
 * in time order, so the animation runs straight from two hours ago through now
 * and on into the projection without the player needing to know where the seam
 * is — only the timeline marks it, because that is the one place the difference
 * between "this happened" and "this might" has to be visible.
 *
 * The nowcast is often empty; that is a normal answer, not a failure, and the
 * player simply ends at the present.
 */
export async function fetchWeatherIndex(signal?: AbortSignal): Promise<WeatherIndex> {
  const raw = await fetchJson<RawIndex>(INDEX_URL, { signal, label: "Radar", timeoutMs: 9000 });

  return {
    host: typeof raw.host === "string" ? raw.host : "",
    generated: typeof raw.generated === "number" ? raw.generated * 1000 : Date.now(),
    radar: [...readFrames(raw.radar?.past, false), ...readFrames(raw.radar?.nowcast, true)].sort(
      (a, b) => a.time - b.time,
    ),
  };
}

/** How many days of the global mosaic the player steps through. */
const DAILY_SPAN = 7;

/**
 * A day's mosaic is assembled from that day's passes and published a few hours
 * behind the satellite, so today's is not there first thing. Six hours UTC is
 * comfortably after the morning pass has landed, and asking earlier than that
 * would put an empty frame on the end of every animation before breakfast.
 */
const DAILY_PUBLISH_HOUR_UTC = 6;

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * The last week of daily global mosaics, oldest first.
 *
 * No request is needed to know these exist: GIBS is addressed by date, so the
 * frame list is arithmetic. That is why choosing this layer costs no API call at
 * all — only the tiles you actually look at.
 */
export function dailyFrames(now = Date.now()): WeatherFrame[] {
  const today = new Date(now);
  const latest =
    today.getUTCHours() >= DAILY_PUBLISH_HOUR_UTC ? now : now - 24 * 60 * 60 * 1000;

  const out: WeatherFrame[] = [];
  for (let back = DAILY_SPAN - 1; back >= 0; back--) {
    const ms = latest - back * 24 * 60 * 60 * 1000;
    const day = isoDay(ms);
    out.push({
      time: Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000),
      path: day,
      forecast: false,
      label: new Date(`${day}T00:00:00Z`).toLocaleDateString([], {
        day: "numeric",
        month: "short",
      }),
    });
  }
  return out;
}

/**
 * The frames for one overlay. Radar's come off the fetched index; the daily
 * mosaic's are computed, so it has frames even before — and without — a request.
 */
export function framesFor(
  index: WeatherIndex | undefined,
  overlay: OverlayId,
  now = Date.now(),
): WeatherFrame[] {
  if (overlay === "none") return [];
  if (overlay === "daily") return dailyFrames(now);
  return index?.radar ?? [];
}

/**
 * Address of one overlay tile.
 *
 * GIBS numbers its tiles `{z}/{row}/{col}` — row before column, like Esri and
 * unlike RainViewer, which is the transposition that would otherwise be found
 * only by noticing the sea in the wrong place.
 */
export function overlayTileUrl(
  index: WeatherIndex | undefined,
  frame: WeatherFrame,
  overlay: Exclude<OverlayId, "none">,
  x: number,
  y: number,
  z: number,
): string | null {
  if (overlay === "daily") {
    return (
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
      `MODIS_Terra_CorrectedReflectance_TrueColor/default/${frame.path}/` +
      `GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`
    );
  }
  if (!index?.host) return null;
  return `${index.host}${frame.path}/256/${z}/${x}/${y}/${RADAR_COLOUR}/1_1.png`;
}

/** Credit line for a live layer — shown under the map whenever it is drawn. */
export const overlayCredit = (overlay: Exclude<OverlayId, "none">): string =>
  overlay === "daily" ? "Imagery © NASA EOSDIS GIBS" : "Radar © RainViewer";

/**
 * How stale the newest observed frame is, in minutes, or null when the layer is
 * not measured in minutes. This is the number that decides whether the word
 * "live" is honest, so it is shown rather than assumed.
 */
export function minutesBehind(frames: WeatherFrame[], now = Date.now()): number | null {
  const observed = frames.filter((f) => !f.forecast);
  const latest = observed[observed.length - 1];
  if (!latest) return null;
  return Math.max(0, Math.round((now - latest.time * 1000) / 60000));
}

/** Index of the newest observed frame — where the player should sit at rest. */
export function liveFrameIndex(frames: WeatherFrame[]): number {
  const last = frames.map((f) => f.forecast).lastIndexOf(false);
  return last === -1 ? Math.max(0, frames.length - 1) : last;
}
