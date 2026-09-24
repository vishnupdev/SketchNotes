"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { outputName, outputsSupported, type ChosenOutput, type OutputTune } from "@/lib/WatchParty/outputs";
import { closeOutputMixer, outputMixer } from "@/lib/WatchParty/output-mixer";
import { StreamAudio, useVoiceStreams } from "@/components/WatchParty/molecules/VoiceOut";

/** One output: its chain in the mixer, played on the device it names. */
function OutputSink({ output }: { output: ChosenOutput }) {
  const notify = useWatchPartyStore((s) => s.notify);
  const name = outputName(output);
  const { id, volume, muted, delayMs, channel, hear, clearVoices, night } = output;
  const tune = useRef<OutputTune>(output);
  useEffect(() => {
    tune.current = output;
  });
  const [stream, setStream] = useState<MediaStream | null>(null);

  // The chain lives as long as the output is chosen and connected…
  useEffect(() => {
    setStream(outputMixer().tune(id, tune.current));
    return () => {
      outputMixer().remove(id);
      setStream(null);
    };
  }, [id]);

  // …and retuning it keeps the same stream, so the element is set up once.
  useEffect(() => {
    outputMixer().tune(id, { volume, muted, delayMs, channel, hear, clearVoices, night });
  }, [id, volume, muted, delayMs, channel, hear, clearVoices, night]);

  const onSinkError = useCallback(() => notify(`${name} couldn't be used. Check it is still connected.`), [notify, name]);
  return stream ? <StreamAudio stream={stream} volume={1} sinkId={id} onSinkError={onSinkError} /> : null;
}

/**
 * The room's sound on the extra speakers and headphones chosen in the Watch
 * tab. The film's tracks and the voices are fed into the OutputMixer, which
 * gives every output its own chain (delay, channels, clear voices, night mode,
 * volume); each chain ends in an `<audio>` element sent to that output.
 * Nothing here is visible; the choices live in the Speakers card.
 *
 * Also keeps the device list current, so headphones switched on mid-film pick
 * the room up at once and ones switched off drop out without an error.
 */
export function OutputsOut() {
  const outputs = useWatchPartyStore((s) => s.prefs.outputs);
  const devices = useWatchPartyStore((s) => s.devices);
  const tap = useWatchPartyStore((s) => s.tap);
  const volume = useWatchPartyStore((s) => (s.prefs.muted ? 0 : s.prefs.volume));
  const voiceVolume = useWatchPartyStore((s) => s.prefs.voiceVolume);
  const refreshDevices = useWatchPartyStore((s) => s.refreshDevices);
  const voices = useVoiceStreams();

  useEffect(() => {
    if (!outputsSupported()) return;
    void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  // Leaving the room closes the desk and every chain on it.
  useEffect(() => closeOutputMixer, []);

  const connected = useMemo(
    () => outputs.filter((o) => devices.some((d) => d.id === o.id)),
    [outputs, devices],
  );
  const active = connected.length > 0;

  useEffect(() => {
    if (active) outputMixer().setFilm(tap?.getAudioTracks() ?? []);
  }, [active, tap]);

  useEffect(() => {
    if (active) outputMixer().setVoices(voices.flatMap((v) => v.stream.getAudioTracks()));
  }, [active, voices]);

  useEffect(() => {
    if (active) outputMixer().setMaster(volume, voiceVolume);
  }, [active, volume, voiceVolume]);

  if (!active) return null;
  return (
    <div hidden>
      {connected.map((o) => (
        <OutputSink key={o.id} output={o} />
      ))}
    </div>
  );
}
