"use client";

import { useEffect, useMemo, useRef } from "react";
import { selectSilenceLocal, useWatchPartyStore } from "@/store/useWatchPartyStore";

type SinkableAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };

/**
 * One stream, playing — on the system's output, or on the output `sinkId`
 * names. The sink is set before the stream is attached, so a pair of
 * headphones never hears a blip of what was meant for the speaker.
 */
export function StreamAudio({
  stream,
  volume,
  sinkId,
  onSinkError,
}: {
  stream: MediaStream;
  volume: number;
  sinkId?: string;
  onSinkError?: () => void;
}) {
  const ref = useRef<SinkableAudio>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const start = async () => {
      if (sinkId && el.setSinkId) {
        try {
          await el.setSinkId(sinkId);
        } catch {
          if (!cancelled) onSinkError?.();
          return;
        }
      }
      if (cancelled) return;
      el.srcObject = stream;
      void el.play().catch(() => {});
    };
    void start();
    return () => {
      cancelled = true;
      el.srcObject = null;
    };
  }, [stream, sinkId, onSinkError]);
  useEffect(() => {
    if (ref.current) ref.current.volume = Math.min(1, Math.max(0, volume));
  }, [volume]);
  // Live sound has no caption file to attach; what is said is heard, not read.
  return <audio ref={ref} autoPlay />;
}

/** The room's voices as streams — each guest's mic on the host, the one mix on a guest. */
export function useVoiceStreams(): Array<{ id: string; stream: MediaStream }> {
  const role = useWatchPartyStore((s) => s.role);
  const voices = useWatchPartyStore((s) => s.voices);
  const remoteVoice = useWatchPartyStore((s) => s.remote.voice);
  return useMemo(
    () =>
      role === "host"
        ? voices.map((v) => ({ id: v.id, stream: new MediaStream([v.track]) }))
        : remoteVoice
          ? [{ id: "mix", stream: remoteVoice }]
          : [],
    [role, voices, remoteVoice],
  );
}

/**
 * The room's voices, made audible. The host hears each guest's microphone
 * directly; a guest hears the one mix the host builds for them (everyone but
 * themselves). Nothing here is visible — volume lives in the People tab.
 */
export function VoiceOut() {
  const streams = useVoiceStreams();
  const volume = useWatchPartyStore((s) => s.prefs.voiceVolume);
  // Moved to the listener's headphones along with the film (see OutputsOut).
  const silenced = useWatchPartyStore(selectSilenceLocal);

  return (
    <div hidden>
      {streams.map((s) => (
        <StreamAudio key={s.id} stream={s.stream} volume={silenced ? 0 : volume} />
      ))}
    </div>
  );
}
