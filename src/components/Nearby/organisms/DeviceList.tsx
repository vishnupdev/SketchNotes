"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import type { NearbyDevice, Transport } from "@/lib/nearby/discovery";
import { DeviceTile } from "@/components/Nearby/molecules/DeviceTile";
import { TRANSPORTS, TRANSPORT_ORDER } from "@/components/Nearby/atoms/transportMeta";
import { RadarIcon } from "@/components/SketchNotes/atoms/deviceIcons";

interface DeviceListProps {
  devices: NearbyDevice[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  scanning: boolean;
  /** False when the browser exposes no discovery API at all. */
  anySupport: boolean;
}

/**
 * The detected-device list, filterable by transport.
 *
 * Filters are only offered for transports that actually found something — a chip
 * that can only ever show an empty list is noise, and on a phone it costs a row
 * of the screen.
 */
export function DeviceList({
  devices,
  selectedKey,
  onSelect,
  scanning,
  anySupport,
}: DeviceListProps) {
  const [filter, setFilter] = useState<Transport | "all">("all");

  const counts = useMemo(() => {
    const map = new Map<Transport, number>();
    for (const d of devices) map.set(d.transport, (map.get(d.transport) ?? 0) + 1);
    return map;
  }, [devices]);

  const present = TRANSPORT_ORDER.filter((t) => counts.has(t));
  // A filter whose devices have all gone away falls back to showing everything.
  const active = filter !== "all" && counts.has(filter) ? filter : "all";
  const shown = active === "all" ? devices : devices.filter((d) => d.transport === active);

  const chip = (on: boolean) =>
    cx(
      "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      on ? "border-accent bg-accent-soft text-accent" : "border-border bg-paper hover:border-accent",
    );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-bold tracking-tight">
          Detected
          <span className="ml-1.5 font-mono text-[11px] font-semibold text-ink-soft">
            {devices.length}
          </span>
        </h2>
      </div>

      {/* Chips wrap rather than scroll: the list column is narrow enough that a
          fourth chip would sit off the edge, where nobody looks for it. */}
      {present.length > 1 && (
        <div
          role="group"
          aria-label="Filter devices by transport"
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={active === "all"}
            className={chip(active === "all")}
          >
            All {devices.length}
          </button>
          {present.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              aria-pressed={active === t}
              className={chip(active === t)}
            >
              {TRANSPORTS[t].long} {counts.get(t)}
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {shown.map((device) => (
            <DeviceTile
              key={device.key}
              device={device}
              selected={device.key === selectedKey}
              onSelect={() => onSelect(device.key)}
            />
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
              {anySupport
                ? "Open a scanner above to pick a device, or plug something in — it shows up here on its own."
                : "This browser exposes no device-discovery API. Chrome or Edge on desktop and Android support the full set."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
