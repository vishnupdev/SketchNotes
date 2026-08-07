"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { rgbToHex } from "@/lib/ColorLens/convert";
import { describeHex } from "@/lib/ColorLens/detail";
import type { RGB } from "@/lib/ColorLens/types";

interface PickSurfaceProps {
  imageUrl: string;
  /** 0 = single pixel, 1 = 3×3 average, 2 = 5×5 average. */
  sampleRadius: number;
  /** Called once the image is decoded, with its pixels, for palette work. */
  onAnalyzed: (data: Uint8ClampedArray, w: number, h: number) => void;
  onPick: (hex: string) => void;
  onError: (message: string) => void;
}

/**
 * Longest side of the pixel buffer we read colours from. A modern phone photo is
 * 4000px+ wide; keeping the full frame would cost ~50 MB of RGBA for no visible
 * gain, since the surface is at most ~1000 CSS px wide. 2400 keeps a 1:1 pixel
 * available at any realistic zoom while bounding memory at roughly 17 MB.
 */
const MAX_BUFFER = 2400;

/** Source pixels shown across the loupe, and its rendered size in CSS px. */
const LOUPE_PIXELS = 11;
const LOUPE_SIZE = 104;

/** Fraction of the image one arrow-key press moves the sample point. */
const KEY_STEP = 0.01;
const KEY_STEP_FAST = 0.08;

/** Normalised position within the image, 0–1 on both axes. */
interface Point {
  nx: number;
  ny: number;
}

/** Where the image actually paints inside its element, in element-local px. */
interface ContentBox {
  ox: number;
  oy: number;
  w: number;
  h: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * `object-contain` letterboxes an image whose aspect doesn't match its box, so
 * the element rect and the painted rect are not the same thing. Every pointer
 * mapping and marker position has to use the painted rect, or picks drift
 * toward the centre on tall images.
 */
function paintedBox(el: HTMLElement, natural: { w: number; h: number }): ContentBox {
  const rect = el.getBoundingClientRect();
  const scale = Math.min(rect.width / natural.w, rect.height / natural.h);
  const w = natural.w * scale;
  const h = natural.h * scale;
  return { ox: (rect.width - w) / 2, oy: (rect.height - h) / 2, w, h };
}

/**
 * The image, with an eyedropper over it.
 *
 * Colours are read from an off-screen canvas rather than from the displayed
 * `<img>`, which keeps sampling independent of how the image is currently laid
 * out: the same pixel is returned whether the surface is 360px wide on a phone
 * or 900px on a desktop. The visible element stays a plain `<img>` so the
 * browser handles decoding and scaling, and so the layout never shifts once the
 * natural size is known.
 */
export function PickSurface({
  imageUrl,
  sampleRadius,
  onAnalyzed,
  onPick,
  onError,
}: PickSurfaceProps) {
  /** Full-resolution (capped) copy of the image, the source of every reading. */
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<ImageData | null>(null);
  const loupeRef = useRef<HTMLCanvasElement | null>(null);
  /**
   * Measurements come from the <img>, never from the button: the button carries
   * a border, so its box is a pixel wider on every side and every pick would be
   * offset by that much.
   */
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<ContentBox | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  /** Live colour under the sample point — drives the loupe, not the report. */
  const [liveHex, setLiveHex] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  /* ------------------------------ decoding ------------------------------ */

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    // Local blob/data URLs only, so the canvas is never tainted and getImageData
    // is allowed — but ask for anonymous CORS anyway in case a URL is ever
    // sourced differently.
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) {
        onError("That image has no readable pixels. Try a different photo.");
        return;
      }

      const scale = Math.min(1, MAX_BUFFER / Math.max(w, h));
      const bw = Math.max(1, Math.round(w * scale));
      const bh = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = bw;
      canvas.height = bh;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        onError("This browser couldn't process the image.");
        return;
      }
      ctx.drawImage(img, 0, 0, bw, bh);

      try {
        const data = ctx.getImageData(0, 0, bw, bh);
        bufferRef.current = canvas;
        pixelsRef.current = data;
        setNatural({ w, h });
        setPoint(null);
        setLiveHex(null);
        onAnalyzed(data.data, w, h);
      } catch {
        onError("Couldn't read the image's pixels. Try attaching it again.");
      }
    };

    img.onerror = () => {
      if (!cancelled) onError("That file couldn't be opened as an image.");
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      bufferRef.current = null;
      pixelsRef.current = null;
    };
  }, [imageUrl, onAnalyzed, onError]);

  /* ---------------------------- painted rect ---------------------------- */

  // Recomputed on every resize — rotating a phone or opening the keyboard
  // changes the letterboxing, and a stale box would offset every pick.
  useEffect(() => {
    const el = imgRef.current;
    if (!el || !natural) return;
    const update = () => setBox(paintedBox(el, natural));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [natural]);

  /* ------------------------------ sampling ------------------------------ */

  /** Average the pixels in the sample square centred on a normalised point. */
  const sampleAt = useCallback(
    ({ nx, ny }: Point): string | null => {
      const data = pixelsRef.current;
      if (!data) return null;
      const { width, height } = data;
      const cx0 = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))));
      const cy0 = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))));

      let r = 0, g = 0, b = 0, n = 0;
      for (let y = cy0 - sampleRadius; y <= cy0 + sampleRadius; y++) {
        if (y < 0 || y >= height) continue;
        for (let x = cx0 - sampleRadius; x <= cx0 + sampleRadius; x++) {
          if (x < 0 || x >= width) continue;
          const o = (y * width + x) * 4;
          r += data.data[o];
          g += data.data[o + 1];
          b += data.data[o + 2];
          n++;
        }
      }
      if (n === 0) return null;
      const rgb: RGB = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
      return rgbToHex(rgb);
    },
    [sampleRadius],
  );

  /** Move the sample point and refresh the live readout. */
  const moveTo = useCallback(
    (next: Point) => {
      setPoint(next);
      setLiveHex(sampleAt(next));
    },
    [sampleAt],
  );

  // A change of sample size must re-read the current point, or the loupe would
  // keep showing the reading from the previous setting.
  useEffect(() => {
    setLiveHex((prev) => (point ? sampleAt(point) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleRadius]);

  /* -------------------------------- loupe -------------------------------- */

  useEffect(() => {
    const canvas = loupeRef.current;
    const buffer = bufferRef.current;
    if (!canvas || !buffer || !point) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const half = Math.floor(LOUPE_PIXELS / 2);
    const sx = Math.round(point.nx * (buffer.width - 1)) - half;
    const sy = Math.round(point.ny * (buffer.height - 1)) - half;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Nearest-neighbour, so the user sees actual pixels rather than a blur.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, sx, sy, LOUPE_PIXELS, LOUPE_PIXELS, 0, 0, canvas.width, canvas.height);

    // Outline the exact cell (or block) being sampled. Drawn twice, light over
    // dark, so the marker stays visible on both pale and dark pixels.
    const cell = canvas.width / LOUPE_PIXELS;
    const span = (sampleRadius * 2 + 1) * cell;
    const origin = (canvas.width - span) / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.strokeRect(origin - 1.5, origin - 1.5, span + 3, span + 3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.strokeRect(origin, origin, span, span);
  }, [point, sampleRadius]);

  /* ------------------------------- pointer ------------------------------- */

  function pointFromEvent(e: React.PointerEvent<HTMLButtonElement>): Point | null {
    const el = imgRef.current;
    if (!natural || !el) return null;
    const rect = el.getBoundingClientRect();
    const { ox, oy, w, h } = paintedBox(el, natural);
    return {
      nx: clamp01((e.clientX - rect.left - ox) / w),
      ny: clamp01((e.clientY - rect.top - oy) / h),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const next = pointFromEvent(e);
    if (!next) return;
    // Capture so a drag that leaves the image keeps sampling its edge.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moveTo(next);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    // Hovering with a mouse previews without committing; touch only tracks
    // during a drag, since there is no hover state to read.
    if (!dragging && e.pointerType === "touch") return;
    const next = pointFromEvent(e);
    if (next) moveTo(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!dragging) return;
    setDragging(false);
    const next = pointFromEvent(e);
    const hex = next && sampleAt(next);
    if (hex) onPick(hex);
  }

  function onPointerLeave() {
    if (!dragging) setPoint(null);
  }

  /* ------------------------------- keyboard ------------------------------ */

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    if (dx === 0 && dy === 0) return;
    e.preventDefault();
    // Start from the middle when the point hasn't been placed yet.
    const from = point ?? { nx: 0.5, ny: 0.5 };
    moveTo({ nx: clamp01(from.nx + dx), ny: clamp01(from.ny + dy) });
  }

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // `detail === 0` means the button was activated from the keyboard; pointer
    // activations already committed in onPointerUp.
    if (e.detail !== 0) return;
    const hex = point && sampleAt(point);
    if (hex) onPick(hex);
  }

  /* -------------------------------- render ------------------------------- */

  const readout = liveHex ? describeHex(liveHex) : null;
  // Keep the loupe away from the sample point so it never hides what's under it.
  const loupeRight = !point || point.nx < 0.6;

  return (
    <div>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
        onClick={onClick}
        aria-label="Pick a colour from the image. Move the pointer, or use the arrow keys and press Enter."
        aria-describedby="colorlens-readout"
        className="block w-full cursor-crosshair touch-none overflow-hidden rounded-2xl border border-border bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {/* Positioning context for the overlays: exactly the image's box, with
            none of the button's border, so the crosshair lands where it should. */}
        <span className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element -- a user-supplied
              blob/data URL: next/image can neither optimise nor pre-size it, and
              the natural dimensions below already prevent layout shift. */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            draggable={false}
            width={natural?.w}
            height={natural?.h}
            className="block max-h-[58vh] w-full select-none object-contain"
          />

          {/* Crosshair at the sample point, filled with what's under it. */}
          {point && box && (
            <span
              aria-hidden
              className="pointer-events-none absolute z-10 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,.55)]"
              style={{
                left: box.ox + point.nx * box.w,
                top: box.oy + point.ny * box.h,
                background: liveHex ?? "transparent",
              }}
            />
          )}

          {/* Zoomed pixels, pinned to a corner so a finger never covers them. */}
          <span
            aria-hidden
            className={cx(
              "pointer-events-none absolute top-3 z-20 flex flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-panel transition-opacity duration-150",
              loupeRight ? "right-3" : "left-3",
              point ? "opacity-100" : "opacity-0",
            )}
          >
            <canvas
              ref={loupeRef}
              width={LOUPE_SIZE}
              height={LOUPE_SIZE}
              style={{ width: LOUPE_SIZE, height: LOUPE_SIZE }}
              className="block"
            />
            <span className="flex items-center gap-1.5 px-2 py-1.5">
              <span
                className="size-3 rounded-full border border-border"
                style={{ background: liveHex ?? "transparent" }}
              />
              <span className="font-mono text-[11px] font-semibold uppercase text-text">
                {liveHex ?? "—"}
              </span>
            </span>
          </span>
        </span>
      </button>

      {/* The live reading, for anyone not looking at the loupe. */}
      <p
        id="colorlens-readout"
        role="status"
        aria-live="polite"
        className="mt-2 text-center font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft"
      >
        {readout
          ? `${readout.hex} · ${readout.name.name}`
          : "Tap, drag or arrow-key over the image to read a colour"}
      </p>
    </div>
  );
}
