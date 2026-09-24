"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { MetronomeEngine, type Tick } from "@/lib/Metronome/engine";
import {
  clampBpm,
  cycleAccent,
  defaultAccents,
  pushTap,
  tapBpm,
  type Meter,
} from "@/lib/Metronome/rhythm";
import {
  accentsFor,
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeSongs,
  type Settings,
  type Song,
} from "@/lib/Metronome/settings";

const SETTINGS_KEY = "sknotes:metronome:settings";
const SONGS_KEY = "sknotes:metronome:songs";
const TOOL_KEY = "sknotes:metronome:tool";

export type MetronomeTool = "beat" | "trainer" | "songs";

export const METRONOME_TOOLS: MetronomeTool[] = ["beat", "trainer", "songs"];

interface MetronomeState {
  tool: MetronomeTool;
  settings: Settings;
  songs: Song[];
  playing: boolean;
  /** The beat last heard, or null when stopped. Updated once per beat, not per subdivision. */
  position: Tick | null;
  /** Recent tap times for tap tempo. */
  taps: number[];
  /** Whether the browser refused to give us audio. */
  unsupported: boolean;

  setTool: (tool: MetronomeTool) => void;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
  setBpm: (bpm: number) => void;
  nudge: (delta: number) => void;
  setMeter: (meter: Meter) => void;
  /** Move one beat to its next accent: strong → medium → soft → mute. */
  cycleBeat: (index: number) => void;
  resetAccents: () => void;
  tap: () => void;

  start: () => void;
  stop: () => void;
  toggle: () => void;
  /** Stop, and release the audio device. The app is unmounting. */
  release: () => void;

  saveSong: (name: string) => void;
  loadSong: (id: string) => void;
  removeSong: (id: string) => void;
}

let engine: MetronomeEngine | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Metronome's state.
 *
 * The engine is a module singleton rather than state, because it holds an
 * AudioContext and a running timer — neither of which belongs in something
 * React compares. It reads the settings through `getState()` before every
 * click, so there is no "apply" step: whatever is in the store *is* what is
 * playing.
 */
export const useMetronomeStore = create<MetronomeState>((set, get) => ({
  tool: "beat",
  settings: DEFAULT_SETTINGS,
  songs: [],
  playing: false,
  position: null,
  taps: [],
  unsupported: false,

  setTool: (tool) => {
    set({ tool });
    void sSet(TOOL_KEY, tool);
  },

  hydrate: async () => {
    const [rawSettings, rawSongs, rawTool] = await Promise.all([
      sGet(SETTINGS_KEY),
      sGet(SONGS_KEY),
      sGet(TOOL_KEY),
    ]);
    set({
      settings: normalizeSettings(parse(rawSettings)),
      songs: normalizeSongs(parse(rawSongs)),
      tool: METRONOME_TOOLS.includes(rawTool as MetronomeTool) ? (rawTool as MetronomeTool) : "beat",
    });
  },

  update: (patch) => {
    set({ settings: { ...get().settings, ...patch } });
    persistSettings(get().settings);
  },

  setBpm: (bpm) => get().update({ bpm: clampBpm(bpm) }),

  nudge: (delta) => get().setBpm(get().settings.bpm + delta),

  setMeter: (meter) => get().update({ meter, accents: defaultAccents(meter) }),

  cycleBeat: (index) => {
    const accents = [...get().settings.accents];
    if (index < 0 || index >= accents.length) return;
    accents[index] = cycleAccent(accents[index]);
    get().update({ accents });
  },

  resetAccents: () => get().update({ accents: defaultAccents(get().settings.meter) }),

  tap: () => {
    const taps = pushTap(get().taps, performance.now());
    set({ taps });
    const bpm = tapBpm(taps);
    if (bpm !== null) get().setBpm(bpm);
  },

  start: () => {
    engine ??= new MetronomeEngine(
      () => {
        const s = get().settings;
        return {
          bpm: s.bpm,
          meter: s.meter,
          accents: s.accents,
          subdivision: s.subdivision,
          sound: s.sound,
          volume: s.volume,
          ramp: s.rampOn ? s.ramp : null,
          gap: s.gapOn ? s.gap : null,
        };
      },
      (tick) => {
        if (tick.sub === 0) set({ position: tick });
      },
    );
    const ok = engine.start();
    set({ playing: ok, unsupported: !ok, position: null });
  },

  stop: () => {
    engine?.stop();
    set({ playing: false, position: null });
  },

  toggle: () => (get().playing ? get().stop() : get().start()),

  release: () => {
    engine?.dispose();
    engine = null;
    set({ playing: false, position: null, taps: [] });
  },

  saveSong: (name) => {
    const s = get().settings;
    const song: Song = {
      id: uid(),
      name: name.trim().slice(0, 80) || `${s.bpm} BPM`,
      bpm: s.bpm,
      meter: s.meter,
      accents: [...s.accents],
      subdivision: s.subdivision,
    };
    set({ songs: [...get().songs, song] });
    void sSet(SONGS_KEY, JSON.stringify(get().songs));
  },

  loadSong: (id) => {
    const song = get().songs.find((item) => item.id === id);
    if (!song) return;
    // Loading a song is asking for *that* tempo, so a running ramp would
    // immediately override it — switch the ramp off rather than surprise.
    get().update({
      bpm: song.bpm,
      meter: song.meter,
      accents: accentsFor(song.accents, song.meter),
      subdivision: song.subdivision,
      rampOn: false,
    });
  },

  removeSong: (id) => {
    set({ songs: get().songs.filter((song) => song.id !== id) });
    void sSet(SONGS_KEY, JSON.stringify(get().songs));
  },
}));

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// A slider drag is dozens of updates a second; the last one is the only one
// worth writing.
function persistSettings(settings: Settings): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void sSet(SETTINGS_KEY, JSON.stringify(settings)), 300);
}
