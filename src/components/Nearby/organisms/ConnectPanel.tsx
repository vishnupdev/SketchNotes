"use client";

import { useEffect, useMemo, useState } from "react";
import type { NearbyDevice, PairableTransport } from "@/lib/nearby/discovery";
import { CONNECT_MEANING, type DeviceLink } from "@/lib/nearby/connect";
import { ConnectRow } from "@/components/Nearby/molecules/ConnectRow";
import { TRANSPORTS, TRANSPORT_ORDER } from "@/components/Nearby/atoms/transportMeta";
import { LinkDeviceIcon } from "@/components/SketchNotes/atoms/deviceIcons";

interface ConnectPanelProps {
  /** Only devices a link can actually be opened to. */
  devices: NearbyDevice[];
  openCount: number;
  link: (key: string) => DeviceLink;
  baudRate: (key: string) => number;
  onBaudRate: (key: string, rate: number) => void;
  onConnect: (key: string) => void;
  onDisconnect: (key: string) => void;
  onDisconnectAll: () => void;
  /** False when the browser has no pairable transport at all. */
  anySupport: boolean;
}

/**
 * The connect console: every device this page can open a session with, and the
 * state of that session.
 *
 * It is deliberately separate from the Detected list. That list answers "what is
 * around me" and never touches anything; this one *acts* — it opens real links
 * that reserve hardware from the rest of the machine. Keeping the two apart is
 * what stops an inspection tool from quietly becoming one that claims devices.
 *
 * Only the four chooser-backed transports appear. A microphone or a gamepad is
 * already attached and has no link to open, so listing it here with a dead
 * button would be worse than leaving it out.
 */
export function ConnectPanel({
  devices,
  openCount,
  link,
  baudRate,
  onBaudRate,
  onConnect,
  onDisconnect,
  onDisconnectAll,
  anySupport,
}: ConnectPanelProps) {
  // One timer for the whole list, and only while something is actually open —
  // an idle panel must not keep waking the machine up once a second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (openCount === 0) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [openCount]);

  const sorted = useMemo(
    () =>
      [...devices].sort(
        (a, b) =>
          TRANSPORT_ORDER.indexOf(a.transport) - TRANSPORT_ORDER.indexOf(b.transport) ||
          a.name.localeCompare(b.name),
      ),
    [devices],
  );

  // Explain only the transports actually on screen — the other three are noise.
  const present = useMemo(() => {
    const seen = new Set(sorted.map((d) => d.transport));
    return TRANSPORT_ORDER.filter(
      (t): t is PairableTransport => t in CONNECT_MEANING && seen.has(t),
    );
  }, [sorted]);

  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <LinkDeviceIcon size={18} />
        </span>
        <h2 className="text-[14px] font-bold tracking-tight">
          Available to connect
          <span className="ml-1.5 font-mono text-[11px] font-semibold text-ink-soft">
            {sorted.length}
          </span>
        </h2>

        {openCount > 0 && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11.5px] font-semibold text-success">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              {openCount} open
            </span>
            <button
              type="button"
              onClick={onDisconnectAll}
              className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Disconnect all
            </button>
          </div>
        )}
      </div>

      {sorted.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {sorted.map((device) => (
            <ConnectRow
              key={device.key}
              device={device}
              link={link(device.key)}
              now={now}
              baudRate={baudRate(device.key)}
              onBaudRate={(rate) => onBaudRate(device.key, rate)}
              onConnect={() => onConnect(device.key)}
              onDisconnect={() => onDisconnect(device.key)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <LinkDeviceIcon size={26} className="text-accent" />
          <p className="text-[13px] font-semibold">Nothing to connect to yet</p>
          <p className="max-w-[40ch] text-[11.5px] leading-relaxed text-ink-soft">
            {anySupport
              ? "Open one of the scanners above and pick a device — Bluetooth, USB, HID and serial devices land here with a Connect button. Cameras, microphones and controllers are already attached, so they have no link to open."
              : "This browser has no connectable transport. Chrome or Edge on desktop and Android support Web Bluetooth, WebUSB, WebHID and Web Serial."}
          </p>
        </div>
      )}

      {present.length > 0 && (
        <dl className="flex flex-col gap-1.5 border-t border-border pt-3">
          {present.map((t) => (
            <div key={t} className="flex flex-col gap-0.5 min-[560px]:flex-row min-[560px]:gap-2">
              <dt className="flex-none font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft min-[560px]:w-16 min-[560px]:pt-0.5">
                {TRANSPORTS[t].label}
              </dt>
              <dd className="text-[11px] leading-relaxed text-ink-soft">{CONNECT_MEANING[t]}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Connecting opens a real session and holds it until you disconnect. Nothing is written to any
        device, and every link is closed when you leave the page.
      </p>
    </section>
  );
}
