"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeHandwriting, type Stroke } from "@/lib/MalayalamWriter/handwriting-api";
import { cx } from "@/lib/utils";
import { TrashSmallIcon, UndoIcon } from "@/components/SketchNotes/atoms/icons";

type Mode = "ink" | "recognize";

interface HandwritingPadProps {
  /** Insert a chosen recognized candidate into the document. */
  onInsert: (text: string) => void;
}

/**
 * Draw Malayalam with a finger, stylus or mouse. Two modes:
 *  - Freehand: strokes stay as ink and never leave the browser.
 *  - Recognize: strokes are sent to the recognition service (online) and the
 *    returned candidate words can be tapped into the document.
 */
export function HandwritingPad({ onInsert }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [mode, setMode] = useState<Mode>("recognize");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  /** Repaint the whole canvas from the stored strokes (theme-aware colour). */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const s of strokesRef.current) {
      ctx.beginPath();
      for (let i = 0; i < s.x.length; i++) {
        if (i === 0) ctx.moveTo(s.x[i], s.y[i]);
        else ctx.lineTo(s.x[i], s.y[i]);
      }
      ctx.stroke();
    }
  }, []);

  // Size the canvas backing store to its display box × DPR (crisp on retina),
  // and repaint on mount and whenever the box resizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  function pointFromEvent(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Math.round(e.timeStamp) };
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    drawingRef.current = { x: [p.x], y: [p.y], t: [p.t] };
  }

  function move(e: React.PointerEvent) {
    const stroke = drawingRef.current;
    if (!stroke) return;
    const p = pointFromEvent(e);
    stroke.x.push(p.x);
    stroke.y.push(p.y);
    stroke.t.push(p.t);
    redraw();
    // Draw the in-progress stroke on top of the committed ones.
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(stroke.x[stroke.x.length - 2] ?? p.x, stroke.y[stroke.y.length - 2] ?? p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  function end() {
    const stroke = drawingRef.current;
    if (!stroke) return;
    if (stroke.x.length > 1) {
      strokesRef.current.push(stroke);
      setHasInk(true);
    }
    drawingRef.current = null;
  }

  function undo() {
    strokesRef.current.pop();
    setHasInk(strokesRef.current.length > 0);
    setCandidates([]);
    redraw();
  }

  function clear() {
    strokesRef.current = [];
    setHasInk(false);
    setCandidates([]);
    setStatus("idle");
    redraw();
  }

  async function recognize() {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    setStatus("loading");
    setCandidates([]);
    try {
      const result = await recognizeHandwriting(strokesRef.current, rect.width, rect.height);
      setCandidates(result);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-full gap-1 rounded-2xl border border-border bg-panel p-1">
        <button
          type="button"
          onClick={() => setMode("recognize")}
          aria-current={mode === "recognize"}
          className={cx(
            "flex-1 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors",
            mode === "recognize" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-text",
          )}
        >
          Recognize to text
        </button>
        <button
          type="button"
          onClick={() => setMode("ink")}
          aria-current={mode === "ink"}
          className={cx(
            "flex-1 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors",
            mode === "ink" ? "bg-accent text-on-accent" : "text-ink-soft hover:text-text",
          )}
        >
          Freehand ink
        </button>
      </div>

      <p className="text-[12px] text-ink-soft">
        {mode === "recognize"
          ? "Write a word, then Recognize. Uses an online service — strokes are sent for recognition."
          : "Write freely with finger, stylus or mouse. Ink stays in your browser."}
      </p>

      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Handwriting area"
        className="h-56 w-full touch-none rounded-2xl border border-border bg-paper text-text sm:h-64"
      />

      <div className="flex flex-wrap items-center gap-2">
        {mode === "recognize" && (
          <button
            type="button"
            onClick={recognize}
            disabled={!hasInk || status === "loading"}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110 disabled:opacity-40"
          >
            {status === "loading" ? "Recognizing…" : "Recognize"}
          </button>
        )}
        <button
          type="button"
          onClick={undo}
          disabled={!hasInk}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
        >
          <UndoIcon size={15} /> Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-semibold text-ink-soft hover:text-text disabled:opacity-40"
        >
          <TrashSmallIcon size={15} /> Clear
        </button>
      </div>

      {status === "error" && (
        <p className="text-[12.5px] text-ink-soft" role="alert">
          Couldn&apos;t reach the recognition service. Check your connection and try again.
        </p>
      )}

      {candidates.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
            Tap to insert
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <button
                key={c}
                type="button"
                lang="ml"
                onClick={() => {
                  onInsert(c + " ");
                  clear();
                }}
                className="rounded-full border border-border bg-panel px-4 py-2 text-[17px] transition-colors hover:border-accent hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
