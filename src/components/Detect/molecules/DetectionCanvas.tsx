"use client";

import { useEffect, useRef } from "react";
import { fitSource, type TrackedDetection } from "@/lib/Detect/detections";
import { drawBoxes, type BoxPalette } from "@/lib/Detect/draw";
import { cx } from "@/lib/utils";

interface DetectionCanvasProps {
  /** Natural size of the video or picture underneath, in its own pixels. */
  sourceSize: { width: number; height: number };
  /**
   * The boxes to paint, read at paint time rather than passed as a value.
   *
   * This is the whole reason the overlay is a component of its own. Detections
   * arrive about ten times a second; holding them in React state would
   * re-render this panel — and its parent — on every frame, to change nothing
   * but a canvas the renderer cannot see anyway. So the loop keeps them in a
   * ref and the canvas pulls them, and React renders when the *settings*
   * change, which is to say hardly ever.
   */
  getDetections: () => readonly TrackedDetection[];
  /** Repaint continuously. Off for a still, where `revision` triggers a paint. */
  live: boolean;
  /** Bump to repaint a still after its detections changed. */
  revision?: number;
  showScores?: boolean;
  className?: string;
}

/** The theme tokens the overlay draws with (rule #6 — no colours in here). */
const PALETTE_TOKENS: Record<keyof BoxPalette, string> = {
  box: "--detect-box",
  held: "--detect-box-held",
  ink: "--detect-box-ink",
};

/**
 * The boxes, painted over whatever is underneath.
 *
 * Sized in CSS pixels and backed at device resolution, so the brackets are
 * crisp on a phone rather than the soft doubled lines a 1× canvas gives on a 3×
 * screen. It never reads the video itself and never holds a frame — it is handed
 * geometry and paints it.
 *
 * The canvas is `aria-hidden` and the panels announce the same information as a
 * sentence instead (see `summarise`). A canvas of rectangles is nothing at all
 * to a screen reader, and `role="img"` with a long label would re-announce the
 * whole scene ten times a second.
 */
export function DetectionCanvas({
  sourceSize,
  getDetections,
  live,
  revision = 0,
  showScores = true,
  className,
}: DetectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<BoxPalette | null>(null);

  // Read the theme's colours once, and again whenever the theme attribute
  // changes — switching to dark mode mid-detection has to recolour the boxes,
  // and re-reading computed style on every frame would force a style recalc ten
  // times a second for a value that changes about twice a year.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const readPalette = () => {
      const styles = getComputedStyle(canvas);
      const value = (token: string) => styles.getPropertyValue(token).trim();
      paletteRef.current = {
        box: value(PALETTE_TOKENS.box),
        held: value(PALETTE_TOKENS.held),
        ink: value(PALETTE_TOKENS.ink),
      };
    };

    readPalette();
    const observer = new MutationObserver(readPalette);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-dark"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frame = 0;

    const paint = () => {
      const ctx = canvas.getContext("2d");
      const palette = paletteRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!ctx || !palette || width <= 0 || height <= 0) return;

      // Match the backing store to the element, at device resolution. Assigning
      // width/height also clears the canvas, so this doubles as the wipe — and
      // it is skipped when nothing changed, because re-assigning them every
      // frame reallocates the buffer.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const backingWidth = Math.round(width * dpr);
      const backingHeight = Math.round(height * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      } else {
        ctx.clearRect(0, 0, backingWidth, backingHeight);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBoxes(ctx, getDetections(), {
        fit: fitSource(sourceSize, { width, height }),
        view: { width, height },
        palette,
        showScores,
      });
    };

    // A still paints once — and again whenever the element's size changes.
    // Without this, rotating a phone or dragging a window edge leaves the boxes
    // where they were: the canvas stretches, the letterboxing underneath it
    // moves, and every bracket is quietly wrong until something else happens to
    // re-render. The live view gets it for free from its own loop, but an
    // observer costs nothing there and keeps the two paths identical.
    const observer = new ResizeObserver(() => paint());
    observer.observe(canvas);

    if (!live) {
      paint();
      return () => observer.disconnect();
    }

    const loop = () => {
      paint();
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [live, revision, sourceSize, getDetections, showScores]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
