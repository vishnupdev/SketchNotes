"use client";

import { cx } from "@/lib/utils";
import { useNearbyDevices } from "@/hooks/useNearbyDevices";
import type { PairableTransport } from "@/lib/SystemInfo/nearby";
import { DeviceRow } from "@/components/SystemInfo/molecules/DeviceRow";
import { RefreshIcon } from "@/components/SystemInfo/atoms/liveIcons";
import {
  BluetoothIcon,
  CastIcon,
  KeyboardIcon,
  PortIcon,
  RadarIcon,
  UsbIcon,
} from "@/components/SystemInfo/atoms/nearbyIcons";

/** The four transports that discover through a browser-owned device chooser. */
const PAIRABLE: {
  id: PairableTransport;
  label: string;
  api: string;
  Icon: typeof UsbIcon;
}[] = [
  { id: "bluetooth", label: "Bluetooth", api: "Web Bluetooth", Icon: BluetoothIcon },
  { id: "usb", label: "USB", api: "WebUSB", Icon: UsbIcon },
  { id: "hid", label: "HID", api: "WebHID", Icon: KeyboardIcon },
  { id: "serial", label: "Serial", api: "Web Serial", Icon: PortIcon },
];

const panel = "flex flex-col gap-3.5 rounded-2xl border border-border bg-panel p-4";
const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:text-text";

/** One status line: label on the left, state on the right. */
function Status({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "off";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] font-medium text-ink-soft">{label}</span>
      <span
        className={cx(
          "text-[12.5px] font-semibold",
          tone === "good" ? "text-success" : tone === "off" ? "text-ink-soft" : "text-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Nearby Devices — discovers the peripherals and displays around this machine
 * through every route the web platform allows: already-granted Bluetooth, USB,
 * HID and serial devices, attached audio/video hardware, connected gamepads,
 * cast-capable screens on the network, and (where Chrome enables it) a live BLE
 * advertisement scan. Everything is read on-device; nothing is transmitted.
 *
 * The panel is explicit about the platform's consent model rather than pretending
 * to sweep silently: a browser only reveals a peripheral once the user has picked
 * it from the browser's own scanner.
 */
export function NearbyDevices() {
  const {
    support,
    adapter,
    castAvailable,
    devices,
    namesHidden,
    scanning,
    pending,
    leScanning,
    error,
    rescan,
    pair,
    toggleLeScan,
    revealNames,
  } = useNearbyDevices();

  const available = PAIRABLE.filter((t) => support[t.id]);
  const missing = PAIRABLE.filter((t) => !support[t.id]);

  return (
    <div className="grid grid-cols-1 gap-4 min-[880px]:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {/* ----------------------------- discovery ---------------------------- */}
      <section className={panel}>
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <RadarIcon size={18} />
          </span>
          <h3 className="text-[14px] font-bold tracking-tight">Discovery</h3>
          <button
            type="button"
            onClick={rescan}
            disabled={scanning}
            aria-label="Re-scan for nearby devices"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:opacity-55"
          >
            <RefreshIcon size={14} className={scanning ? "motion-safe:animate-spin" : undefined} />
            {scanning ? "Scanning…" : "Re-scan"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Status
            label="Bluetooth radio"
            value={
              !support.bluetooth
                ? "Not supported"
                : adapter === true
                  ? "Available"
                  : adapter === false
                    ? "Off or absent"
                    : "Unknown"
            }
            tone={adapter === true ? "good" : adapter === false || !support.bluetooth ? "off" : "neutral"}
          />
          <Status
            label="Cast-capable displays"
            value={
              !support.cast
                ? "Not supported"
                : castAvailable === true
                  ? "Found on this network"
                  : castAvailable === false
                    ? "None found"
                    : "Checking…"
            }
            tone={castAvailable === true ? "good" : "off"}
          />
          <Status label="Devices detected" value={String(devices.length)} />
        </div>

        {available.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-ink-soft">Scan &amp; connect</span>
            <div className="flex flex-wrap gap-2">
              {available.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void pair(id)}
                  disabled={pending.includes(id)}
                  aria-label={`Scan for ${label} devices`}
                  className={chip}
                >
                  <Icon size={14} />
                  {pending.includes(id) ? "Choosing…" : label}
                </button>
              ))}
            </div>
          </div>
        )}

        {support.leScan && (
          <button
            type="button"
            onClick={() => void toggleLeScan()}
            className={cx(
              "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold",
              leScanning
                ? "bg-danger text-white hover:brightness-110"
                : "bg-accent text-white hover:brightness-110",
            )}
          >
            {leScanning ? (
              <>
                <span className="size-2 rounded-full bg-white motion-safe:animate-pulse" />
                Stop live BLE scan
              </>
            ) : (
              <>
                <RadarIcon size={15} />
                Start live BLE scan
              </>
            )}
          </button>
        )}

        {error && (
          <p role="alert" className="text-[12px] font-medium text-danger">
            {error}
          </p>
        )}

        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Browsers don&apos;t let a page sweep the airwaves on its own. Each button opens the
          browser&apos;s own scanner, which lists what&apos;s in range — the device you pick then
          appears here for good. Attached audio, video and gamepad hardware is listed without a
          prompt.
          {missing.length > 0 && ` Not available in this browser: ${missing.map((t) => t.api).join(", ")}.`}
        </p>
      </section>

      {/* ------------------------------- results ---------------------------- */}
      <section className={panel} aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <CastIcon size={18} />
          </span>
          <h3 className="text-[14px] font-bold tracking-tight">
            Detected devices
            {devices.length > 0 && (
              <span className="ml-1.5 font-mono text-[11px] font-semibold text-ink-soft">
                {devices.length}
              </span>
            )}
          </h3>
          {namesHidden && (
            <button
              type="button"
              onClick={() => void revealNames()}
              className="ml-auto rounded-full border border-border bg-paper px-3 py-1.5 text-[11.5px] font-semibold hover:border-accent hover:text-accent"
            >
              Reveal names
            </button>
          )}
        </div>

        {devices.length > 0 ? (
          <ul className="flex flex-col">
            {devices.map((device) => (
              <DeviceRow key={device.key} device={device} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <RadarIcon
              size={30}
              className={cx("text-accent", scanning && "motion-safe:animate-pulse")}
            />
            <p className="text-[13px] font-semibold">
              {scanning ? "Looking around…" : "Nothing detected yet"}
            </p>
            {!scanning && (
              <p className="max-w-[34ch] text-[11.5px] leading-relaxed text-ink-soft">
                {support.any
                  ? "Use Scan & connect to open the browser's device picker, or plug something in — it shows up here automatically."
                  : "This browser exposes no device-discovery API. Chrome or Edge on desktop and Android support the full set."}
              </p>
            )}
          </div>
        )}

        {namesHidden && (
          <p className="text-[11px] italic text-ink-soft">
            Microphone and camera names stay hidden until you grant access once.
          </p>
        )}
      </section>
    </div>
  );
}
