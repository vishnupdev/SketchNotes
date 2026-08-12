"use client";

import { cx } from "@/lib/utils";
import type { NearbyDevice, Transport } from "@/lib/nearby/discovery";
import { useDeviceGatt } from "@/hooks/useDeviceGatt";
import { SignalBars } from "@/components/Nearby/atoms/SignalBars";
import { TRANSPORTS } from "@/components/Nearby/atoms/transportMeta";
import { GattTable } from "@/components/Nearby/molecules/GattTable";
import { PadView } from "@/components/Nearby/molecules/PadView";
import { SpecSheet } from "@/components/Nearby/molecules/SpecSheet";
import { LinkDeviceIcon, RadarIcon } from "@/components/SketchNotes/atoms/deviceIcons";
import { ChevronLeftIcon } from "@/components/SketchNotes/atoms/icons";

/** Where each transport's information comes from, and what it can't tell us. */
const PROVENANCE: Record<Transport, string> = {
  bluetooth:
    "A Bluetooth device only reveals its name and id until you connect: everything it can do lives in its GATT table, which is read on request above.",
  usb: "Read straight from the USB descriptor — the device is not opened and no interface is claimed, so nothing here interrupts whatever it is already doing.",
  hid: "Read from the HID report descriptor. It describes every input the device can send, which is why a keyboard lists far more than keys.",
  serial: "A serial port exposes only its USB vendor and product ids; anything more would mean opening the port and talking to whatever is on the other end.",
  gamepad: "Live from the Gamepad API. Values are sampled while this view is open and stop the moment you leave it.",
  mic: "From the Media Devices API. Detailed capabilities — sample rates, channels, processing — appear once this site has microphone permission.",
  speaker:
    "From the Media Devices API. Output devices report little beyond their name and group; browsers keep speaker details minimal.",
  camera:
    "From the Media Devices API. Resolutions, frame rates and facing mode appear once this site has camera permission.",
};

/**
 * One device's full sheet: what it is, everything its transport will say about
 * it, and the actions that can learn more — a GATT walk for Bluetooth, the live
 * input view for a controller.
 *
 * The `onBack` control only exists below the two-column breakpoint, where this
 * pane replaces the list rather than sitting beside it.
 */
export function DeviceDetail({
  device,
  onBack,
}: {
  device: NearbyDevice;
  onBack: () => void;
}) {
  const meta = TRANSPORTS[device.transport];
  const isBluetooth = device.transport === "bluetooth";
  const gatt = useDeviceGatt(isBluetooth ? device.key : null);
  const standardPad = device.spec?.some((g) =>
    g.fields.some((f) => f.label === "Mapping" && f.value === "Standard layout"),
  );

  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-panel p-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-1 text-[12px] font-semibold text-ink-soft hover:text-accent min-[900px]:hidden"
      >
        <ChevronLeftIcon size={15} />
        All devices
      </button>

      <header className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-accent text-on-accent">
          <meta.Icon size={21} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="wrap-break-word text-[17px] font-bold leading-tight tracking-tight">
            {device.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-ink-soft">
              {meta.long}
            </span>
            <span className="text-[11.5px] text-ink-soft">via {meta.api}</span>
            {device.connected != null && (
              <span
                className={cx(
                  "text-[11.5px] font-semibold",
                  device.connected ? "text-success" : "text-ink-soft",
                )}
              >
                {device.connected ? "Connected" : "Not connected"}
              </span>
            )}
            {device.rssi != null && <SignalBars rssi={device.rssi} />}
          </div>
        </div>
      </header>

      {/* Bluetooth's features are only knowable over a live link, so the read is
          an explicit action rather than something that happens on selection. */}
      {isBluetooth && (
        <div className="flex flex-col gap-2.5">
          {!gatt.report && (
            <button
              type="button"
              onClick={() => void gatt.read()}
              disabled={gatt.reading || !gatt.supported}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {gatt.reading ? (
                <RadarIcon size={15} className="motion-safe:animate-spin" />
              ) : (
                <LinkDeviceIcon size={15} />
              )}
              {gatt.reading ? "Connecting…" : "Connect & read features"}
            </button>
          )}

          {!gatt.supported && (
            <p className="text-[11.5px] leading-relaxed text-ink-soft">
              This device came from an earlier page load, so its connection handle is gone. Pick it
              from the Bluetooth scanner again to read its services.
            </p>
          )}

          {gatt.error && (
            <p
              role="alert"
              className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] font-medium text-danger"
            >
              {gatt.error}
            </p>
          )}

          {gatt.report && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11.5px] text-ink-soft">
                  Read over GATT, then disconnected — the link isn&apos;t held open.
                </p>
                <button
                  type="button"
                  onClick={() => void gatt.read()}
                  disabled={gatt.reading}
                  className="rounded-full border border-border bg-paper px-2.5 py-1 text-[11.5px] font-semibold hover:border-accent hover:text-accent disabled:opacity-55"
                >
                  {gatt.reading ? "Reading…" : "Read again"}
                </button>
              </div>
              <GattTable report={gatt.report} />
            </>
          )}
        </div>
      )}

      {device.padIndex != null && (
        <PadView padIndex={device.padIndex} standard={standardPad ?? false} />
      )}

      {device.spec && device.spec.length > 0 ? (
        <SpecSheet groups={device.spec} />
      ) : (
        <p className="text-[12px] text-ink-soft">
          This transport reports nothing beyond the name above.
        </p>
      )}

      <p className="border-t border-border pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        {PROVENANCE[device.transport]}
      </p>
    </section>
  );
}
