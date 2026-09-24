import type { OutputChannel, OutputTune } from "./outputs";

/**
 * The extra outputs' sound desk. One AudioContext for all of them; each chosen
 * output is a chain through it, ending in a MediaStream that an `<audio>`
 * element sends to that output with `setSinkId`:
 *
 *   film sources ─► film bus ─► film in ─┐
 *                                        ├► sum ► high-pass ► presence ► compressor
 *   voice sources ► voice bus ► voice in ┘      ► delay ► (mono ► merger) ► volume ► meter ► stream
 *
 * Going through an element rather than `AudioContext.setSinkId` keeps it
 * working wherever an element can choose its output, and lets one context feed
 * every output — so a delay set on one pair of headphones is exact against the
 * others, which is the whole point of having one.
 *
 * Effects that are switched off stay in the chain with neutral settings, so a
 * toggle never has to rewire anything and never clicks. Only the channel stage
 * is reconnected, and only when it changes.
 */

interface Chain {
  filmIn: GainNode;
  voiceIn: GainNode;
  sum: GainNode;
  highpass: BiquadFilterNode;
  presence: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  delay: DelayNode;
  mono: GainNode;
  merger: ChannelMergerNode;
  volume: GainNode;
  meter: AnalyserNode;
  dest: MediaStreamAudioDestinationNode;
  channel: OutputChannel | null;
  buf: Float32Array<ArrayBuffer>;
}

interface Source {
  track: MediaStreamTrack;
  node: MediaStreamAudioSourceNode;
}

/** Seconds a parameter takes to glide to a new value — fast, but never a click. */
const GLIDE = 0.03;

export class OutputMixer {
  private ctx: AudioContext | null = null;
  private filmBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private chains = new Map<string, Chain>();
  private film = new Map<string, Source>();
  private voices = new Map<string, Source>();
  private master = { film: 1, voice: 1 };

  private context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.filmBus = this.ctx.createGain();
      this.voiceBus = this.ctx.createGain();
      this.filmBus.gain.value = this.master.film;
      this.voiceBus.gain.value = this.master.voice;
    }
    return this.ctx;
  }

  /** Browsers start a context suspended until the page has been used. */
  resume(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume().catch(() => {});
  }

  /** The film's tracks, and the room's voices — replaced wholesale, diffed by id. */
  setFilm(tracks: MediaStreamTrack[]): void {
    this.setSources(this.film, tracks, () => this.filmBus!);
  }

  setVoices(tracks: MediaStreamTrack[]): void {
    this.setSources(this.voices, tracks, () => this.voiceBus!);
  }

  private setSources(map: Map<string, Source>, tracks: MediaStreamTrack[], bus: () => GainNode): void {
    const live = new Set(tracks.map((t) => t.id));
    for (const [id, source] of map) {
      if (!live.has(id)) {
        source.node.disconnect();
        map.delete(id);
      }
    }
    if (!tracks.length && !this.ctx) return;
    const ctx = this.context();
    for (const track of tracks) {
      if (map.has(track.id) || track.readyState === "ended") continue;
      try {
        const node = ctx.createMediaStreamSource(new MediaStream([track]));
        node.connect(bus());
        map.set(track.id, { track, node });
      } catch {
        /* a track the context can't read — its output simply stays quiet */
      }
    }
  }

  /** The room-wide levels: the transport's volume and the People tab's voice volume. */
  setMaster(film: number, voice: number): void {
    this.master = { film, voice };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.filmBus!.gain.setTargetAtTime(film, t, GLIDE);
    this.voiceBus!.gain.setTargetAtTime(voice, t, GLIDE);
  }

  /** Make or retune one output's chain. Returns the stream to play on it. */
  tune(id: string, tune: OutputTune): MediaStream {
    const ctx = this.context();
    let chain = this.chains.get(id);
    if (!chain) {
      chain = this.build(ctx);
      this.chains.set(id, chain);
    }
    const t = ctx.currentTime;
    const c = chain;

    c.filmIn.gain.setTargetAtTime(tune.hear === "voices" ? 0 : 1, t, GLIDE);
    c.voiceIn.gain.setTargetAtTime(tune.hear === "film" ? 0 : 1, t, GLIDE);

    // Clear voices: cut what sits under speech, lift the band that carries consonants.
    c.highpass.frequency.setTargetAtTime(tune.clearVoices ? 140 : 10, t, GLIDE);
    c.presence.gain.setTargetAtTime(tune.clearVoices ? 6 : 0, t, GLIDE);

    // Night mode: squeeze the loud parts down. The compressor adds its own
    // make-up gain (about +11 dB here), which is what lifts the quiet ones.
    c.compressor.threshold.setTargetAtTime(tune.night ? -24 : 0, t, GLIDE);
    c.compressor.ratio.setTargetAtTime(tune.night ? 4 : 1, t, GLIDE);
    c.compressor.knee.setTargetAtTime(tune.night ? 10 : 0, t, GLIDE);

    c.delay.delayTime.setTargetAtTime(Math.max(0, tune.delayMs) / 1000, t, GLIDE);
    c.volume.gain.setTargetAtTime(tune.muted ? 0 : tune.volume, t, GLIDE);

    if (c.channel !== tune.channel) this.route(c, tune.channel);
    return c.dest.stream;
  }

  private build(ctx: AudioContext): Chain {
    const filmIn = ctx.createGain();
    const voiceIn = ctx.createGain();
    const sum = ctx.createGain();
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 10;
    highpass.Q.value = 0.7;
    const presence = ctx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 2800;
    presence.Q.value = 0.9;
    presence.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = 0;
    compressor.ratio.value = 1;
    compressor.knee.value = 0;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.25;
    const delay = ctx.createDelay(1);
    // Mixing down needs an explicit single channel; "speakers" averages L and R.
    const mono = ctx.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = "explicit";
    mono.channelInterpretation = "speakers";
    const merger = ctx.createChannelMerger(2);
    const volume = ctx.createGain();
    const meter = ctx.createAnalyser();
    meter.fftSize = 512;
    const dest = ctx.createMediaStreamDestination();

    this.filmBus!.connect(filmIn);
    this.voiceBus!.connect(voiceIn);
    filmIn.connect(sum);
    voiceIn.connect(sum);
    sum.connect(highpass).connect(presence).connect(compressor).connect(delay);
    volume.connect(meter);
    volume.connect(dest);

    return {
      filmIn, voiceIn, sum, highpass, presence, compressor, delay, mono, merger, volume, meter, dest,
      channel: null,
      buf: new Float32Array(meter.fftSize),
    };
  }

  /** Reconnect the delay's output for a channel choice. */
  private route(c: Chain, channel: OutputChannel): void {
    c.delay.disconnect();
    c.mono.disconnect();
    c.merger.disconnect();
    if (channel === "stereo") {
      c.delay.connect(c.volume);
    } else {
      c.delay.connect(c.mono);
      if (channel === "mono") c.mono.connect(c.volume);
      else {
        c.mono.connect(c.merger, 0, channel === "left" ? 0 : 1);
        c.merger.connect(c.volume);
      }
    }
    c.channel = channel;
  }

  remove(id: string): void {
    const c = this.chains.get(id);
    if (!c) return;
    this.filmBus?.disconnect(c.filmIn);
    this.voiceBus?.disconnect(c.voiceIn);
    for (const node of [c.filmIn, c.voiceIn, c.sum, c.highpass, c.presence, c.compressor, c.delay, c.mono, c.merger, c.volume, c.meter]) {
      node.disconnect();
    }
    c.dest.stream.getTracks().forEach((t) => t.stop());
    this.chains.delete(id);
  }

  /** How loud an output is right now, 0–1 on a −60…0 dB scale. */
  level(id: string): number {
    const c = this.chains.get(id);
    if (!c) return 0;
    c.meter.getFloatTimeDomainData(c.buf);
    let sum = 0;
    for (const v of c.buf) sum += v * v;
    const rms = Math.sqrt(sum / c.buf.length);
    if (rms <= 0) return 0;
    return Math.min(1, Math.max(0, (20 * Math.log10(rms) + 60) / 60));
  }

  /**
   * A sound for lining outputs up or telling them apart, played into each
   * chain's own input — so it goes through that output's delay, channel and
   * volume exactly as the film does.
   *
   * - `sync`: three short clicks, the same instant on every output. Where they
   *   land apart, the early output wants more delay.
   * - `identify`: a two-note chime on the outputs named.
   */
  ping(ids: string[], kind: "sync" | "identify"): void {
    if (!this.ctx) return;
    this.resume();
    const ctx = this.ctx;
    const start = ctx.currentTime + 0.12;
    const notes =
      kind === "sync"
        ? [0, 0.6, 1.2].map((at) => ({ at, freq: 1760, length: 0.035, level: 0.5 }))
        : [
            { at: 0, freq: 660, length: 0.22, level: 0.28 },
            { at: 0.24, freq: 990, length: 0.32, level: 0.28 },
          ];
    for (const id of ids) {
      const c = this.chains.get(id);
      if (!c) continue;
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.frequency.value = n.freq;
        osc.type = kind === "sync" ? "square" : "sine";
        const t0 = start + n.at;
        env.gain.setValueAtTime(0, t0);
        env.gain.linearRampToValueAtTime(n.level, t0 + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.length);
        osc.connect(env).connect(c.sum);
        osc.start(t0);
        osc.stop(t0 + n.length + 0.02);
        osc.onended = () => env.disconnect();
      }
    }
  }

  /** Everything off — the room has closed. */
  dispose(): void {
    for (const id of [...this.chains.keys()]) this.remove(id);
    for (const s of [...this.film.values(), ...this.voices.values()]) s.node.disconnect();
    this.film.clear();
    this.voices.clear();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.filmBus = null;
    this.voiceBus = null;
  }
}

/* One desk per page, beside the store rather than in it — it holds live audio
   nodes, which nothing should compare or persist (as the room engines do). */
let mixer: OutputMixer | null = null;

export const outputMixer = (): OutputMixer => (mixer ??= new OutputMixer());

/** Close the desk if one was ever opened. */
export function closeOutputMixer(): void {
  mixer?.dispose();
  mixer = null;
}
