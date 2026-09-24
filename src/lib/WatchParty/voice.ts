import { measureLoudness } from "@/lib/audio-level";

/**
 * Voice chat through the hub.
 *
 * In a star, guests cannot hear each other directly — every voice has to go
 * through the host. Forwarding each voice separately would give every guest one
 * incoming track per person in the room. Instead the host **mixes**: for each
 * guest it builds one track holding everybody *except that guest* (a
 * "mix-minus", the arrangement a radio phone-in uses so a caller never hears
 * their own echo back). One voice track per guest, whatever the room's size.
 *
 * The same graph measures everyone's level, which is how the room knows who is
 * talking — the host sends the list out, so a guest's speaking ring lights up on
 * every screen, including their own.
 */

/** Below this RMS level a microphone counts as quiet. Speech sits around −30 dBFS;
 *  a noise-suppressed silent room well under −60. */
export const SPEAKING_DB = -45;

/** How long someone still "is talking" after they go quiet, so the ring does
 *  not flicker between words. */
export const HANGOVER_MS = 700;

interface Source {
  node: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buf: Float32Array<ArrayBuffer>;
  track: MediaStreamTrack;
}

interface Output {
  dest: MediaStreamAudioDestinationNode;
  wired: Set<string>;
}

export class VoiceMixer {
  private ctx: AudioContext | null = null;
  private sources = new Map<string, Source>();
  private outputs = new Map<string, Output>();

  private context(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /** Browsers start an AudioContext suspended until a gesture; call from one. */
  resume(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume().catch(() => {});
  }

  /** Put a member's microphone into the mix (or take it out, with null). */
  setSource(id: string, track: MediaStreamTrack | null): void {
    const current = this.sources.get(id);
    if (current?.track === track) return;
    if (current) {
      current.node.disconnect();
      this.sources.delete(id);
      for (const out of this.outputs.values()) out.wired.delete(id);
    }
    if (track) {
      const ctx = this.context();
      const node = ctx.createMediaStreamSource(new MediaStream([track]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      node.connect(analyser);
      this.sources.set(id, { node, analyser, buf: new Float32Array(analyser.fftSize), track });
    }
    this.rewire();
  }

  /** The mix a member hears: everyone but themselves. Created on first ask. */
  output(id: string): MediaStreamTrack {
    let out = this.outputs.get(id);
    if (!out) {
      out = { dest: this.context().createMediaStreamDestination(), wired: new Set() };
      this.outputs.set(id, out);
      this.rewire();
    }
    return out.dest.stream.getAudioTracks()[0];
  }

  removeOutput(id: string): void {
    const out = this.outputs.get(id);
    if (!out) return;
    for (const src of out.wired) this.sources.get(src)?.node.disconnect(out.dest);
    out.dest.stream.getTracks().forEach((t) => t.stop());
    this.outputs.delete(id);
  }

  /** Make every output hear exactly the sources that are not its own. */
  private rewire(): void {
    for (const [outId, out] of this.outputs) {
      for (const [srcId, src] of this.sources) {
        const want = srcId !== outId;
        if (want && !out.wired.has(srcId)) {
          src.node.connect(out.dest);
          out.wired.add(srcId);
        } else if (!want && out.wired.has(srcId)) {
          src.node.disconnect(out.dest);
          out.wired.delete(srcId);
        }
      }
    }
  }

  /** Current RMS level of every source, in dBFS. */
  levels(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [id, src] of this.sources) {
      src.analyser.getFloatTimeDomainData(src.buf);
      result.set(id, measureLoudness(src.buf).rms);
    }
    return result;
  }

  close(): void {
    for (const id of [...this.outputs.keys()]) this.removeOutput(id);
    for (const src of this.sources.values()) src.node.disconnect();
    this.sources.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/**
 * Levels in, "who is talking" out — with a hangover so a pause between words
 * does not switch the ring off. Pure, apart from the clock it is handed.
 */
export class SpeakingDetector {
  private lastLoud = new Map<string, number>();

  update(levels: Map<string, number>, t: number): string[] {
    for (const [id, db] of levels) if (db > SPEAKING_DB) this.lastLoud.set(id, t);
    const speaking: string[] = [];
    for (const [id, at] of this.lastLoud) {
      if (!levels.has(id) || t - at > HANGOVER_MS) this.lastLoud.delete(id);
      else speaking.push(id);
    }
    return speaking.sort();
  }
}

/** Open the microphone for talking — echo cancelled, since the film is playing. */
export async function openMic(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  return stream.getAudioTracks()[0];
}

/** Why the microphone would not open, in words. */
export function micError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access was blocked. Allow it in the browser's site settings to talk.";
  }
  if (name === "NotFoundError") return "No microphone was found on this device.";
  if (name === "NotReadableError") return "The microphone is in use by another app.";
  return "The microphone couldn't be opened.";
}
