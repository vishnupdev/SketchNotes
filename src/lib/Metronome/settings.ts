import { CLICK_SOUNDS, type ClickSound } from "./engine";
import {
  ACCENT_ORDER,
  BPM_MAX,
  BPM_MIN,
  clampBpm,
  defaultAccents,
  METERS,
  SUBDIVISIONS,
  type Accent,
  type Gap,
  type Meter,
  type Ramp,
  type Subdivision,
} from "./rhythm";

/** A tempo setup kept under a name — a song, an exercise, a set list entry. */
export interface Song {
  id: string;
  name: string;
  bpm: number;
  meter: Meter;
  accents: Accent[];
  subdivision: Subdivision;
}

/** Everything the Beat and Trainer tabs remember between visits. */
export interface Settings {
  bpm: number;
  meter: Meter;
  accents: Accent[];
  subdivision: Subdivision;
  sound: ClickSound;
  volume: number;
  rampOn: boolean;
  ramp: Ramp;
  gapOn: boolean;
  gap: Gap;
}

export const DEFAULT_SETTINGS: Settings = {
  bpm: 100,
  meter: { beats: 4, unit: 4 },
  accents: defaultAccents({ beats: 4, unit: 4 }),
  subdivision: 1,
  sound: "click",
  volume: 0.8,
  rampOn: false,
  ramp: { from: 80, to: 120, step: 4, everyBars: 4 },
  gapOn: false,
  gap: { play: 4, rest: 2 },
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const int = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

function meterFrom(v: unknown): Meter {
  if (isObject(v)) {
    const found = METERS.find((m) => m.beats === v.beats && m.unit === v.unit);
    if (found) return found;
  }
  return DEFAULT_SETTINGS.meter;
}

/** Accents that fit the metre — too few are padded with the default, too many trimmed. */
export function accentsFor(v: unknown, meter: Meter): Accent[] {
  const fallback = defaultAccents(meter);
  if (!Array.isArray(v)) return fallback;
  return fallback.map((d, i) => (ACCENT_ORDER.includes(v[i] as Accent) ? (v[i] as Accent) : d));
}

const subdivisionFrom = (v: unknown): Subdivision =>
  SUBDIVISIONS.includes(v as Subdivision) ? (v as Subdivision) : 1;

/** Coerce an untrusted stored value into complete, playable settings. */
export function normalizeSettings(raw: unknown): Settings {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  const meter = meterFrom(raw.meter);
  const ramp = isObject(raw.ramp) ? raw.ramp : {};
  const gap = isObject(raw.gap) ? raw.gap : {};
  return {
    bpm: typeof raw.bpm === "number" ? clampBpm(raw.bpm) : d.bpm,
    meter,
    accents: accentsFor(raw.accents, meter),
    subdivision: subdivisionFrom(raw.subdivision),
    sound: CLICK_SOUNDS.some((s) => s.id === raw.sound) ? (raw.sound as ClickSound) : d.sound,
    volume:
      typeof raw.volume === "number" && Number.isFinite(raw.volume)
        ? Math.min(1, Math.max(0, raw.volume))
        : d.volume,
    rampOn: raw.rampOn === true,
    ramp: {
      from: int(ramp.from, BPM_MIN, BPM_MAX, d.ramp.from),
      to: int(ramp.to, BPM_MIN, BPM_MAX, d.ramp.to),
      step: int(ramp.step, 1, 50, d.ramp.step),
      everyBars: int(ramp.everyBars, 1, 64, d.ramp.everyBars),
    },
    gapOn: raw.gapOn === true,
    gap: {
      play: int(gap.play, 1, 32, d.gap.play),
      rest: int(gap.rest, 1, 32, d.gap.rest),
    },
  };
}

/** Coerce a stored song list, dropping anything that is not recognisably a song. */
export function normalizeSongs(raw: unknown): Song[] {
  if (!Array.isArray(raw)) return [];
  const out: Song[] = [];
  for (const item of raw) {
    if (!isObject(item) || typeof item.id !== "string" || typeof item.name !== "string") continue;
    const meter = meterFrom(item.meter);
    out.push({
      id: item.id,
      name: item.name.slice(0, 80) || "Untitled",
      bpm: typeof item.bpm === "number" ? clampBpm(item.bpm) : DEFAULT_SETTINGS.bpm,
      meter,
      accents: accentsFor(item.accents, meter),
      subdivision: subdivisionFrom(item.subdivision),
    });
  }
  return out;
}

export const SUBDIVISION_LABELS: Record<Subdivision, { label: string; hint: string }> = {
  1: { label: "Beats", hint: "One click per beat" },
  2: { label: "Eighths", hint: "Two clicks per beat" },
  3: { label: "Triplets", hint: "Three clicks per beat" },
  4: { label: "Sixteenths", hint: "Four clicks per beat" },
};

/** "120 · 4/4 · eighths" — a song's one-line summary. */
export function describeSong(song: Pick<Song, "bpm" | "meter" | "subdivision">): string {
  const parts = [`${song.bpm} BPM`, `${song.meter.beats}/${song.meter.unit}`];
  if (song.subdivision > 1) parts.push(SUBDIVISION_LABELS[song.subdivision].label.toLowerCase());
  return parts.join(" · ");
}
