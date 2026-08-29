"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { clampLat, wrapLon, type LatLon } from "@/lib/Satellite/mercator";
import { baseLayer, type BaseLayerId } from "@/lib/Satellite/layers";
import type { OverlayId } from "@/lib/Satellite/weather";
import type { Place } from "@/lib/Satellite/geocode";

const PREFS_KEY = "sknotes:satellite:prefs";
const PLACES_KEY = "sknotes:satellite:places";

export type SatelliteTab = "find" | "layers" | "live";

export const SATELLITE_TABS: SatelliteTab[] = ["find", "layers", "live"];

/** Zoom 2 fits the world on a phone; 19 is as deep as the imagery goes. */
export const MIN_ZOOM = 2;

/** Where a first-time visitor lands: the whole world, so nothing is presumed. */
const DEFAULT_VIEW: LatLon = { lat: 20, lon: 0 };

/** Live position as the browser reports it, plus when it said so. */
export interface LiveFix extends LatLon {
  /** Reported accuracy radius in metres. */
  accuracy: number;
  /** Metres per second, where the device knows. */
  speed: number | null;
  /** Degrees clockwise from true north, where the device knows. */
  heading: number | null;
  altitude: number | null;
  /** When the fix was taken, in ms. */
  ts: number;
}

interface SatelliteState {
  tab: SatelliteTab;

  /** Centre of the map. */
  center: LatLon;
  /** Fractional zoom — the renderer scales between whole tile levels. */
  zoom: number;

  base: BaseLayerId;
  /** Draw place names and boundaries over the base imagery. */
  labels: boolean;

  overlay: OverlayId;
  /** How strongly the live overlay is drawn, 0.1–1. */
  opacity: number;
  /** Whether the frame player is running. */
  playing: boolean;
  /** Which frame is on screen; clamped by the panel that knows how many exist. */
  frame: number;

  /** Where the device says it is, or null until it has been asked. */
  fix: LiveFix | null;
  /** Whether a position watch is running. */
  tracking: boolean;
  /** Why locating failed, in words the user can act on. */
  fixError: string | null;
  /** Keep re-centring the map on the live position as it moves. */
  follow: boolean;

  /** The pin currently on the map — a search result, or a tapped point. */
  pin: Place | null;
  /** Places kept for next time. */
  saved: Place[];
  /** The text in the search box, kept so switching tabs doesn't lose it. */
  query: string;

  setTab: (tab: SatelliteTab) => void;
  /** Move the map. Latitude is clamped to what Mercator can draw. */
  setView: (center: LatLon, zoom?: number) => void;
  /** Pan/zoom from the canvas — same as setView, but never breaks `follow`. */
  nudgeView: (center: LatLon, zoom: number) => void;
  zoomBy: (delta: number) => void;
  setBase: (base: BaseLayerId) => void;
  setLabels: (labels: boolean) => void;
  setOverlay: (overlay: OverlayId) => void;
  setOpacity: (opacity: number) => void;
  setPlaying: (playing: boolean) => void;
  setFrame: (frame: number) => void;
  setFix: (fix: LiveFix | null) => void;
  setTracking: (tracking: boolean) => void;
  setFixError: (message: string | null) => void;
  setFollow: (follow: boolean) => void;
  setPin: (pin: Place | null) => void;
  setQuery: (query: string) => void;
  savePlace: (place: Place) => void;
  removePlace: (id: string) => void;
  hydrate: () => Promise<void>;
}

const clampZoom = (zoom: number, base: BaseLayerId): number =>
  Math.min(baseLayer(base).maxZoom, Math.max(MIN_ZOOM, zoom));

const cleanPoint = (p: LatLon): LatLon => ({ lat: clampLat(p.lat), lon: wrapLon(p.lon) });

/**
 * The map's view, its layers and the places you keep.
 *
 * Split from the live fix on purpose: everything above `fix` is persisted, and
 * nothing below it is. Where the device *is* is not a preference — writing it to
 * storage would leave a trail of the user's movements in the browser for a
 * feature that can simply ask again, which is the sort of thing the Resource
 * Monitor exists to complain about.
 */
export const useSatelliteStore = create<SatelliteState>((set, get) => ({
  tab: "find",
  center: DEFAULT_VIEW,
  zoom: 3,
  base: "satellite",
  labels: true,
  overlay: "none",
  opacity: 0.7,
  playing: false,
  frame: 0,
  fix: null,
  tracking: false,
  fixError: null,
  follow: false,
  pin: null,
  saved: [],
  query: "",

  setTab: (tab) => {
    set({ tab });
    persist(get());
  },

  setView: (center, zoom) => {
    const next = get();
    set({
      center: cleanPoint(center),
      zoom: clampZoom(zoom ?? next.zoom, next.base),
      // Sending the map somewhere by hand means you are no longer following
      // yourself around; leaving `follow` on would snatch it straight back.
      follow: false,
    });
    persist(get());
  },

  nudgeView: (center, zoom) => {
    set({ center: cleanPoint(center), zoom: clampZoom(zoom, get().base) });
    persist(get());
  },

  zoomBy: (delta) => {
    set({ zoom: clampZoom(get().zoom + delta, get().base) });
    persist(get());
  },

  setBase: (base) => {
    // A layer with shallower imagery than the current zoom would otherwise show
    // a blank grid, so the view comes up with it.
    set({ base, zoom: clampZoom(get().zoom, base) });
    persist(get());
  },
  setLabels: (labels) => {
    set({ labels });
    persist(get());
  },
  setOverlay: (overlay) => {
    set({ overlay, playing: overlay === "none" ? false : get().playing });
    persist(get());
  },
  setOpacity: (opacity) => {
    set({ opacity: Math.min(1, Math.max(0.1, opacity)) });
    persist(get());
  },
  setPlaying: (playing) => set({ playing }),
  setFrame: (frame) => set({ frame: Math.max(0, Math.round(frame)) }),

  setFix: (fix) => {
    set({ fix, fixError: fix ? null : get().fixError });
    if (fix && get().follow) set({ center: cleanPoint(fix) });
  },
  setTracking: (tracking) => set({ tracking, follow: tracking ? get().follow : false }),
  setFixError: (fixError) => set({ fixError }),
  setFollow: (follow) => {
    const fix = get().fix;
    set({ follow, ...(follow && fix ? { center: cleanPoint(fix) } : {}) });
  },

  setPin: (pin) => set({ pin }),
  setQuery: (query) => set({ query: query.slice(0, 160) }),

  savePlace: (place) => {
    const saved = [place, ...get().saved.filter((p) => p.id !== place.id)].slice(0, 40);
    set({ saved });
    void sSet(PLACES_KEY, JSON.stringify(saved));
  },
  removePlace: (id) => {
    const saved = get().saved.filter((p) => p.id !== id);
    set({ saved });
    void sSet(PLACES_KEY, JSON.stringify(saved));
  },

  hydrate: async () => {
    const [rawPrefs, rawPlaces] = await Promise.all([sGet(PREFS_KEY), sGet(PLACES_KEY)]);

    if (rawPrefs) {
      try {
        const p = JSON.parse(rawPrefs) as Partial<StoredPrefs>;
        const base = BASE_IDS.includes(p.base as BaseLayerId) ? (p.base as BaseLayerId) : "satellite";
        set({
          tab: SATELLITE_TABS.includes(p.tab as SatelliteTab) ? (p.tab as SatelliteTab) : "find",
          base,
          labels: typeof p.labels === "boolean" ? p.labels : true,
          overlay: OVERLAY_IDS.includes(p.overlay as OverlayId) ? (p.overlay as OverlayId) : "none",
          opacity: typeof p.opacity === "number" ? Math.min(1, Math.max(0.1, p.opacity)) : 0.7,
          center:
            typeof p.lat === "number" && typeof p.lon === "number"
              ? cleanPoint({ lat: p.lat, lon: p.lon })
              : DEFAULT_VIEW,
          zoom: typeof p.zoom === "number" ? clampZoom(p.zoom, base) : 3,
        });
      } catch {
        /* corrupt prefs are simply the defaults */
      }
    }

    if (rawPlaces) {
      try {
        const list = JSON.parse(rawPlaces) as unknown;
        set({ saved: Array.isArray(list) ? list.filter(isPlace).slice(0, 40) : [] });
      } catch {
        /* corrupt list — start empty rather than refuse to open */
      }
    }
  },
}));

const BASE_IDS: string[] = ["satellite", "streets", "terrain"];
const OVERLAY_IDS: string[] = ["none", "radar", "daily"];

const isPlace = (v: unknown): v is Place => {
  const p = v as Place | null;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.lat === "number" &&
    typeof p.lon === "number"
  );
};

interface StoredPrefs {
  tab: SatelliteTab;
  base: BaseLayerId;
  labels: boolean;
  overlay: OverlayId;
  opacity: number;
  lat: number;
  lon: number;
  zoom: number;
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Save the view, a moment after it stops moving.
 *
 * Debounced because a drag across the map calls this on every pointer frame,
 * and a drag over a slow-zooming pinch calls it more often than that. Writing
 * sixty times a second to keep a value nobody reads until the next visit is
 * exactly the sort of work rule #7 is about; 500ms after the hand comes off is
 * indistinguishable to the user and costs one write.
 */
function persist(s: SatelliteState): void {
  const payload = JSON.stringify({
    tab: s.tab,
    base: s.base,
    labels: s.labels,
    overlay: s.overlay,
    opacity: s.opacity,
    lat: s.center.lat,
    lon: s.center.lon,
    zoom: s.zoom,
  } satisfies StoredPrefs);

  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void sSet(PREFS_KEY, payload);
  }, 500);
}
