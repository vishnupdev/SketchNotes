"use client";

import { useSatelliteStore } from "@/store/useSatelliteStore";
import { BASE_LAYERS, baseLayer } from "@/lib/Satellite/layers";
import { OVERLAYS } from "@/lib/Satellite/weather";
import { ChoiceCard } from "@/components/Satellite/molecules/ChoiceCard";

/**
 * What the map is made of: the imagery underneath, the names over it, and which
 * live sheet — if any — is drawn on top.
 *
 * The two choices are kept apart because they answer different questions. The
 * base layer is *what the ground looks like* and is a matter of taste; the
 * overlay is *what is happening right now* and is the reason to have the app
 * open at all. Folding them into one list of six would hide that.
 */
export function LayersPanel() {
  const base = useSatelliteStore((s) => s.base);
  const setBase = useSatelliteStore((s) => s.setBase);
  const labels = useSatelliteStore((s) => s.labels);
  const setLabels = useSatelliteStore((s) => s.setLabels);
  const overlay = useSatelliteStore((s) => s.overlay);
  const setOverlay = useSatelliteStore((s) => s.setOverlay);
  const opacity = useSatelliteStore((s) => s.opacity);
  const setOpacity = useSatelliteStore((s) => s.setOpacity);
  const zoom = useSatelliteStore((s) => s.zoom);

  const layer = baseLayer(base);

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          The ground
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {BASE_LAYERS.map((option) => (
            <ChoiceCard
              key={option.id}
              name="satellite-base"
              value={option.id}
              checked={base === option.id}
              onChange={() => setBase(option.id)}
              title={option.name}
              blurb={option.blurb}
            />
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
          {layer.credit}. Imagery goes to zoom {layer.maxZoom}; you are at {zoom.toFixed(1)}.
        </p>
      </fieldset>

      <label className="flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-border bg-panel p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
        <input
          type="checkbox"
          checked={labels}
          onChange={(e) => setLabels(e.target.checked)}
          className="mt-0.5 size-4 flex-none accent-accent"
        />
        <span>
          <span className="block text-[13.5px] font-semibold">Place names and borders</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            A transparent sheet of labels over whatever is below. Over satellite imagery this is the
            difference between a picture and a map.
          </span>
        </span>
      </label>

      <fieldset>
        <legend className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          Live overlay
        </legend>
        <div className="mt-2 grid gap-2">
          {OVERLAYS.map((option) => (
            <ChoiceCard
              key={option.id}
              name="satellite-overlay"
              value={option.id}
              checked={overlay === option.id}
              onChange={() => setOverlay(option.id)}
              title={option.name}
              blurb={option.blurb}
            />
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
          With the overlay off, nothing live is requested at all. The Live tab plays the frames and
          says how old the newest one is.
        </p>
      </fieldset>

      <div>
        <label
          htmlFor="satellite-opacity"
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          Overlay strength — {Math.round(opacity * 100)}%
        </label>
        <input
          id="satellite-opacity"
          type="range"
          min={10}
          max={100}
          step={5}
          value={Math.round(opacity * 100)}
          disabled={overlay === "none"}
          onChange={(e) => setOpacity(Number(e.target.value) / 100)}
          className="mt-2 w-full accent-accent disabled:opacity-40"
        />
        <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
          Turn it down to read the ground through the weather — the point of putting them on the same
          map is seeing which one is over which.
        </p>
      </div>
    </div>
  );
}
