"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import { APPS } from "@/components/AppCatalog";
import { accessForApp, APP_NETWORK, appsForAccess } from "@/lib/Resources/app-usage";
import { formatBytes } from "@/lib/Resources/format";
import { useStorageAudit } from "@/hooks/useStorageAudit";
import { Section } from "@/components/Resources/atoms/Section";
import { AppUsageRow } from "@/components/Resources/molecules/AppUsageRow";
import { RefreshIcon } from "@/components/SketchNotes/atoms/icons";

type Filter = "all" | "capture" | "network" | "storage";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All apps" },
  { id: "capture", label: "Camera or mic" },
  { id: "network", label: "Uses the network" },
  { id: "storage", label: "Stores data here" },
];

/**
 * The Apps tab — the one view no browser can produce.
 *
 * A browser's site settings see a single origin; this workspace is a whole
 * shelf of apps behind that origin, so "oneappready.vercel.app may use your camera" is
 * true and useless. Here the same question is answered per app, and the storage
 * figures are attributed by walking this browser's own keys rather than being
 * asserted.
 */
export function AppsPanel() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: audit, isLoading, isFetching, refetch } = useStorageAudit();

  const bytesByApp = useMemo(() => {
    const map = new Map<string, { bytes: number; keys: number }>();
    for (const row of audit?.byApp ?? []) map.set(row.app, { bytes: row.bytes, keys: row.keys });
    return map;
  }, [audit]);

  const peakBytes = audit?.byApp[0]?.bytes ?? 0;

  const rows = useMemo(() => {
    const all = APPS.map((entry) => {
      const stored = bytesByApp.get(entry.id) ?? { bytes: 0, keys: 0 };
      return { app: entry.id, access: accessForApp(entry.id), ...stored };
    });
    const kept = all.filter((row) => {
      if (filter === "capture") {
        return row.access.includes("camera") || row.access.includes("microphone");
      }
      if (filter === "network") return APP_NETWORK[row.app] != null;
      if (filter === "storage") return row.bytes > 0;
      return true;
    });
    // Heaviest first, so the apps actually holding something lead. Ties keep
    // the launcher's own order, which is the order people already know.
    return kept.sort((a, b) => b.bytes - a.bytes);
  }, [bytesByApp, filter]);

  const cameraApps = appsForAccess("camera").length;
  const micApps = appsForAccess("microphone").length;
  const locationApps = appsForAccess("location").length;
  const networkApps = APPS.filter((a) => APP_NETWORK[a.id] != null).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-panel p-4 shadow-panel">
        <p className="text-[14.5px] font-bold leading-snug">
          {APPS.length} apps share this one browser origin.
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
          {cameraApps} can use the camera, {micApps} the microphone,{" "}
          {locationApps === 0 ? "none" : locationApps} your location. {networkApps} send anything
          over the network. Everything else runs entirely on this device.
        </p>
        {audit && (
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {formatBytes(audit.saved.bytes)} is stored across {audit.saved.keys} keys, plus{" "}
            {formatBytes(audit.settings.bytes)} of workspace preferences. Sizes are close
            approximations — the browser reports no exact per-key figure.
          </p>
        )}
      </div>

      <Section
        id="apps-list"
        title="Per app"
        blurb="Resources each app can reach for, and what it is holding in this browser right now."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3.5 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            <RefreshIcon size={14} />
            {isFetching ? "Scanning…" : "Re-scan"}
          </button>
        }
      >
        <div role="group" aria-label="Filter apps" className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                filter === f.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-paper text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="px-1 py-8 text-center text-[13px] text-ink-soft">Measuring what is stored…</p>
        ) : rows.length === 0 ? (
          <p className="px-1 py-8 text-center text-[13px] text-ink-soft">
            No app matches that filter — which is the good answer.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <AppUsageRow
                key={row.app}
                app={row.app}
                access={row.access}
                bytes={row.bytes}
                keys={row.keys}
                peakBytes={peakBytes}
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
