"use client";

import { useEffect, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { MAX_OUTPUTS, outputsSupported } from "@/lib/WatchParty/outputs";
import { Switch } from "@/components/WatchParty/atoms/Switch";
import { OutputRow } from "@/components/WatchParty/molecules/OutputRow";
import { BluetoothIcon, PlusIcon, RefreshIcon, TuningForkIcon, VolumeIcon } from "@/components/SketchNotes/atoms/icons";
import { BTN, btn, CARD, ICON_BTN, LABEL, SECTION_TITLE } from "@/components/WatchParty/ui";
import { cx } from "@/lib/utils";

/**
 * Speakers & headphones — the Watch tab's card for playing the room on more
 * than one audio output of this device at once: two pairs of Bluetooth
 * headphones on one laptop, or the TV's speaker bar plus someone's earbuds.
 * Each output is tuned on its own (OutputRow); Sync check lines them up.
 *
 * Choosing is all it does; the playing happens in OutputsOut, which stays
 * mounted while this tab is closed.
 */
export function OutputsCard() {
  const item = useWatchPartyStore((s) => s.room?.now ?? null);
  const outputs = useWatchPartyStore((s) => s.prefs.outputs);
  const localSpeaker = useWatchPartyStore((s) => s.prefs.localSpeaker);
  const devices = useWatchPartyStore((s) => s.devices);
  const listed = useWatchPartyStore((s) => s.devicesListed);
  const busy = useWatchPartyStore((s) => s.devicesBusy);
  const tap = useWatchPartyStore((s) => s.tap);
  const findDevices = useWatchPartyStore((s) => s.findDevices);
  const refreshDevices = useWatchPartyStore((s) => s.refreshDevices);
  const addOutput = useWatchPartyStore((s) => s.addOutput);
  const removeOutput = useWatchPartyStore((s) => s.removeOutput);
  const tuneOutput = useWatchPartyStore((s) => s.tuneOutput);
  const pingOutputs = useWatchPartyStore((s) => s.pingOutputs);
  const setPrefs = useWatchPartyStore((s) => s.setPrefs);

  // Known only after mount — the server has no idea what this browser can do.
  const [support, setSupport] = useState<{ ok: boolean; picker: boolean } | null>(null);
  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    setSupport({ ok: outputsSupported(), picker: !!md && "selectAudioOutput" in md });
  }, []);

  if (!support) return null;

  const chosen = new Set(outputs.map((o) => o.id));
  // The system output already plays the room, so it is not offered again.
  const available = devices.filter((d) => !chosen.has(d.id) && !d.isDefault);
  const full = outputs.length >= MAX_OUTPUTS;
  const connectedIds = outputs.filter((o) => devices.some((d) => d.id === o.id)).map((o) => o.id);
  const anyConnected = connectedIds.length > 0;

  let soundNote = "";
  if (outputs.length && item) {
    if (item.kind === "youtube") {
      soundNote =
        "YouTube plays inside its own frame, so its sound stays on this device's own output. Voices still reach every output.";
    } else if (!tap && item.kind !== "screen") {
      soundNote = "This browser can't copy this film's sound to other outputs — Chrome or Edge can. Voices still reach them.";
    } else if (!tap) {
      soundNote = "The shared screen has no sound to send.";
    }
  }

  return (
    <section className={CARD} aria-labelledby="party-outputs">
      <div className="flex items-center gap-2">
        <BluetoothIcon size={18} className="text-ink-soft" />
        <h3 id="party-outputs" className={cx(SECTION_TITLE, "flex-1")}>
          Speakers &amp; headphones
        </h3>
        {support.ok && listed && !support.picker && (
          <button
            type="button"
            onClick={() => void refreshDevices()}
            aria-label="Look for speakers and headphones again"
            title="Refresh"
            className={ICON_BTN}
          >
            <RefreshIcon size={15} />
          </button>
        )}
      </div>

      {!support.ok ? (
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          This browser can&apos;t choose where sound plays. Chrome or Edge on a computer can play the room on
          several Bluetooth headphones and speakers at once; here, pick one output in your system&apos;s sound
          settings.
        </p>
      ) : (
        <>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Play the room on several headphones or speakers at once, each tuned on its own. Pair them in your
            system&apos;s Bluetooth settings first, then add them here.
          </p>

          {outputs.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Playing on">
              {outputs.map((o) => (
                <OutputRow
                  key={o.id}
                  output={o}
                  device={devices.find((d) => d.id === o.id)}
                  onTune={(patch) => tuneOutput(o.id, patch)}
                  onRemove={() => removeOutput(o.id)}
                  onIdentify={() => pingOutputs([o.id], "identify")}
                />
              ))}
            </ul>
          )}

          {soundNote && (
            <p role="status" className="text-[12px] leading-relaxed text-ink-soft">
              {soundNote}
            </p>
          )}

          {connectedIds.length > 1 && (
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx(LABEL, "flex-1")}>Line them up</span>
                <button type="button" onClick={() => pingOutputs(connectedIds, "sync")} className={btn(false, true)}>
                  <TuningForkIcon size={14} />
                  Sync check
                </button>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-soft">
                Plays three clicks on every output at the same instant. Bluetooth runs late, so the output you
                hear click first wants more delay — raise it under Adjust until the clicks land together.
              </p>
            </div>
          )}

          {support.picker ? (
            <button
              type="button"
              onClick={() => void findDevices()}
              disabled={busy || full}
              className={cx(BTN, "self-start")}
            >
              <PlusIcon size={15} />
              {outputs.length ? "Add another output" : "Choose an output"}
            </button>
          ) : !listed ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void findDevices()}
                disabled={busy}
                className={cx(BTN, "self-start")}
              >
                <BluetoothIcon size={15} />
                {busy ? "Looking…" : "Find my devices"}
              </button>
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                The browser asks for the microphone once, only to show your devices&apos; names — nothing is
                recorded, and the mic closes straight away.
              </p>
            </div>
          ) : available.length ? (
            <div className="flex flex-col gap-2">
              <span className={LABEL}>Add an output</span>
              <ul className="flex flex-wrap gap-2">
                {available.map((d) => (
                  <li key={d.id} className="min-w-0 max-w-full">
                    <button
                      type="button"
                      onClick={() => addOutput(d)}
                      disabled={full}
                      aria-label={`Also play on ${d.label}`}
                      className={cx(btn(), "max-w-full")}
                    >
                      {d.bluetooth ? <BluetoothIcon size={17} /> : <VolumeIcon size={17} />}
                      <span className="truncate">{d.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-ink-soft">
              {outputs.length
                ? "Every other output is already playing."
                : "Only this device's own output was found. Switch the headphones on, pair them, then refresh."}
            </p>
          )}

          {outputs.length > 0 && (
            <Switch
              label="Also play on this device"
              detail={
                localSpeaker
                  ? "The system's own speaker keeps playing too."
                  : anyConnected
                    ? "Only the outputs above are playing."
                    : "Plays here until one of the outputs above is connected."
              }
              checked={localSpeaker}
              onChange={(v) => setPrefs({ localSpeaker: v })}
            />
          )}
        </>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Bluetooth carries sound only — the picture stays on this screen. To watch on another screen, invite that
        device from People. Delay can only hold an output back, so it lines outputs up with each other, not with
        the picture.
      </p>
    </section>
  );
}
