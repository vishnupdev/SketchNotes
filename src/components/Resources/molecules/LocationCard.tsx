"use client";

import { cx } from "@/lib/utils";
import { useResourcesStore } from "@/store/useResourcesStore";
import { ACCESS_MAP, STATE_LABEL, type AccessState } from "@/lib/Resources/catalog";
import { ResourceGlyph } from "@/components/Resources/atoms/ResourceGlyph";
import { Elapsed } from "@/components/Resources/atoms/Elapsed";
import { StopIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Location, shown as the thing it actually is: not a single reading but a
 * *watch* that keeps reporting as you move.
 *
 * That distinction is the whole point of putting it on the Live tab. A page
 * with location permission doesn't ask once — it can follow you for as long as
 * the tab is open, which is why the card counts the updates and shows how long
 * the watch has been running.
 */
export function LocationCard({ state }: { state: AccessState }) {
  const item = ACCESS_MAP.location;
  const geo = useResourcesStore((s) => s.geo);
  const geoError = useResourcesStore((s) => s.geoError);
  const startGeo = useResourcesStore((s) => s.startGeo);
  const stopGeo = useResourcesStore((s) => s.stopGeo);

  const active = geo != null;
  const unsupported = state === "unsupported";
  const fix = geo?.last;

  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-2xl border bg-panel p-4 shadow-panel",
        active ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "grid size-10 flex-none place-items-center rounded-xl",
            active ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          <ResourceGlyph glyph={item.glyph} size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-bold leading-tight">{item.name}</h3>
            {active ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-on-accent">
                <span aria-hidden className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                Tracking
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-ink-soft">
                Idle · {STATE_LABEL[state]}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {active
              ? "A live watch is running. Every position below was read on this device and is not stored or sent anywhere."
              : "No app in this workspace asks for your location. Start a watch to see what one would get."}
          </p>
        </div>
      </div>

      {active && geo && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-ink-soft">Position</dt>
          <dd className="min-w-0 truncate font-medium tabular-nums">
            {fix ? `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}` : "Waiting for a fix…"}
          </dd>
          <dt className="text-ink-soft">Accuracy</dt>
          <dd className="font-medium tabular-nums">
            {fix ? `± ${Math.round(fix.accuracy)} m` : "—"}
          </dd>
          <dt className="text-ink-soft">Updates</dt>
          <dd className="font-medium tabular-nums">{geo.updates}</dd>
          <dt className="text-ink-soft">Watching for</dt>
          <dd className="font-medium tabular-nums">
            <Elapsed since={geo.startedAt} />
          </dd>
        </dl>
      )}

      {(geo?.error || geoError) && (
        <p role="status" className="text-[12px] leading-snug text-danger">
          {geo?.error ?? geoError}
        </p>
      )}

      <button
        type="button"
        onClick={() => (active ? stopGeo() : startGeo())}
        disabled={unsupported}
        className={cx(
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          active
            ? "bg-accent text-on-accent hover:brightness-110"
            : "border border-border bg-paper hover:border-accent hover:text-accent",
          unsupported && "cursor-not-allowed opacity-50",
        )}
      >
        {active && <StopIcon size={14} />}
        {unsupported ? "Not available here" : active ? "Stop watching" : "Start a location watch"}
      </button>
    </div>
  );
}
