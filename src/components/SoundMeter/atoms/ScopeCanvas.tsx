"use client";

import { useEffect, useRef } from "react";
import { onFrame } from "@/lib/SoundMeter/engine";
import {
  logPosition,
  SPECTRUM_MAX_HZ,
  SPECTRUM_MIN_HZ,
  SPECTRUM_TICKS,
} from "@/lib/SoundMeter/format";
import { useEditorStore } from "@/store/useEditorStore";
import type { Frame, ScopeView } from "@/lib/SoundMeter/types";

interface ScopeCanvasProps {
  view: ScopeView;
  /** Draws the idle baseline instead of subscribing, when the mic is off. */
  live: boolean;
  /** CSS height of the plot. */
  height?: number;
}

/** Colours pulled from the active theme's tokens — never hardcoded. */
interface Palette {
  accent: string;
  border: string;
  soft: string;
  danger: string;
}

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  return {
    accent: cs.getPropertyValue("--accent").trim() || "currentColor",
    border: cs.getPropertyValue("--border").trim() || "currentColor",
    soft: cs.getPropertyValue("--ink-soft").trim() || "currentColor",
    danger: cs.getPropertyValue("--danger").trim() || "currentColor",
  };
}

/** Frequency gridlines with labels, shared by both views' backdrops. */
function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, dpr: number) {
  ctx.lineWidth = dpr;
  ctx.strokeStyle = p.border;
  ctx.fillStyle = p.soft;
  ctx.font = `${10 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = "bottom";
  for (const tick of SPECTRUM_TICKS) {
    const x = Math.round(logPosition(tick.hz, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ) * w) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h - 14 * dpr);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(tick.label, x, h - 3 * dpr);
  }
}

// Reused across frames: at 60 fps, a fresh column buffer and gradient per
// frame is pure garbage-collector pressure for no benefit.
let columnScratch = new Float32Array(0);
let gradient: CanvasGradient | null = null;
let gradientKey = "";

/**
 * Log-frequency bar spectrum. Bins are collapsed per output column by taking
 * the loudest one, so a narrow peak survives the squeeze onto a log axis
 * instead of being averaged away by its silent neighbours.
 */
function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  w: number,
  h: number,
  p: Palette,
  dpr: number,
) {
  const plotH = h - 16 * dpr;
  const width = Math.max(1, Math.ceil(w));
  if (columnScratch.length !== width) columnScratch = new Float32Array(width);
  else columnScratch.fill(0);
  const columns = columnScratch;
  const { spectrum, binHz } = frame;
  for (let i = 1; i < spectrum.length; i++) {
    const hz = i * binHz;
    if (hz < SPECTRUM_MIN_HZ || hz > SPECTRUM_MAX_HZ) continue;
    const x = Math.min(columns.length - 1, Math.floor(logPosition(hz, SPECTRUM_MIN_HZ, SPECTRUM_MAX_HZ) * (columns.length - 1)));
    const v = spectrum[i] / 255;
    if (v > columns[x]) columns[x] = v;
  }

  // Bins are sparse at the bottom of a log axis (one bin can span several
  // octaves' worth of columns down there), so carry the last value forward
  // across the gaps rather than drawing stripes.
  let carried = 0;
  ctx.beginPath();
  ctx.moveTo(0, plotH);
  for (let x = 0; x < columns.length; x++) {
    if (columns[x] > 0) carried = columns[x];
    else columns[x] = carried;
    ctx.lineTo(x, plotH - columns[x] * plotH);
  }
  ctx.lineTo(columns.length - 1, plotH);
  ctx.closePath();

  const key = `${plotH}|${p.accent}|${p.border}`;
  if (!gradient || gradientKey !== key) {
    gradient = ctx.createLinearGradient(0, 0, 0, plotH);
    gradient.addColorStop(0, p.accent);
    gradient.addColorStop(1, p.border);
    gradientKey = key;
  }
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5 * dpr;
  ctx.strokeStyle = p.accent;
  ctx.stroke();
}

/**
 * Time-domain scope. Each output column shows the min and max sample it
 * covers, which is what makes a waveform read as a solid band rather than a
 * jagged line that aliases differently every frame.
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  w: number,
  h: number,
  p: Palette,
  dpr: number,
) {
  const mid = h / 2;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(mid) + 0.5);
  ctx.lineTo(w, Math.round(mid) + 0.5);
  ctx.stroke();

  const buf = frame.waveform;
  const perColumn = Math.max(1, Math.floor(buf.length / Math.max(1, w)));
  ctx.strokeStyle = frame.level.clipping ? p.danger : p.accent;
  ctx.lineWidth = 1.6 * dpr;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const from = x * perColumn;
    if (from >= buf.length) break;
    let min = 1;
    let max = -1;
    for (let i = from; i < from + perColumn && i < buf.length; i++) {
      if (buf[i] < min) min = buf[i];
      if (buf[i] > max) max = buf[i];
    }
    ctx.moveTo(x + 0.5, mid - max * mid * 0.94);
    ctx.lineTo(x + 0.5, mid - min * mid * 0.94);
  }
  ctx.stroke();
}

/** Flat line + grid shown before the microphone is started. */
function drawIdle(ctx: CanvasRenderingContext2D, view: ScopeView, w: number, h: number, p: Palette, dpr: number) {
  if (view === "spectrum") {
    drawGrid(ctx, w, h, p, dpr);
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, h - 16 * dpr);
    ctx.lineTo(w, h - 16 * dpr);
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(h / 2) + 0.5);
  ctx.lineTo(w, Math.round(h / 2) + 0.5);
  ctx.stroke();
}

/**
 * The live plot — spectrum or waveform, on one canvas.
 *
 * It subscribes to the analysis loop directly and paints outside React: a
 * 60 fps render pass through the component tree would cost far more than the
 * drawing itself. All colour comes from the theme's CSS tokens, re-read when
 * the palette changes.
 */
export function ScopeCanvas({ view, live, height = 168 }: ScopeCanvasProps) {
  const themeId = useEditorStore((s) => s.themeId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Kept in refs so the draw callback never needs re-subscribing mid-stream.
  const paletteRef = useRef<Palette | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Size the backing store to the device pixel ratio, and re-read the theme
  // colours whenever the palette or the box changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      paletteRef.current = readPalette(canvas);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [themeId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const paint = (frame: Frame | null) => {
      const palette = paletteRef.current ?? readPalette(canvas);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (!frame) {
        drawIdle(ctx, viewRef.current, w, h, palette, dpr);
        return;
      }
      if (viewRef.current === "spectrum") {
        drawGrid(ctx, w, h, palette, dpr);
        drawSpectrum(ctx, frame, w, h, palette, dpr);
      } else {
        drawWaveform(ctx, frame, w, h, palette, dpr);
      }
    };

    if (!live) {
      paint(null);
      return;
    }
    return onFrame(paint);
  }, [live, view, themeId]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={
        view === "spectrum"
          ? "Live frequency spectrum from 20 Hz to 20 kHz"
          : "Live waveform of the microphone signal"
      }
      className="w-full rounded-xl border border-border bg-paper"
      style={{ height }}
    />
  );
}
