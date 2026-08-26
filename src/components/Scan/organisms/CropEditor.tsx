"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScanStore, type ScanPage } from "@/store/useScanStore";
import {
  applyFilter,
  applyWarp,
  canvasToJpeg,
  loadImage,
  rotateCanvas,
  SCAN_FILTERS,
} from "@/lib/Scan/enhance";
import {
  fullFrameQuad,
  homographyFor,
  outputSize,
  quadIsUsable,
  type Point,
  type Quad,
} from "@/lib/Scan/warp";
import {
  ChevronLeftIcon,
  RotateIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** Corner labels, in the quad's order, for the drag handles' accessible names. */
const CORNER_LABELS = ["top-left", "top-right", "bottom-right", "bottom-left"];

/** Keyboard nudge, in source pixels. */
const NUDGE = 12;

/**
 * Mark the page's corners and see the flattened result.
 *
 * Two panes: the capture with four draggable corners, and the warped output. The
 * output is re-derived whenever anything changes — which is the reason the store
 * clears `processed` on every edit rather than the component tracking its own
 * dirty flag.
 *
 * The handles are keyboard-operable, not just draggable. A four-corner drag is the
 * kind of control that is trivially made mouse-only, and there is no alternative
 * route to the same result — so each corner is a real focusable button that the
 * arrow keys move (rule #7).
 */
export function CropEditor({ page }: { page: ScanPage }) {
  const setQuad = useScanStore((s) => s.setQuad);
  const setFilter = useScanStore((s) => s.setFilter);
  const rotate = useScanStore((s) => s.rotate);
  const setProcessed = useScanStore((s) => s.setProcessed);
  const remove = useScanStore((s) => s.remove);
  const edit = useScanStore((s) => s.edit);
  const setBusy = useScanStore((s) => s.setBusy);

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  /** Convert a pointer position to the original image's pixel space. */
  const toSource = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      // Clamped to the image: a corner outside it would sample white and is never
      // what someone means to do.
      return {
        x: Math.max(0, Math.min(page.width, ((clientX - rect.left) / rect.width) * page.width)),
        y: Math.max(0, Math.min(page.height, ((clientY - rect.top) / rect.height) * page.height)),
      };
    },
    [page.height, page.width],
  );

  const moveCorner = (index: number, next: Point) => {
    const quad = page.quad.slice() as Quad;
    quad[index] = next;
    setQuad(page.id, quad);
  };

  // Re-derive the output whenever the store has cleared it.
  useEffect(() => {
    if (page.processed !== null) return;

    let cancelled = false;
    setRendering(true);
    setBusy(true);
    setError(null);

    (async () => {
      try {
        if (!quadIsUsable(page.quad)) {
          if (!cancelled) setError("Those corners do not enclose an area. Drag them further apart.");
          return;
        }

        const image = await loadImage(page.original);
        if (cancelled) return;

        const { width, height } = outputSize(page.quad);
        const h = homographyFor(page.quad, width, height);
        if (!h) {
          if (!cancelled) setError("Those corners could not be flattened. Try moving one of them.");
          return;
        }

        let canvas = applyWarp(image, page.quad, width, height, h);
        if (!canvas) {
          if (!cancelled) setError("This page could not be processed.");
          return;
        }

        applyFilter(canvas, page.filter);
        canvas = rotateCanvas(canvas, page.rotation);

        if (!cancelled) setProcessed(page.id, canvasToJpeg(canvas));
      } catch {
        if (!cancelled) setError("This page could not be processed.");
      } finally {
        if (!cancelled) {
          setRendering(false);
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setBusy(false);
    };
  }, [page.filter, page.id, page.original, page.processed, page.quad, page.rotation, setBusy, setProcessed]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => edit(null)}
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
        >
          <ChevronLeftIcon size={15} />
          All pages
        </button>

        <span className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setQuad(page.id, fullFrameQuad(page.width, page.height))}
            className="tint rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
          >
            Whole picture
          </button>
          <button
            type="button"
            onClick={() => rotate(page.id, 1)}
            aria-label="Rotate a quarter turn"
            className="tint grid size-9 place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-accent hover:text-accent"
          >
            <RotateIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => remove(page.id)}
            aria-label="Delete this page"
            className="tint grid size-9 place-items-center rounded-full border border-border bg-panel text-ink-soft hover:border-danger hover:text-danger"
          >
            <TrashSmallIcon size={15} />
          </button>
        </span>
      </div>

      <div className="grid gap-3 min-[820px]:grid-cols-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Mark the page&rsquo;s corners
          </span>
          <div
            ref={stageRef}
            className="relative mt-1 select-none touch-none overflow-hidden rounded-[12px] border border-border bg-panel"
            onPointerMove={(e) => {
              if (dragging === null) return;
              const point = toSource(e.clientX, e.clientY);
              if (point) moveCorner(dragging, point);
            }}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.original}
              alt="The captured page, with draggable corner markers"
              className="block h-auto w-full"
              draggable={false}
            />

            {/* The marked region, as an overlay. `preserveAspectRatio="none"` with
                a viewBox in source pixels means the SVG scales with the image and
                the corner maths needs no separate display-space conversion. */}
            <svg
              viewBox={`0 0 ${page.width} ${page.height}`}
              preserveAspectRatio="none"
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full"
            >
              <polygon
                points={page.quad.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="var(--accent)"
                fillOpacity={0.16}
                stroke="var(--accent)"
                strokeWidth={Math.max(2, page.width / 300)}
              />
            </svg>

            {page.quad.map((corner, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${CORNER_LABELS[i]} corner. Use the arrow keys to move it.`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(i);
                }}
                onKeyDown={(e) => {
                  const step =
                    e.key === "ArrowLeft"
                      ? { x: -NUDGE, y: 0 }
                      : e.key === "ArrowRight"
                        ? { x: NUDGE, y: 0 }
                        : e.key === "ArrowUp"
                          ? { x: 0, y: -NUDGE }
                          : e.key === "ArrowDown"
                            ? { x: 0, y: NUDGE }
                            : null;
                  if (!step) return;
                  e.preventDefault();
                  moveCorner(i, {
                    x: Math.max(0, Math.min(page.width, corner.x + step.x)),
                    y: Math.max(0, Math.min(page.height, corner.y + step.y)),
                  });
                }}
                style={{
                  left: `${(corner.x / page.width) * 100}%`,
                  top: `${(corner.y / page.height) * 100}%`,
                }}
                className={cx(
                  "absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-paper/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  dragging === i && "scale-110",
                )}
              >
                <span aria-hidden className="size-2 rounded-full bg-accent" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Flattened
          </span>
          <div className="mt-1 grid min-h-[180px] place-items-center overflow-hidden rounded-[12px] border border-border bg-panel p-2">
            {error ? (
              <p role="alert" className="px-3 py-6 text-center text-[12.5px] leading-relaxed text-danger">
                {error}
              </p>
            ) : page.processed ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={page.processed}
                alt="The page, flattened and enhanced"
                className="block h-auto max-h-[60vh] w-auto max-w-full"
              />
            ) : (
              <p className="px-3 py-6 text-center text-[12.5px] text-ink-soft">
                {rendering ? "Flattening the page…" : "Waiting to process."}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">Finish</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SCAN_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(page.id, f.id)}
              title={f.hint}
              aria-current={f.id === page.filter}
              className={cx(
                "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                f.id === page.filter
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-panel text-ink-soft hover:text-text",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
          {SCAN_FILTERS.find((f) => f.id === page.filter)?.hint}
        </p>
      </div>
    </div>
  );
}
