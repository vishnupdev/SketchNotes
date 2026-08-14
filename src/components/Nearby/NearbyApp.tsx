"use client";

import { useEffect, useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useNearbyDevices } from "@/hooks/useNearbyDevices";
import { useDeviceConnections } from "@/hooks/useDeviceConnections";
import { getSupportedMediaConstraints } from "@/lib/nearby/discovery";
import { nearbyReportToText } from "@/lib/nearby/report";
import { ApiMatrix } from "@/components/Nearby/molecules/ApiMatrix";
import { ScanPanel } from "@/components/Nearby/organisms/ScanPanel";
import { ConnectPanel } from "@/components/Nearby/organisms/ConnectPanel";
import { DeviceList } from "@/components/Nearby/organisms/DeviceList";
import { DeviceDetail } from "@/components/Nearby/organisms/DeviceDetail";
import { RadarIcon } from "@/components/SketchNotes/atoms/deviceIcons";
import { AppsIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Nearby Devices — finds the hardware around this machine and shows what each
 * piece of it actually is.
 *
 * Discovery is the same consent-gated set of routes the System Info panel uses
 * (see `lib/nearby/discovery.ts`); what this app adds is depth. Every device is
 * opened up into its full descriptor — USB configurations, interfaces and
 * endpoints, HID collections and report layouts, camera resolutions and
 * microphone sample rates, controller layout — plus the two things that need a
 * live link: a Bluetooth GATT walk and a controller's real-time input.
 *
 * The page reads in three passes, and the layout follows them: Scan finds what's
 * around, Connect opens a real session with whatever can hold one, and the
 * master/detail below reads a single device in full. Only Connect touches
 * anything — everything else is descriptor-reading that leaves hardware alone.
 *
 * All of it happens on-device through browser APIs. Nothing is transmitted, and
 * nothing is ever written to a device.
 */
export function NearbyApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
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

  const links = useDeviceConnections(devices);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Read once — it's a static fact about the browser, not about the devices.
  const mediaConstraints = useMemo(() => getSupportedMediaConstraints().length, []);

  const selected = devices.find((d) => d.key === selectedKey) ?? null;

  // Unplugging the device being inspected drops the selection, so the pane can't
  // keep showing a spec sheet for hardware that has left.
  useEffect(() => {
    if (selectedKey && !devices.some((d) => d.key === selectedKey)) setSelectedKey(null);
  }, [devices, selectedKey]);

  const copyReport = async () => {
    const text = nearbyReportToText(devices, support, { adapter, castAvailable });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context, or a permissions policy) — fall
      // back to a download so the report is still recoverable.
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "nearby-devices.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<RadarIcon size={26} />}
            name="Nearby Devices"
            tagline="scan what's around & read its features"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-5 pb-[80px] pt-[22px]">
        <div className="flex flex-col gap-4">
          <ScanPanel
            support={support}
            adapter={adapter}
            castAvailable={castAvailable}
            deviceCount={devices.length}
            scanning={scanning}
            pending={pending}
            leScanning={leScanning}
            namesHidden={namesHidden}
            error={error}
            copied={copied}
            onRescan={rescan}
            onPair={(t) => void pair(t)}
            onToggleLeScan={() => void toggleLeScan()}
            onRevealNames={() => void revealNames()}
            onCopy={() => void copyReport()}
          />

          <ConnectPanel
            devices={links.connectable}
            openCount={links.openCount}
            link={links.link}
            baudRate={links.baudRate}
            onBaudRate={links.setBaudRate}
            onConnect={links.connect}
            onDisconnect={links.disconnect}
            onDisconnectAll={links.disconnectAll}
            anySupport={support.bluetooth || support.usb || support.hid || support.serial}
          />

          {/* Master/detail. One column on a phone, where picking a device swaps
              the list out for its sheet; side by side from 900px up. */}
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] min-[900px]:items-start">
            <div className={cx(selected && "hidden min-[900px]:block")}>
              <DeviceList
                devices={devices}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                scanning={scanning}
                anySupport={support.any}
              />
            </div>

            <div className={cx(!selected && "hidden min-[900px]:block")}>
              {selected ? (
                <DeviceDetail device={selected} onBack={() => setSelectedKey(null)} />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                  <RadarIcon size={28} className="text-accent" />
                  <p className="text-[13px] font-semibold">Pick a device</p>
                  <p className="max-w-[38ch] text-[11.5px] leading-relaxed text-ink-soft">
                    Its full sheet appears here — identity, class, interfaces, capabilities and
                    everything else its transport will tell us.
                  </p>
                </div>
              )}
            </div>
          </div>

          <ApiMatrix support={support} mediaConstraints={mediaConstraints} />

          <p className="text-center text-[11px] leading-relaxed text-ink-soft">
            Every reading is taken in this browser and stays here — nothing is uploaded, and no
            device is written to or paired on your behalf. A device is only ever opened when you
            press Connect, and every link is closed when you disconnect or leave the page.
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
