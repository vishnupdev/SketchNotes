"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recognizeHandwriting, type Stroke } from "@/lib/MalayalamWriter/handwriting-api";
import { cx } from "@/lib/utils";
import { TrashSmallIcon, UndoIcon } from "@/components/SketchNotes/atoms/icons";

type Mode = "ink" | "recognize";

/** Shared pen settings for both the incremental live stroke and full repaints. */
function applyPen(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

/** Debounce before refreshing the live guess, and the longer rest that commits it. */
const PREVIEW_DELAY_MS = 450;
const COMMIT_DELAY_MS = 1400;

interface HandwritingPadProps {
  /** Insert a chosen recognized candidate into the document. */
  onInsert: (text: string) => void;
  /** Show/replace the in-progress handwriting guess at the caret (auto mode). */
  onPreview: (word: string) => void;
  /** Finish the guess: `true` keeps it in the document, `false` removes it. */
  onPreviewEnd: (commit: boolean) => void;
}

/**
 * Draw Malayalam with a finger, stylus or mouse. Two modes:
 *  - Freehand: strokes stay as ink and never leave the browser.
 *  - Recognize: strokes are sent to the recognition service (online). With
 *    auto-convert on, the guess streams live into the document and finalises on
 *    a pause; with it off, candidate words can be tapped into the document.
 */
export function HandwritingPad({ onInsert, onPreview, onPreviewEnd }: HandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  // Cached per active stroke so the hot move() path never triggers layout
  // (getBoundingClientRect) or a style recalc (getComputedStyle).
  const rectRef = useRef<DOMRect | null>(null);
  const colorRef = useRef<string>("currentColor");
  // Live-preview timers: a short debounce refreshes the guess as you write; a
  // longer rest finalises it. `composing` marks that an uncommitted guess is
  // currently shown in the document; `lastWord` is that guess.
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const lastWordRef = useRef("");
  const [hasInk, setHasInk] = useState(false);
  const [mode, setMode] = useState<Mode>("recognize");
  const [auto, setAuto] = useState(true);
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
    colorRef.current = getComputedStyle(canvas).color;
    applyPen(ctx, colorRef.current);
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

  const clearAutoTimers = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  // When auto-convert is switched off, the mode changes, or the pad unmounts,
  // stop the timers and freeze any word still being previewed.
  useEffect(() => {
    if (!(mode === "recognize" && auto)) clearAutoTimers();
    return () => {
      clearAutoTimers();
      if (composingRef.current) {
        onPreviewEnd(true);
        composingRef.current = false;
      }
    };
  }, [mode, auto, onPreviewEnd]);

  /** Map a pointer event to canvas-local coords using the cached rect. */
  function pointFromEvent(e: { clientX: number; clientY: number; timeStamp: number }) {
    const rect = rectRef.current!;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Math.round(e.timeStamp) };
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    clearAutoTimers(); // resuming the word cancels the pending recognise/commit
    // Cache the rect and current pen colour once, then prime the context so the
    // live stroke can be drawn without re-reading layout/style per move.
    rectRef.current = canvas.getBoundingClientRect();
    colorRef.current = getComputedStyle(canvas).color;
    applyPen(ctx, colorRef.current);
    const p = pointFromEvent(e.nativeEvent);
    drawingRef.current = { x: [p.x], y: [p.y], t: [p.t] };
  }

  function move(e: React.PointerEvent) {
    const stroke = drawingRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!stroke || !ctx) return;
    // Draw ONLY the new segment(s) on top of the existing ink — no full repaint,
    // so a move costs the same whether the canvas is empty or full of strokes.
    // Coalesced events recover the sub-frame points the browser batched, keeping
    // fast strokes smooth on touch and high-refresh screens.
    const native = e.nativeEvent;
    const coalesced = native.getCoalescedEvents?.();
    const points = coalesced && coalesced.length ? coalesced : [native];
    ctx.beginPath();
    ctx.moveTo(stroke.x[stroke.x.length - 1], stroke.y[stroke.y.length - 1]);
    for (const ev of points) {
      const p = pointFromEvent(ev);
      stroke.x.push(p.x);
      stroke.y.push(p.y);
      stroke.t.push(p.t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function end() {
    const stroke = drawingRef.current;
    if (!stroke) return;
    if (stroke.x.length > 1) {
      strokesRef.current.push(stroke);
      setHasInk(true);
      // Refresh the live guess shortly after the pen rests.
      if (mode === "recognize" && auto) schedulePreview();
    }
    drawingRef.current = null;
  }

  function undo() {
    clearAutoTimers();
    strokesRef.current.pop();
    const remaining = strokesRef.current.length;
    setHasInk(remaining > 0);
    redraw();
    if (mode === "recognize" && auto) {
      // Re-recognise the reduced ink, or drop the guess if nothing's left.
      if (remaining > 0) schedulePreview();
      else if (composingRef.current) {
        onPreviewEnd(false);
        composingRef.current = false;
        setCandidates([]);
      }
    } else {
      setCandidates([]);
    }
  }

  function clear() {
    clearAutoTimers();
    // Clearing the pad discards the un-committed guess it produced.
    if (composingRef.current) {
      onPreviewEnd(false);
      composingRef.current = false;
    }
    strokesRef.current = [];
    setHasInk(false);
    setCandidates([]);
    setStatus("idle");
    redraw();
  }

  function schedulePreview() {
    clearAutoTimers();
    previewTimerRef.current = setTimeout(previewTick, PREVIEW_DELAY_MS);
  }

  /**
   * Recognise the current ink and stream the top guess into the document as a
   * live, still-editable preview. Arms a longer timer that finalises the word.
   */
  async function previewTick() {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    const snapshot = strokesRef.current;
    const len = snapshot.length;
    const rect = canvas.getBoundingClientRect();
    setStatus("loading");
    try {
      const result = await recognizeHandwriting(snapshot, rect.width, rect.height);
      // Discard a stale result: the user resumed drawing, added strokes or
      // cleared the pad while the request was in flight.
      if (drawingRef.current || strokesRef.current !== snapshot || snapshot.length !== len) {
        setStatus("idle");
        return;
      }
      setStatus("idle");
      if (result.length > 0) {
        lastWordRef.current = result[0];
        onPreview(result[0]); // live-update the writing field
        composingRef.current = true;
        setCandidates(result); // alternatives to tap if the top guess is wrong
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(commitTick, COMMIT_DELAY_MS);
      }
    } catch {
      setStatus("error");
    }
  }

  /** Finalise the previewed word (with a trailing space) and reset for the next. */
  function commitTick() {
    clearAutoTimers();
    if (composingRef.current) {
      onPreview(lastWordRef.current + " ");
      onPreviewEnd(true);
      composingRef.current = false;
    }
    strokesRef.current = [];
    setHasInk(false);
    setCandidates([]);
    redraw();
  }

  /** Tap a candidate: replace the live guess (auto) or insert it fresh (manual). */
  function pickCandidate(c: string) {
    clearAutoTimers();
    if (composingRef.current) {
      onPreview(c + " ");
      onPreviewEnd(true);
      composingRef.current = false;
      strokesRef.current = [];
      setHasInk(false);
      setCandidates([]);
      redraw();
    } else {
      onInsert(c + " ");
      clear();
    }
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
        {mode === "ink"
          ? "Write freely with finger, stylus or mouse. Ink stays in your browser."
          : auto
            ? "Write and watch it appear — your handwriting turns into text live and finalises when you pause. Uses an online service."
            : "Write a word, then Recognize. Uses an online service — strokes are sent for recognition."}
      </p>

      {mode === "recognize" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={auto}
            aria-label="Auto-convert handwriting to text"
            onClick={() => setAuto((v) => !v)}
            className={cx(
              "relative h-5 w-9 flex-none rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              auto ? "bg-accent" : "bg-border",
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 size-4 rounded-full bg-paper transition-transform",
                auto ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>
          <span className="text-[12.5px] font-medium text-text">Auto-convert to text</span>
          {auto && status === "loading" && (
            <span className="ml-auto font-mono text-[11px] text-accent" role="status">
              Recognising…
            </span>
          )}
        </div>
      )}

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
        {mode === "recognize" && !auto && (
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
            {composingRef.current ? "Tap to correct" : "Tap to insert"}
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <button
                key={c}
                type="button"
                lang="ml"
                onClick={() => pickCandidate(c)}
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
