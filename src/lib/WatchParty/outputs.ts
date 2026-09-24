/**
 * Extra speakers and headphones — the room's sound played on several audio
 * outputs of this one device at once, so two people with Bluetooth headphones
 * can share a laptop without sharing an earbud.
 *
 * A browser cannot pair a Bluetooth device itself (Web Bluetooth speaks GATT,
 * not the audio profiles headphones use). What it can do, once the system has
 * paired them, is list them as audio outputs and send an `<audio>` element to
 * any one of them with `setSinkId`. So "adding" a device here means choosing an
 * output the system already has; each chosen output gets its own chain in the
 * OutputMixer (`output-mixer.ts`) and its own `<audio>` element at the end of it.
 *
 * Bluetooth carries sound only. The picture stays on this screen.
 */

export interface OutputDevice {
  id: string;
  label: string;
  /** The output the system is using right now — where the player already plays. */
  isDefault: boolean;
  /** A guess from the name; browsers do not say how an output is connected. */
  bluetooth: boolean;
}

/** Which ears an output plays to. `left`/`right` send a mono mix to one side. */
export type OutputChannel = "stereo" | "mono" | "left" | "right";
/** What an output plays — the film, the room's voices, or both. */
export type OutputHear = "all" | "film" | "voices";

/** How one output is tuned. Everything here is this device's own business. */
export interface OutputTune {
  volume: number;
  muted: boolean;
  /** Held back by this long, to line up with slower Bluetooth devices. */
  delayMs: number;
  channel: OutputChannel;
  hear: OutputHear;
  /** Lift speech out of the mix: cut the rumble, raise the presence band. */
  clearVoices: boolean;
  /** Even out loud and quiet: a compressor with make-up gain. */
  night: boolean;
}

/** An output this device has been told to play the room on. */
export interface ChosenOutput extends OutputTune {
  id: string;
  /** Remembered so a device that is switched off can still be named. */
  label: string;
  /** The listener's own name for it — "Mum's headphones". */
  name?: string;
}

export const MAX_OUTPUTS = 6;
export const MAX_DELAY_MS = 800;
export const MAX_NAME = 40;

export const DEFAULT_TUNE: OutputTune = {
  volume: 1,
  muted: false,
  delayMs: 0,
  channel: "stereo",
  hear: "all",
  clearVoices: false,
  night: false,
};

/** What an output is called on screen. */
export const outputName = (o: Pick<ChosenOutput, "label" | "name">): string => o.name?.trim() || o.label;

export const clampDelay = (ms: number): number =>
  Number.isFinite(ms) ? Math.min(MAX_DELAY_MS, Math.max(0, Math.round(ms))) : 0;

/** The pseudo-devices Chrome lists alongside the real ones. */
const ALIASES = new Set(["", "default", "communications"]);

const BLUETOOTH_HINT =
  /bluetooth|\bbt\b|airpods|buds|beats|jbl|bose|sony|wh-|wf-|sennheiser|jabra|skullcandy|anker|soundcore|hands-?free|headset|a2dp/i;

type DeviceLike = Pick<MediaDeviceInfo, "deviceId" | "groupId" | "kind" | "label">;

/** The real audio outputs in a device list, default first. */
export function toOutputs(devices: DeviceLike[]): OutputDevice[] {
  const outs = devices.filter((d) => d.kind === "audiooutput");
  const fallback = outs.find((d) => d.deviceId === "default");
  const real = outs.filter((d) => !ALIASES.has(d.deviceId));
  return real
    .map((d, i) => ({
      id: d.deviceId,
      label: d.label.trim() || `Audio output ${i + 1}`,
      isDefault: !!fallback && !!d.groupId && d.groupId === fallback.groupId,
      bluetooth: BLUETOOTH_HINT.test(d.label),
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** Whether this browser can send sound to an output of its choosing. */
export function outputsSupported(): boolean {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.enumerateDevices
  );
}

/**
 * This device's outputs. `named` is false while the browser is still hiding
 * them — it then lists at most a nameless placeholder, which is not choosable.
 */
export async function listOutputs(): Promise<{ devices: OutputDevice[]; named: boolean }> {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    const named = all.some((d) => d.kind === "audiooutput" && !ALIASES.has(d.deviceId) && d.label.trim() !== "");
    return { devices: named ? toOutputs(all) : [], named };
  } catch {
    return { devices: [], named: false };
  }
}

type SelectAudioOutput = (options?: { deviceId?: string }) => Promise<MediaDeviceInfo>;

/**
 * Ask for the outputs' names. Browsers hide them until the page is trusted:
 * Firefox shows its own picker (`selectAudioOutput`) and returns the one
 * chosen; Chrome and Edge reveal every output once microphone access has been
 * granted, so the mic is opened and closed at once — nothing is recorded.
 *
 * Resolves to the id the picker returned, if there was one.
 */
export async function revealOutputs(): Promise<string | null> {
  const md = navigator.mediaDevices as MediaDevices & { selectAudioOutput?: SelectAudioOutput };
  if (typeof md.selectAudioOutput === "function") {
    const picked = await md.selectAudioOutput();
    return picked.deviceId;
  }
  const stream = await md.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
  return null;
}

/** Why the outputs couldn't be listed, in words. */
export function outputsError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError") {
    return "The browser wasn't allowed to list your speakers and headphones. Allow it from the address bar and try again.";
  }
  if (name === "NotFoundError") return "No audio outputs were found. Pair the device in your system's Bluetooth settings first.";
  return "Your speakers and headphones couldn't be listed.";
}

const CHANNELS: OutputChannel[] = ["stereo", "mono", "left", "right"];
const HEARS: OutputHear[] = ["all", "film", "voices"];

/** Clamp a stored list back into shape — ids unique, volumes in range, capped. */
export function cleanOutputs(raw: unknown): ChosenOutput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ChosenOutput[] = [];
  for (const entry of raw) {
    const o = entry as Partial<ChosenOutput> | null;
    if (!o || typeof o.id !== "string" || ALIASES.has(o.id) || seen.has(o.id)) continue;
    seen.add(o.id);
    const v = typeof o.volume === "number" && Number.isFinite(o.volume) ? Math.min(1, Math.max(0, o.volume)) : 1;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, MAX_NAME) : "";
    out.push({
      ...DEFAULT_TUNE,
      id: o.id,
      label: typeof o.label === "string" ? o.label.slice(0, 120) : "Audio output",
      ...(name ? { name } : {}),
      volume: v,
      muted: o.muted === true,
      delayMs: typeof o.delayMs === "number" ? clampDelay(o.delayMs) : 0,
      channel: CHANNELS.includes(o.channel as OutputChannel) ? (o.channel as OutputChannel) : "stereo",
      hear: HEARS.includes(o.hear as OutputHear) ? (o.hear as OutputHear) : "all",
      clearVoices: o.clearVoices === true,
      night: o.night === true,
    });
    if (out.length >= MAX_OUTPUTS) break;
  }
  return out;
}
