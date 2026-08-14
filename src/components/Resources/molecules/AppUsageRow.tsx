"use client";

import type { AppId } from "@/store/useWorkspaceStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { APP_MAP, chipGradient } from "@/components/AppCatalog";
import { ACCESS_MAP, type AccessId } from "@/lib/Resources/catalog";
import { APP_NETWORK, APP_STORAGE_NOTE } from "@/lib/Resources/app-usage";
import { formatBytes, share } from "@/lib/Resources/format";
import { ResourceGlyph } from "@/components/Resources/atoms/ResourceGlyph";
import { UsageBar } from "@/components/Resources/atoms/UsageBar";
import { GlobeIcon } from "@/components/SketchNotes/atoms/icons";

interface AppUsageRowProps {
  app: AppId;
  /** Permission-gated resources this app can reach, from the catalog. */
  access: AccessId[];
  /** Bytes it is holding in this browser right now, measured. */
  bytes: number;
  keys: number;
  /** Largest single app total, so the bars are comparable to each other. */
  peakBytes: number;
}

/**
 * What one app in the workspace does with the device.
 *
 * Two of the three lines are facts about the code, declared once in
 * `lib/Resources`; the third — the storage figure — is measured live from this
 * browser. Keeping them side by side is the point: "can use the camera" and "is
 * using 4 KB" are different claims, and the row shouldn't blur them.
 */
export function AppUsageRow({ app, access, bytes, keys, peakBytes }: AppUsageRowProps) {
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const entry = APP_MAP[app];
  const network = APP_NETWORK[app];

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-3.5 shadow-panel">
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 flex-none place-items-center rounded-xl text-white [&>svg]:size-5"
          style={{ backgroundImage: chipGradient(entry.hue) }}
        >
          {entry.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <h3 className="text-[14.5px] font-bold leading-tight">{entry.name}</h3>
            <span className="text-[12px] font-semibold tabular-nums text-ink-soft">
              {bytes > 0 ? `${formatBytes(bytes)} · ${keys} key${keys === 1 ? "" : "s"}` : "No data stored"}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-ink-soft">{APP_STORAGE_NOTE[app]}</p>
        </div>
      </div>

      {bytes > 0 && <UsageBar pct={share(bytes, peakBytes)} tone="accent" />}

      <div className="flex flex-wrap items-center gap-1.5">
        {access.length > 0 ? (
          access.map((id) => (
            <span
              key={id}
              title={ACCESS_MAP[id].what}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent"
            >
              <ResourceGlyph glyph={ACCESS_MAP[id].glyph} size={13} />
              {ACCESS_MAP[id].name}
            </span>
          ))
        ) : (
          <span className="text-[11.5px] text-ink-soft">
            Asks for no camera, microphone, location or device access.
          </span>
        )}
      </div>

      {network && (
        <p className="flex items-start gap-2 text-[11.5px] leading-snug text-ink-soft">
          <span className="mt-px flex-none text-accent">
            <GlobeIcon size={13} />
          </span>
          {network}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => setActiveApp(app)}
          className="rounded-full border border-border bg-paper px-3.5 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Open {entry.name}
        </button>
      </div>
    </li>
  );
}
