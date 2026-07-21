"use client";

import { useEffect, useRef, useState } from "react";
import type { Crop } from "@/lib/image/helpers";

const MIN = 24; // minimum crop size in source pixels
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const CORNERS = ["nw", "ne", "sw", "se"] as const;
type Corner = (typeof CORNERS)[number];

/** Interactive crop overlay: drag the box to move, corners to resize. When an
 *  aspect ratio is set, resizing keeps it locked. Coords are source pixels. */
export function CropStage({
  url,
  imgW,
  imgH,
  crop,
  setCrop,
  aspect,
}: {
  url: string;
  imgW: number;
  imgH: number;
  crop: Crop;
  setCrop: (c: Crop) => void;
  aspect: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const cropRef = useRef(crop);
  cropRef.current = crop;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale((el.clientWidth || imgW) / imgW);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [imgW]);

  const beginDrag = (mode: "move" | Corner) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = { cx: e.clientX, cy: e.clientY, c: { ...cropRef.current } };
    const move = (ev: PointerEvent) => {
      const s = scaleRef.current || 1;
      const dx = (ev.clientX - start.cx) / s;
      const dy = (ev.clientY - start.cy) / s;
      let { x, y, w, h } = start.c;
      const asp = aspectRef.current;

      if (mode === "move") {
        x = clamp(start.c.x + dx, 0, imgW - w);
        y = clamp(start.c.y + dy, 0, imgH - h);
      } else {
        const right = start.c.x + start.c.w;
        const bottom = start.c.y + start.c.h;
        let nx = start.c.x,
          ny = start.c.y,
          nw = start.c.w,
          nh = start.c.h;
        if (mode.includes("e")) nw = clamp(start.c.w + dx, MIN, imgW - start.c.x);
        if (mode.includes("s")) nh = clamp(start.c.h + dy, MIN, imgH - start.c.y);
        if (mode.includes("w")) {
          nx = clamp(start.c.x + dx, 0, right - MIN);
          nw = right - nx;
        }
        if (mode.includes("n")) {
          ny = clamp(start.c.y + dy, 0, bottom - MIN);
          nh = bottom - ny;
        }
        if (asp) {
          nh = nw / asp;
          if (mode.includes("n")) ny = bottom - nh;
          if (ny < 0) {
            ny = 0;
            nh = bottom - ny;
            nw = nh * asp;
            if (mode.includes("w")) nx = right - nw;
          }
          if (ny + nh > imgH) {
            nh = imgH - ny;
            nw = nh * asp;
            if (mode.includes("w")) nx = right - nw;
          }
          if (nx < 0) {
            nx = 0;
            nw = right - nx;
            nh = nw / asp;
            if (mode.includes("n")) ny = bottom - nh;
          }
          if (nx + nw > imgW) {
            nw = imgW - nx;
            nh = nw / asp;
            if (mode.includes("n")) ny = bottom - nh;
          }
        }
        x = nx;
        y = ny;
        w = nw;
        h = nh;
      }
      setCrop({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const cornerPos: Record<Corner, string> = {
    nw: "left-[-7px] top-[-7px] cursor-nwse-resize",
    ne: "right-[-7px] top-[-7px] cursor-nesw-resize",
    sw: "left-[-7px] bottom-[-7px] cursor-nesw-resize",
    se: "right-[-7px] bottom-[-7px] cursor-nwse-resize",
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-border bg-panel"
      style={{ maxWidth: imgW }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" draggable={false} className="block w-full" />
      <div
        onPointerDown={beginDrag("move")}
        className="absolute cursor-move outline outline-2 outline-accent"
        style={{
          left: crop.x * scale,
          top: crop.y * scale,
          width: crop.w * scale,
          height: crop.h * scale,
          boxShadow: "0 0 0 9999px rgba(0,0,0,.5)",
        }}
      >
        {CORNERS.map((pos) => (
          <span
            key={pos}
            onPointerDown={beginDrag(pos)}
            className={`absolute size-3.5 rounded-[3px] border-2 border-white bg-accent ${cornerPos[pos]}`}
          />
        ))}
      </div>
    </div>
  );
}
