"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";

/** One voice, playing. */
function VoiceAudio({ stream, volume }: { stream: MediaStream; volume: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);
  // Live speech has no caption file to attach; what is said is heard, not read.
  return <audio ref={ref} autoPlay />;
}

/**
 * The room's voices, made audible. The host hears each guest's microphone
 * directly; a guest hears the one mix the host builds for them (everyone but
 * themselves). Nothing here is visible — volume lives in the People tab.
 */
export function VoiceOut() {
  const role = useWatchPartyStore((s) => s.role);
  const voices = useWatchPartyStore((s) => s.voices);
  const remoteVoice = useWatchPartyStore((s) => s.remote.voice);
  const volume = useWatchPartyStore((s) => s.prefs.voiceVolume);

  const streams = useMemo(
    () =>
      role === "host"
        ? voices.map((v) => ({ id: v.id, stream: new MediaStream([v.track]) }))
        : remoteVoice
          ? [{ id: "mix", stream: remoteVoice }]
          : [],
    [role, voices, remoteVoice],
  );

  return (
    <div hidden>
      {streams.map((s) => (
        <VoiceAudio key={s.id} stream={s.stream} volume={volume} />
      ))}
    </div>
  );
}
