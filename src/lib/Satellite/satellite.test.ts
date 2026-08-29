import { describe, expect, it } from "vitest";
import {
  clampLat,
  formatDistance,
  latToTileY,
  lonToTileX,
  MAX_LAT,
  metresPerPixel,
  parseLatLon,
  project,
  scaleBar,
  tileYToLat,
  unproject,
  wrapLon,
} from "./mercator";
import { latLonToScreen, panBy, screenToLatLon, tileLevelFor, zoomAround } from "./render";
import {
  dailyFrames,
  framesFor,
  liveFrameIndex,
  minutesBehind,
  overlayMaxZoom,
  overlayTileUrl,
  type WeatherFrame,
} from "./weather";
import { baseLayer, BASE_LAYERS, LABELS_SOURCE } from "./layers";
import { streetViewUrl } from "./streetview";

/**
 * The map's arithmetic.
 *
 * Every bug this suite is here for looks the same on screen — the map is *near*
 * the right place — which is why they are so easy to ship. A projection off by a
 * hemisphere is obvious; a zoom that drifts a few pixels per notch, a marker
 * that jumps a world at the dateline, or a scale bar that ignores latitude are
 * all things you have to measure to notice.
 */

const view = { width: 800, height: 600, center: { lat: 12.9716, lon: 77.5946 }, zoom: 12 };

describe("web mercator", () => {
  it("puts the origin in the middle of the world", () => {
    expect(lonToTileX(0, 0)).toBeCloseTo(0.5, 10);
    expect(latToTileY(0, 0)).toBeCloseTo(0.5, 10);
  });

  it("maps the corners of the square to the corners of the world", () => {
    expect(lonToTileX(-180, 0)).toBeCloseTo(0, 10);
    expect(latToTileY(MAX_LAT, 0)).toBeCloseTo(0, 6);
    expect(latToTileY(-MAX_LAT, 0)).toBeCloseTo(1, 6);
  });

  it("round-trips a position through the projection", () => {
    for (const p of [
      { lat: 0, lon: 0 },
      { lat: 51.5074, lon: -0.1278 },
      { lat: -33.8688, lon: 151.2093 },
      { lat: 64.1466, lon: -21.9426 },
    ]) {
      const back = unproject(project(p, 14), 14);
      expect(back.lat).toBeCloseTo(p.lat, 9);
      expect(back.lon).toBeCloseTo(p.lon, 9);
    }
  });

  it("clamps beyond what the projection can draw", () => {
    expect(clampLat(90)).toBe(MAX_LAT);
    expect(clampLat(-90)).toBe(-MAX_LAT);
    expect(Number.isFinite(latToTileY(90, 5))).toBe(true);
  });

  it("wraps longitude the short way round", () => {
    expect(wrapLon(190)).toBeCloseTo(-170, 10);
    expect(wrapLon(-190)).toBeCloseTo(170, 10);
    expect(wrapLon(180)).toBeCloseTo(-180, 10);
  });

  it("halves the ground a pixel covers with each zoom level", () => {
    const a = metresPerPixel(0, 10);
    const b = metresPerPixel(0, 11);
    expect(a / b).toBeCloseTo(2, 6);
  });

  it("knows a pixel covers less ground away from the equator", () => {
    expect(metresPerPixel(60, 10)).toBeLessThan(metresPerPixel(0, 10));
    expect(metresPerPixel(60, 10)).toBeCloseTo(metresPerPixel(0, 10) / 2, 3);
  });

  it("keeps the tile row inside the world at every zoom", () => {
    for (const z of [0, 3, 8, 15, 19]) {
      // MAX_LAT is the latitude whose row is exactly 0, so floating point puts
      // it a hair either side of the edge — hence the tolerance rather than a
      // bare >= 0. The renderer clamps rows to the world for the same reason.
      expect(latToTileY(MAX_LAT, z)).toBeGreaterThan(-1e-4);
      expect(latToTileY(-MAX_LAT, z)).toBeLessThan(2 ** z + 1e-4);
      expect(tileYToLat(0, z)).toBeCloseTo(MAX_LAT, 4);
    }
  });
});

describe("scaleBar", () => {
  /** The leading digit of a bar's label, normalised out of its magnitude. */
  const mantissa = (label: string): number => {
    const value = Number(label.replace(/,/g, "").split(" ")[0]);
    return value / 10 ** Math.floor(Math.log10(value));
  };

  it("always reads as a round quantity", () => {
    for (const zoom of [3, 7, 11, 14, 18]) {
      const { label } = scaleBar(20, zoom);
      expect(label, label).toMatch(/^[\d,]+(\.\d)? (m|km)$/);
      // 1, 2 or 5 times a power of ten — never "37 m", whatever the zoom is.
      expect([1, 2, 5], label).toContain(Math.round(mantissa(label)));
    }
  });

  it("never draws wider than it was allowed", () => {
    for (const zoom of [3, 7, 11, 14, 18]) {
      expect(scaleBar(20, zoom, 110).px).toBeLessThanOrEqual(110);
      expect(scaleBar(20, zoom, 110).px).toBeGreaterThan(0);
    }
  });

  it("covers less ground for the same bar as the map moves north", () => {
    // The bar's *pixel* width isn't comparable — it jumps as the round number
    // it picks changes — but the distance that width stands for has to shrink.
    const north = scaleBar(65, 12);
    const equator = scaleBar(0, 12);
    expect(north.px * metresPerPixel(65, 12)).toBeLessThan(
      equator.px * metresPerPixel(0, 12),
    );
  });
});

describe("parseLatLon", () => {
  it("takes the forms people actually paste", () => {
    expect(parseLatLon("12.9716, 77.5946")).toEqual({ lat: 12.9716, lon: 77.5946 });
    expect(parseLatLon("  -33.8688 151.2093 ")).toEqual({ lat: -33.8688, lon: 151.2093 });
    expect(parseLatLon("(48.8584; 2.2945)")).toEqual({ lat: 48.8584, lon: 2.2945 });
  });

  it("refuses a place name, and refuses impossible numbers", () => {
    expect(parseLatLon("Eiffel Tower")).toBeNull();
    expect(parseLatLon("120, 30")).toBeNull();
    expect(parseLatLon("30, 200")).toBeNull();
    expect(parseLatLon("51.5")).toBeNull();
  });
});

describe("screen and world", () => {
  it("puts the centre in the middle of the canvas", () => {
    const p = latLonToScreen(view, view.center);
    expect(p.x).toBeCloseTo(400, 6);
    expect(p.y).toBeCloseTo(300, 6);
  });

  it("round-trips a screen point back to itself", () => {
    const geo = screenToLatLon(view, 137, 452);
    const back = latLonToScreen(view, geo);
    expect(back.x).toBeCloseTo(137, 6);
    expect(back.y).toBeCloseTo(452, 6);
  });

  it("draws a point over the dateline beside the centre, not a world away", () => {
    const dateline = { width: 800, height: 600, center: { lat: 0, lon: 179.9 }, zoom: 8 };
    const p = latLonToScreen(dateline, { lat: 0, lon: -179.9 });
    // 0.2° at zoom 8 is a few hundred pixels — it must not land off-canvas.
    expect(Math.abs(p.x - 400)).toBeLessThan(dateline.width);
  });

  it("moves the map with the hand when panning", () => {
    const moved = panBy(view, 100, 0);
    // Dragging right shows ground to the west, so the centre's longitude falls.
    expect(moved.lon).toBeLessThan(view.center.lon);
    const back = latLonToScreen({ ...view, center: moved }, view.center);
    expect(back.x).toBeCloseTo(500, 4);
  });

  it("holds the point under the cursor still while zooming", () => {
    const anchor = { x: 620, y: 180 };
    const held = screenToLatLon(view, anchor.x, anchor.y);
    for (const nextZoom of [13, 14.5, 10.25]) {
      const center = zoomAround(view, nextZoom, anchor.x, anchor.y);
      const after = latLonToScreen({ ...view, zoom: nextZoom, center }, held);
      expect(after.x).toBeCloseTo(anchor.x, 4);
      expect(after.y).toBeCloseTo(anchor.y, 4);
    }
  });

  it("never asks a service for a level it hasn't got", () => {
    expect(tileLevelFor(23, 19)).toBe(19);
    expect(tileLevelFor(-4, 19)).toBe(0);
    expect(tileLevelFor(12.4, 19)).toBe(12);
    expect(tileLevelFor(12.6, 19)).toBe(13);
  });
});

describe("layers", () => {
  it("numbers every Esri tile row-then-column", () => {
    // The classic silent bug: a transposed map that still renders imagery, so
    // nothing throws and the sea is simply in the wrong place. Esri (and NASA,
    // checked below) put the row first; RainViewer puts the column first.
    for (const layer of BASE_LAYERS) {
      expect(layer.url(3, 5, 4), layer.id).toMatch(/\/tile\/4\/5\/3$/);
    }
    expect(LABELS_SOURCE.url(3, 5, 4)).toMatch(/\/tile\/4\/5\/3$/);
  });

  it("serves every layer over https, and credits every one", () => {
    for (const layer of BASE_LAYERS) {
      expect(layer.url(1, 1, 1).startsWith("https://")).toBe(true);
      expect(layer.credit.length).toBeGreaterThan(8);
    }
  });

  it("falls back to imagery for an unknown id", () => {
    expect(baseLayer("nonsense" as "satellite").id).toBe("satellite");
  });
});

describe("weather frames", () => {
  const at = (minutesAgo: number, forecast = false): WeatherFrame => ({
    time: Math.round((Date.now() - minutesAgo * 60000) / 1000),
    path: `/v2/${minutesAgo}`,
    forecast,
    label: `${minutesAgo}`,
  });

  it("reports how far behind now the newest observation is", () => {
    expect(minutesBehind([at(30), at(10)])).toBe(10);
    expect(minutesBehind([])).toBeNull();
  });

  it("does not let the forecast pass itself off as an observation", () => {
    // A nowcast frame stamped ten minutes ahead must not read as "0 behind".
    expect(minutesBehind([at(12), at(-10, true)])).toBe(12);
    expect(liveFrameIndex([at(12), at(-10, true)])).toBe(0);
  });

  it("rests on the last real frame, not the last frame", () => {
    expect(liveFrameIndex([at(40), at(20), at(0), at(-10, true), at(-20, true)])).toBe(2);
    expect(liveFrameIndex([])).toBe(0);
  });

  it("asks for nothing at all with the overlay off", () => {
    const index = { host: "https://h", generated: Date.now(), radar: [at(0)] };
    expect(framesFor(index, "none")).toEqual([]);
    expect(framesFor(undefined, "radar")).toEqual([]);
    expect(framesFor(index, "radar")).toHaveLength(1);
  });

  it("knows the daily mosaic's frames without asking anyone", () => {
    // The whole point of the layer: no index, still a full run of frames.
    const frames = framesFor(undefined, "daily");
    expect(frames).toHaveLength(7);
    expect(frames.every((f) => !f.forecast)).toBe(true);
    // Oldest first, one day apart, so the player runs forwards in time.
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].time - frames[i - 1].time).toBe(86400);
    }
  });

  it("waits for a day's mosaic to be published before offering it", () => {
    const early = Date.parse("2026-03-10T02:00:00Z");
    const later = Date.parse("2026-03-10T09:00:00Z");
    expect(dailyFrames(early).at(-1)?.path).toBe("2026-03-09");
    expect(dailyFrames(later).at(-1)?.path).toBe("2026-03-10");
  });
});

describe("overlay tiles", () => {
  const frame: WeatherFrame = { time: 1, path: "2026-03-09", forecast: false, label: "9 Mar" };

  it("addresses NASA's mosaic by date, row before column", () => {
    const url = overlayTileUrl(undefined, frame, "daily", 3, 5, 4);
    expect(url).toContain("/default/2026-03-09/");
    expect(url).toMatch(/\/4\/5\/3\.jpg$/);
    expect(url?.startsWith("https://")).toBe(true);
  });

  it("has no radar address until the index has named a host", () => {
    // Without this the map would request "undefined/…" for every tile on screen.
    expect(overlayTileUrl(undefined, frame, "radar", 3, 5, 4)).toBeNull();
    const index = { host: "https://tiles.example", generated: 0, radar: [] };
    expect(overlayTileUrl(index, frame, "radar", 3, 5, 4)).toBe(
      "https://tiles.example2026-03-09/256/4/3/5/4/1_1.png",
    );
  });

  it("caps each live layer at the level it is actually published to", () => {
    expect(overlayMaxZoom("daily")).toBe(9);
    expect(overlayMaxZoom("radar")).toBe(12);
  });
});

describe("streetViewUrl", () => {
  const params = (url: string) => new URL(url).searchParams;

  it("asks for the panorama nearest a point", () => {
    const url = streetViewUrl({ lat: 48.8584, lon: 2.2945 });
    expect(new URL(url).origin).toBe("https://www.google.com");
    expect(params(url).get("api")).toBe("1");
    expect(params(url).get("map_action")).toBe("pano");
    expect(params(url).get("viewpoint")).toBe("48.858400,2.294500");
  });

  it("faces the way the device is facing, when it knows", () => {
    expect(params(streetViewUrl({ lat: 1, lon: 2 }, 91.4)).get("heading")).toBe("91");
    // A compass can read past a full turn, or below zero after a correction.
    expect(params(streetViewUrl({ lat: 1, lon: 2 }, 451)).get("heading")).toBe("91");
    expect(params(streetViewUrl({ lat: 1, lon: 2 }, -90)).get("heading")).toBe("270");
  });

  it("leaves the heading off rather than inventing one", () => {
    // Most devices report no heading while stationary; "0" would be a claim of
    // facing due north, which is a different statement from "not known".
    for (const unknown of [null, undefined, Number.NaN]) {
      expect(params(streetViewUrl({ lat: 1, lon: 2 }, unknown)).has("heading")).toBe(false);
    }
  });

  it("normalises a longitude that has been panned past the dateline", () => {
    // The map's own centre can legitimately read 200°; Google's would not.
    expect(params(streetViewUrl({ lat: 10, lon: 200 })).get("viewpoint")).toBe(
      "10.000000,-160.000000",
    );
  });
});

describe("formatDistance", () => {
  it("changes unit where a person would", () => {
    expect(formatDistance(420)).toBe("420 m");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(250000)).toBe("250 km");
    expect(formatDistance(Number.NaN)).toBe("—");
  });
});
