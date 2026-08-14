"use client";

import { cx } from "@/lib/utils";
import { useResourcesStore } from "@/store/useResourcesStore";
import { useLiveResourceUsage } from "@/hooks/useLiveResourceUsage";
import type { AccessStates } from "@/lib/Resources/permissions";
import { formatBytes, formatPct, share } from "@/lib/Resources/format";
import { Section } from "@/components/Resources/atoms/Section";
import { toneForFill } from "@/components/Resources/atoms/UsageBar";
import { CaptureCard } from "@/components/Resources/molecules/CaptureCard";
import { LocationCard } from "@/components/Resources/molecules/LocationCard";
import { UsageTile } from "@/components/Resources/molecules/UsageTile";
import {
  BatteryIcon,
  CpuIcon,
  DownloadSpeedIcon,
  DriveIcon,
  MemoryIcon,
  MonitorIcon,
  WifiIcon,
  WifiOffIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * The Live tab: what is being used *now*.
 *
 * It is split deliberately. The top half is the resources that require consent
 * — camera, microphone, screen, location — where "in use" is a yes/no fact and
 * the app shows it by holding the resource itself. The bottom half is the ones
 * that need no consent at all — memory, storage, processor, battery, network —
 * where "in use" is a quantity, sampled live.
 *
 * The scope statement in the summary is not boilerplate. A page can only ever
 * see its own streams, so this reports on this workspace, not on the machine,
 * and saying so is the difference between a useful monitor and a false one.
 */
export function LivePanel({ states }: { states: AccessStates }) {
  const sessions = useResourcesStore((s) => s.sessions);
  const geo = useResourcesStore((s) => s.geo);
  const usage = useLiveResourceUsage(true);

  const openNames = [
    sessions.camera && "camera",
    sessions.microphone && "microphone",
    sessions.screen && "screen capture",
    geo && "location",
  ].filter(Boolean) as string[];
  const anyOpen = openNames.length > 0;

  const heapPct = usage.heap ? share(usage.heap.usedBytes, usage.heap.limitBytes) : null;
  const storagePct = usage.storage ? share(usage.storage.usage, usage.storage.quota) : null;
  const screenSize =
    typeof window === "undefined" ? "—" : `${window.screen.width}×${window.screen.height}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline state. `role="status"` so switching a capture on or off is
          announced without stealing focus. */}
      <div
        role="status"
        className={cx(
          "flex items-start gap-3 rounded-2xl border p-4 shadow-panel",
          anyOpen ? "border-accent bg-accent-soft" : "border-border bg-panel",
        )}
      >
        <span
          className={cx(
            "mt-1 size-2.5 flex-none rounded-full",
            anyOpen ? "bg-accent motion-safe:animate-pulse" : "bg-ink-soft",
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold leading-snug">
            {anyOpen
              ? `In use right now: ${openNames.join(", ")}.`
              : "Nothing is watching, listening or tracking you here."}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            This covers the OneApp workspace only. A web page cannot see what other tabs or other
            applications on your device are doing — for that, check the recording indicator in your
            browser and your operating system&apos;s privacy settings.
          </p>
        </div>
      </div>

      <Section
        id="live-capture"
        title="Camera, mic, screen & location"
        blurb="Open one to see exactly what a site gets when you allow it — and release it again with one button."
      >
        <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
          <CaptureCard kind="camera" state={states.camera} />
          <CaptureCard kind="microphone" state={states.microphone} />
          <CaptureCard kind="screen" state={states.screen} />
          <LocationCard state={states.location} />
        </div>
      </Section>

      <Section
        id="live-device"
        title="Device resources"
        blurb="Consumed with no permission and no indicator. These are measured for this tab."
      >
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3">
          <UsageTile
            icon={<MemoryIcon size={17} />}
            label="Memory"
            value={usage.heap ? formatBytes(usage.heap.usedBytes) : "Not reported"}
            detail={
              usage.heap
                ? `of ${formatBytes(usage.heap.limitBytes)} available to this tab`
                : "This browser does not expose heap usage."
            }
            {...(heapPct != null ? { pct: heapPct, tone: toneForFill(heapPct) } : {})}
          />
          <UsageTile
            icon={<DriveIcon size={17} />}
            label="Storage"
            value={usage.storage ? formatBytes(usage.storage.usage) : "Not reported"}
            detail={
              usage.storage
                ? `of ${formatBytes(usage.storage.quota)} this site may use`
                : "This browser does not estimate storage."
            }
            {...(storagePct != null ? { pct: storagePct, tone: toneForFill(storagePct) } : {})}
          />
          <UsageTile
            icon={<CpuIcon size={17} />}
            label="Processor"
            value={usage.cores ? `${usage.cores} cores` : "Not reported"}
            detail={`Rendering at ${usage.fps} fps`}
          />
          <UsageTile
            icon={<BatteryIcon size={17} />}
            label="Battery"
            value={usage.battery ? formatPct(usage.battery.level * 100) : "Not reported"}
            detail={
              usage.battery
                ? usage.battery.charging
                  ? "Charging"
                  : "On battery"
                : "This browser does not expose battery level."
            }
            {...(usage.battery
              ? { pct: usage.battery.level * 100, tone: toneForFill(100 - usage.battery.level * 100) }
              : {})}
          />
          <UsageTile
            icon={usage.network.online ? <WifiIcon size={17} /> : <WifiOffIcon size={17} />}
            label="Network"
            value={usage.network.online ? (usage.network.effectiveType ?? "Online") : "Offline"}
            detail={
              usage.network.downlink != null
                ? `≈ ${usage.network.downlink} Mbps down · ${usage.network.rtt ?? "?"} ms round trip`
                : "Connection details are not exposed here."
            }
          />
          <UsageTile
            icon={<DownloadSpeedIcon size={17} />}
            label="Data pulled"
            value={formatBytes(usage.transferred)}
            detail="Over the network since this page loaded"
          />
          <UsageTile
            icon={<MonitorIcon size={17} />}
            label="Display"
            value={screenSize}
            detail={
              usage.deviceMemoryGB
                ? `Device reports ${usage.deviceMemoryGB} GB of RAM (rounded)`
                : "Device memory is not reported here."
            }
          />
        </div>
      </Section>
    </div>
  );
}
