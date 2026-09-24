"use client";

import { useCallback, useId, useState } from "react";
import {
  MAX_DELAY_MS,
  MAX_NAME,
  outputName,
  type ChosenOutput,
  type OutputChannel,
  type OutputDevice,
  type OutputHear,
  type OutputTune,
} from "@/lib/WatchParty/outputs";
import { outputMixer } from "@/lib/WatchParty/output-mixer";
import { LevelMeter } from "@/components/WatchParty/atoms/LevelMeter";
import { Segmented } from "@/components/WatchParty/atoms/Segmented";
import { Switch } from "@/components/WatchParty/atoms/Switch";
import {
  BellIcon,
  BluetoothIcon,
  ChevronDownIcon,
  CloseIcon,
  MuteIcon,
  VolumeIcon,
} from "@/components/SketchNotes/atoms/icons";
import { btn, FIELD, ICON_BTN, LABEL } from "@/components/WatchParty/ui";
import { cx } from "@/lib/utils";

const CHANNELS: ReadonlyArray<{ id: OutputChannel; label: string }> = [
  { id: "stereo", label: "Stereo" },
  { id: "mono", label: "Mono" },
  { id: "left", label: "Left only" },
  { id: "right", label: "Right only" },
];

const HEARS: ReadonlyArray<{ id: OutputHear; label: string }> = [
  { id: "all", label: "Film + voices" },
  { id: "film", label: "Film only" },
  { id: "voices", label: "Voices only" },
];

const CHANNEL_WORD: Record<OutputChannel, string> = { stereo: "", mono: "mono", left: "left ear", right: "right ear" };
const HEAR_WORD: Record<OutputHear, string> = { all: "", film: "film only", voices: "voices only" };

/** What an output is doing, in a few words — so a closed row still says it all. */
function summary(output: ChosenOutput, connected: boolean): string {
  if (!connected) return "Not connected — it joins in when it's back";
  const parts = [output.muted ? "Muted" : "Playing"];
  if (output.delayMs) parts.push(`+${output.delayMs} ms`);
  if (CHANNEL_WORD[output.channel]) parts.push(CHANNEL_WORD[output.channel]);
  if (HEAR_WORD[output.hear]) parts.push(HEAR_WORD[output.hear]);
  if (output.clearVoices) parts.push("clear voices");
  if (output.night) parts.push("night mode");
  return parts.join(" · ");
}

/** Delay in 10 ms steps, with a slider for the big moves. */
function DelayControl({ value, name, onChange }: { value: number; name: string; onChange: (ms: number) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Delay · {value} ms
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(value - 10)}
          disabled={value <= 0}
          aria-label={`10 ms less delay on ${name}`}
          className={btn(false, true)}
        >
          −10
        </button>
        <input
          id={id}
          type="range"
          min={0}
          max={MAX_DELAY_MS}
          step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${value} milliseconds`}
          className="h-6 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <button
          type="button"
          onClick={() => onChange(value + 10)}
          disabled={value >= MAX_DELAY_MS}
          aria-label={`10 ms more delay on ${name}`}
          className={btn(false, true)}
        >
          +10
        </button>
      </div>
    </div>
  );
}

/**
 * One chosen output: what it is, whether sound is reaching it, its volume, and
 * behind Adjust the rest of its tuning — name, delay, channels, what it plays,
 * clear voices and night mode.
 */
export function OutputRow({
  output,
  device,
  onTune,
  onRemove,
  onIdentify,
}: {
  output: ChosenOutput;
  device: OutputDevice | undefined;
  onTune: (patch: Partial<OutputTune> & { name?: string }) => void;
  onRemove: () => void;
  onIdentify: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const nameId = useId();
  const connected = !!device;
  const name = outputName(output);
  const bluetooth = device?.bluetooth ?? /bluetooth|buds|airpods/i.test(output.label);
  const read = useCallback(() => outputMixer().level(output.id), [output.id]);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-paper p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={connected ? "text-accent" : "text-ink-soft"}>
          {bluetooth ? <BluetoothIcon size={17} /> : <VolumeIcon size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{name}</p>
          <p className="truncate text-[11.5px] text-ink-soft">{summary(output, connected)}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Stop playing on ${name}`}
          title="Remove"
          className={ICON_BTN}
        >
          <CloseIcon size={15} />
        </button>
      </div>

      {connected && <LevelMeter read={read} label={`Sound reaching ${name}`} />}

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(output.volume * 100)}
        onChange={(e) => onTune({ volume: Number(e.target.value) / 100, muted: false })}
        disabled={!connected}
        aria-label={`Volume on ${name}`}
        aria-valuetext={output.muted ? "Muted" : `${Math.round(output.volume * 100)}%`}
        className="h-6 w-full cursor-pointer accent-accent disabled:cursor-default disabled:opacity-40"
      />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onTune({ muted: !output.muted })}
          disabled={!connected}
          aria-pressed={output.muted}
          className={btn(output.muted, true)}
        >
          {output.muted ? <MuteIcon size={14} /> : <VolumeIcon size={14} />}
          {output.muted ? "Muted" : "Mute"}
        </button>
        <button
          type="button"
          onClick={onIdentify}
          disabled={!connected}
          aria-label={`Play a chime on ${name}`}
          className={btn(false, true)}
        >
          <BellIcon size={14} />
          Test
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className={btn(open, true)}
        >
          Adjust
          <ChevronDownIcon size={14} className={cx("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className={LABEL}>
              Name
            </label>
            <input
              id={nameId}
              value={output.name ?? ""}
              maxLength={MAX_NAME}
              placeholder={output.label}
              onChange={(e) => onTune({ name: e.target.value })}
              className={FIELD}
            />
          </div>

          <DelayControl value={output.delayMs} name={name} onChange={(delayMs) => onTune({ delayMs })} />

          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Channels</span>
            <Segmented
              label={`Channels on ${name}`}
              items={CHANNELS}
              value={output.channel}
              onChange={(channel) => onTune({ channel })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Plays</span>
            <Segmented
              label={`What ${name} plays`}
              items={HEARS}
              value={output.hear}
              onChange={(hear) => onTune({ hear })}
            />
          </div>

          <Switch
            label="Clear voices"
            detail="Cuts the rumble and lifts speech, for dialogue that gets lost under the music."
            checked={output.clearVoices}
            onChange={(clearVoices) => onTune({ clearVoices })}
          />
          <Switch
            label="Night mode"
            detail="Evens out loud and quiet, so explosions don't wake anyone and whispers stay audible."
            checked={output.night}
            onChange={(night) => onTune({ night })}
          />
        </div>
      )}
    </li>
  );
}
