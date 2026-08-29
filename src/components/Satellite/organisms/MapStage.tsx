"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSatelliteStore } from "@/store/useSatelliteStore";
import { useWeatherIndex } from "@/hooks/useWeatherIndex";
import { baseLayer, LABELS_SOURCE, type TileSource } from "@/lib/Satellite/layers";
import {
  framesFor,
  overlayCredit,
  overlayMaxZoom,
  overlayTileUrl,
} from "@/lib/Satellite/weather";
import { TileCache } from "@/lib/Satellite/tile-cache";
import {
  drawTileLayer,
  latLonToScreen,
  panBy,
  zoomAround,
  type Viewport,
} from "@/lib/Satellite/render";
import {
  formatDecimal,
  formatDistance,
  metresPerPixel,
  scaleBar,
} from "@/lib/Satellite/mercator";
import { MapButton } from "@/components/Satellite/atoms/MapButton";
import { MinusIcon, PinIcon, PlusIcon, TargetIcon } from "@/components/SketchNotes/atoms/icons";

/** How far one arrow-key press moves the map, in CSS pixels. */
const KEY_PAN_PX = 90;

/**
 * The map: a canvas of tiles, the markers over it, and every gesture that moves
 * it.
 *
 * The canvas draws imagery and nothing else. Markers, the scale bar, the
 * controls and the credit line are ordinary DOM on top — which is what lets
 * them carry theme tokens, real focus rings and real labels (rules #6 and #7)
 * instead of being pixels a screen reader cannot see and a theme cannot reach.
 */
export function MapStage() {
  const center = useSatelliteStore((s) => s.center);
  const zoom = useSatelliteStore((s) => s.zoom);
  const base = useSatelliteStore((s) => s.base);
  const labels = useSatelliteStore((s) => s.labels);
  const overlay = useSatelliteStore((s) => s.overlay);
  const opacity = useSatelliteStore((s) => s.opacity);
  const frame = useSatelliteStore((s) => s.frame);
  const fix = useSatelliteStore((s) => s.fix);
  const pin = useSatelliteStore((s) => s.pin);
  const follow = useSatelliteStore((s) => s.follow);
  const setView = useSatelliteStore((s) => s.setView);
  const zoomBy = useSatelliteStore((s) => s.zoomBy);
  const setFollow = useSatelliteStore((s) => s.setFollow);

  // Only the radar layer has an index to fetch — the daily mosaic is addressed
  // by date, so choosing it costs no request beyond the tiles themselves.
  const { data: index } = useWeatherIndex(overlay === "radar");

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const layer = baseLayer(base);
  const view = useMemo<Viewport>(
    () => ({ width: size.width, height: size.height, center, zoom }),
    [size.width, size.height, center, zoom],
  );

  /** The current live frame as a tile source, or null when nothing is overlaid. */
  const overlaySource = useMemo<TileSource | null>(() => {
    if (overlay === "none") return null;
    const frames = framesFor(index, overlay);
    if (frames.length === 0) return null;

    const active = frames[Math.min(frame, frames.length - 1)];
    if (!overlayTileUrl(index, active, overlay, 0, 0, 0)) return null;

    return {
      // Non-null by the probe above: the address depends only on the layer and
      // the frame, never on which tile is being asked for.
      url: (x, y, z) => overlayTileUrl(index, active, overlay, x, y, z) as string,
      maxZoom: overlayMaxZoom(overlay),
      credit: overlayCredit(overlay),
    };
  }, [index, overlay, frame]);

  /* ── tiles ─────────────────────────────────────────────────────────────── */

  const repaint = useRef<() => void>(() => {});
  const cacheRef = useRef<TileCache | null>(null);
  if (!cacheRef.current) cacheRef.current = new TileCache(() => repaint.current());

  // The cache holds decoded bitmaps; leaving them behind when the app closes
  // would keep a screenful of imagery alive for as long as the tab is open.
  useEffect(() => {
    const cache = cacheRef.current;
    return () => cache?.clear();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const cache = cacheRef.current;
    if (!canvas || !cache || view.width === 0 || view.height === 0) return;

    // Capped at 2: a 3x display gains nothing visible on photographic tiles and
    // costs 2.25x the fill rate on exactly the devices that can least afford it.
    const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    const w = Math.round(view.width * dpr);
    const h = Math.round(view.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The ground under the tiles comes from the theme, so an unloaded map is a
    // panel rather than a black hole (rule #6 — no colour is written here).
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--panel").trim() || "#1a1a1a";
    ctx.fillRect(0, 0, view.width, view.height);

    drawTileLayer(ctx, view, layer, cache);
    if (labels) drawTileLayer(ctx, view, LABELS_SOURCE, cache);
    if (overlaySource) drawTileLayer(ctx, view, overlaySource, cache, opacity);
  }, [view, layer, labels, overlaySource, opacity]);

  // A tile landing schedules one repaint for the next frame, however many
  // arrived: twenty tiles finishing together must not mean twenty draws.
  useEffect(() => {
    let queued = 0;
    repaint.current = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        draw();
      });
    };
    draw();
    return () => {
      if (queued) cancelAnimationFrame(queued);
      queued = 0;
      repaint.current = () => {};
    };
  }, [draw]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  /* ── gestures ──────────────────────────────────────────────────────────── */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; mid: { x: number; y: number } } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const localPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));
    pinch.current = null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const held = pointers.current;
    if (!held.has(e.pointerId)) return;
    const next = localPoint(e);
    const previous = held.get(e.pointerId)!;
    held.set(e.pointerId, next);

    const all = [...held.values()];
    const current = viewRef.current;

    if (all.length === 1) {
      setView(panBy(current, next.x - previous.x, next.y - previous.y));
      return;
    }

    if (all.length >= 2) {
      const [a, b] = all;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const last = pinch.current;
      pinch.current = { distance, mid };
      if (!last || last.distance === 0) return;

      // Spread the fingers, gain zoom; slide them, drag the map. Both happen at
      // once in a real pinch, so both are applied to the same move.
      const nextZoom = current.zoom + Math.log2(distance / last.distance);
      const zoomed = zoomAround(current, nextZoom, mid.x, mid.y);
      const panned = panBy(
        { ...current, center: zoomed, zoom: nextZoom },
        mid.x - last.mid.x,
        mid.y - last.mid.y,
      );
      setView(panned, nextZoom);
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Wheel has to be a non-passive listener: React's synthetic onWheel cannot
  // preventDefault, so without this the page scrolls away under the gesture.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = host.getBoundingClientRect();
      const current = viewRef.current;
      // Line-mode deltas are ~1/100th of pixel-mode ones; both end up per-notch.
      const step = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * -0.0025;
      const next = current.zoom + step;
      setView(zoomAround(current, next, e.clientX - box.left, e.clientY - box.top), next);
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [setView]);

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const current = viewRef.current;
    setView(zoomAround(current, current.zoom + 1, e.clientX - box.left, e.clientY - box.top), current.zoom + 1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = viewRef.current;
    const pan = (dx: number, dy: number) => {
      e.preventDefault();
      setView(panBy(current, dx, dy));
    };
    switch (e.key) {
      case "ArrowLeft":
        return pan(KEY_PAN_PX, 0);
      case "ArrowRight":
        return pan(-KEY_PAN_PX, 0);
      case "ArrowUp":
        return pan(0, KEY_PAN_PX);
      case "ArrowDown":
        return pan(0, -KEY_PAN_PX);
      case "+":
      case "=":
        e.preventDefault();
        return zoomBy(1);
      case "-":
      case "_":
        e.preventDefault();
        return zoomBy(-1);
      default:
    }
  };

  /* ── overlays ──────────────────────────────────────────────────────────── */

  const ready = size.width > 0 && size.height > 0;
  const bar = scaleBar(center.lat, zoom);
  const fixPoint = ready && fix ? latLonToScreen(view, fix) : null;
  const pinPoint = ready && pin ? latLonToScreen(view, pin) : null;
  // The reported accuracy is a radius in metres; Mercator's scale at that
  // latitude is what turns it into the circle actually drawn.
  const accuracyPx =
    fix && ready ? Math.min(size.width, fix.accuracy / metresPerPixel(fix.lat, zoom)) : 0;

  const credits = [
    layer.credit,
    labels ? LABELS_SOURCE.credit : null,
    overlaySource?.credit ?? null,
  ].filter(Boolean) as string[];

  const onScreen = (p: { x: number; y: number } | null): boolean =>
    !!p && p.x > -60 && p.y > -60 && p.x < size.width + 60 && p.y < size.height + 60;

  return (
    <section aria-label="Map" className="flex flex-col gap-2">
      <div
        ref={hostRef}
        role="application"
        tabIndex={0}
        aria-label={`Map, centred on ${formatDecimal(center, 3)} at zoom ${zoom.toFixed(1)}`}
        aria-describedby="map-help"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        className="relative h-[clamp(280px,46vh,560px)] w-full touch-none select-none overflow-hidden rounded-[18px] border border-border bg-panel shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

        {/* Accuracy first, then the dot: a 200m circle must not swallow it. */}
        {fix && onScreen(fixPoint) && accuracyPx > 6 && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-accent/60 bg-accent/15"
            style={{
              left: fixPoint!.x - accuracyPx,
              top: fixPoint!.y - accuracyPx,
              width: accuracyPx * 2,
              height: accuracyPx * 2,
            }}
          />
        )}
        {fix && onScreen(fixPoint) && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: fixPoint!.x, top: fixPoint!.y }}
          >
            <span className="sr-only">You are here</span>
            <span
              aria-hidden
              className="absolute -inset-2 rounded-full bg-accent/40 motion-safe:animate-ping"
            />
            <span
              aria-hidden
              className="relative block size-3.5 rounded-full bg-accent ring-2 ring-paper"
            />
          </span>
        )}

        {pin && onScreen(pinPoint) && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-danger"
            style={{ left: pinPoint!.x, top: pinPoint!.y }}
          >
            <span className="sr-only">{pin.name}</span>
            <PinIcon size={26} />
          </span>
        )}

        {/* Centre crosshair — what "pin the centre" and the readout refer to. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-soft/50"
        >
          <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-soft/70" />
        </span>

        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
          <MapButton label="Zoom in" onClick={() => zoomBy(1)}>
            <PlusIcon size={16} />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => zoomBy(-1)}>
            <MinusIcon size={16} />
          </MapButton>
          <MapButton
            label={follow ? "Stop following my position" : "Follow my position"}
            pressed={follow}
            disabled={!fix}
            onClick={() => setFollow(!follow)}
          >
            <TargetIcon size={16} />
          </MapButton>
        </div>

        {/* Opaque, not a tint: the tiles underneath can be any brightness, and a
            translucent chip lets a place name print straight through the bar. */}
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-paper px-2 py-1 font-mono text-[10px] text-ink-soft">
            <span
              aria-hidden
              className="block h-[3px] rounded-full bg-ink-soft"
              style={{ width: bar.px }}
            />
            {bar.label}
          </div>
        </div>
      </div>

      <p id="map-help" className="sr-only">
        Drag or use the arrow keys to move the map. Use plus and minus to zoom, or pinch and scroll.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="font-mono text-[11px] text-ink-soft">
          Centre <span className="text-text">{formatDecimal(center)}</span> · z{zoom.toFixed(1)}
          {fix && (
            <>
              {" "}
              · fix ±<span className="text-text">{formatDistance(fix.accuracy)}</span>
            </>
          )}
        </p>
        <p className="text-[10.5px] leading-tight text-ink-soft">{credits.join(" · ")}</p>
      </div>
    </section>
  );
}
