"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";

/**
 * State for the Resource Monitor: which tab is showing, and — the part that
 * matters — every capture or location session the app is currently holding
 * open.
 *
 * Sessions live in the store rather than in a panel's local state so that
 * moving between tabs doesn't silently drop the camera the user asked to watch.
 * The flip side is a hard rule: {@link ResourcesState.stopAll} must run when the
 * app unmounts. A monitor that leaks the microphone into the next app would be
 * the exact failure it exists to catch.
 */

export type ResourceTab = "live" | "access" | "apps" | "privacy";

export const RESOURCE_TABS: ResourceTab[] = ["live", "access", "apps", "privacy"];

/** The three resources the monitor can hold open and show you. */
export type CaptureKind = "camera" | "microphone" | "screen";

export interface CaptureSession {
  kind: CaptureKind;
  stream: MediaStream;
  /** The source the browser handed over — a camera name, a window title. */
  label: string;
  /** Live format read off the track: resolution and rate, or sample rate. */
  detail: string;
  startedAt: number;
}

export interface GeoFix {
  lat: number;
  lon: number;
  accuracy: number;
  at: number;
}

export interface GeoWatch {
  /** watchPosition handle, kept so the watch can be cleared. */
  id: number;
  startedAt: number;
  updates: number;
  last: GeoFix | null;
  error: string | null;
}

const TAB_KEY = "sknotes:resources:tab";

const isTab = (v: unknown): v is ResourceTab =>
  typeof v === "string" && (RESOURCE_TABS as string[]).includes(v);

/** Format a video track's live settings, e.g. "1280×720 · 30 fps". */
function describeVideo(track: MediaStreamTrack): string {
  const s = track.getSettings();
  const size = s.width && s.height ? `${s.width}×${s.height}` : null;
  const fps = s.frameRate ? `${Math.round(s.frameRate)} fps` : null;
  return [size, fps].filter(Boolean).join(" · ") || "video";
}

/** Format an audio track's live settings, e.g. "48 kHz · mono". */
function describeAudio(track: MediaStreamTrack): string {
  const s = track.getSettings();
  const rate = s.sampleRate ? `${Math.round(s.sampleRate / 100) / 10} kHz` : null;
  const ch = s.channelCount ? (s.channelCount === 1 ? "mono" : `${s.channelCount} ch`) : null;
  return [rate, ch].filter(Boolean).join(" · ") || "audio";
}

/** Turn a getUserMedia rejection into something worth reading. */
function explain(kind: CaptureKind, e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  const thing = kind === "screen" ? "Screen sharing" : kind === "camera" ? "The camera" : "The microphone";
  switch (name) {
    case "NotAllowedError":
      return `${thing} was refused. Allow it in the browser's site settings, then try again.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `No ${kind === "microphone" ? "microphone" : "camera"} was found on this device.`;
    case "NotReadableError":
      return `${thing} is already in use by another app.`;
    case "AbortError":
      return "The request was dismissed.";
    case "SecurityError":
      return `${thing} needs a secure (HTTPS) connection.`;
    default:
      return `${thing} could not be opened.`;
  }
}

interface ResourcesState {
  tab: ResourceTab;
  /** Sessions this app is holding right now, keyed by resource. */
  sessions: Partial<Record<CaptureKind, CaptureSession>>;
  /** The resource whose request is in flight, so its button can wait. */
  busy: CaptureKind | null;
  errors: Partial<Record<CaptureKind, string>>;
  geo: GeoWatch | null;
  geoError: string | null;

  setTab: (tab: ResourceTab) => void;
  /** Merge the saved tab in after mount (avoids an SSR mismatch). */
  hydrate: () => Promise<void>;

  start: (kind: CaptureKind) => Promise<void>;
  stop: (kind: CaptureKind) => void;
  startGeo: () => void;
  stopGeo: () => void;
  /** Release everything. Called when the app unmounts. */
  stopAll: () => void;
}

export const useResourcesStore = create<ResourcesState>((set, get) => ({
  tab: "live",
  sessions: {},
  busy: null,
  errors: {},
  geo: null,
  geoError: null,

  setTab: (tab) => {
    set({ tab });
    void sSet(TAB_KEY, tab);
  },

  hydrate: async () => {
    const raw = await sGet(TAB_KEY);
    if (isTab(raw)) set({ tab: raw });
  },

  start: async (kind) => {
    if (get().sessions[kind] || get().busy) return;
    const cleared = { ...get().errors };
    delete cleared[kind];
    set({ busy: kind, errors: cleared });

    try {
      const stream =
        kind === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true })
          : await navigator.mediaDevices.getUserMedia(
              kind === "camera" ? { video: true } : { audio: true },
            );

      const track = stream.getTracks()[0];
      const video = kind !== "microphone";
      const session: CaptureSession = {
        kind,
        stream,
        label: track?.label || (video ? "Video source" : "Audio input"),
        detail: track ? (video ? describeVideo(track) : describeAudio(track)) : "",
        startedAt: Date.now(),
      };

      // Screen sharing has its own "Stop sharing" bar, and a camera can be
      // pulled out mid-session: either way the track ends without us asking, so
      // the row has to follow the hardware rather than the button.
      for (const t of stream.getTracks()) {
        t.addEventListener("ended", () => {
          if (get().sessions[kind]?.stream === stream) get().stop(kind);
        });
      }

      set({ sessions: { ...get().sessions, [kind]: session }, busy: null });
    } catch (e) {
      set({ busy: null, errors: { ...get().errors, [kind]: explain(kind, e) } });
    }
  },

  stop: (kind) => {
    const session = get().sessions[kind];
    if (!session) return;
    for (const track of session.stream.getTracks()) track.stop();
    const next = { ...get().sessions };
    delete next[kind];
    set({ sessions: next });
  },

  startGeo: () => {
    if (get().geo || typeof navigator === "undefined" || !navigator.geolocation) return;
    set({ geoError: null });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const current = get().geo;
        if (!current) return;
        set({
          geo: {
            ...current,
            updates: current.updates + 1,
            error: null,
            last: {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              at: pos.timestamp,
            },
          },
        });
      },
      (err) => {
        const current = get().geo;
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location was refused."
            : err.code === err.POSITION_UNAVAILABLE
              ? "No position could be determined."
              : "Timed out waiting for a fix.";
        if (current) set({ geo: { ...current, error: message } });
        else set({ geoError: message });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
    set({ geo: { id, startedAt: Date.now(), updates: 0, last: null, error: null } });
  },

  stopGeo: () => {
    const geo = get().geo;
    if (!geo) return;
    navigator.geolocation.clearWatch(geo.id);
    set({ geo: null });
  },

  stopAll: () => {
    for (const session of Object.values(get().sessions)) {
      if (session) for (const track of session.stream.getTracks()) track.stop();
    }
    const geo = get().geo;
    if (geo && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(geo.id);
    set({ sessions: {}, geo: null, busy: null });
  },
}));
