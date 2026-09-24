"use client";

import type { CSSProperties } from "react";
import { cycleSeconds, previewPoints, type Pattern } from "@/lib/Breathe/patterns";

const W = 132;
const H = 40;

/**
 * One cycle of a pattern as its level curve — up the inhale, flat through a
 * hold, down the exhale — with a dot riding it at the pattern's real speed.
 * The same phases the orb plays draw it, so the preview cannot disagree with
 * the exercise. Drawn at 1:1 so the rider's `offset-path` (in CSS pixels)
 * lands exactly on the line.
 */
export function PatternCurve({ pattern, ride }: { pattern: Pattern; ride: boolean }) {
  const points = previewPoints(pattern, W, H);
  const path = `M ${points.split(" ").join(" L ")}`;

  return (
    <span aria-hidden className="relative block flex-none" style={{ width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        <polyline
          points={`0,${H} ${points} ${W},${H}`}
          className="fill-accent-soft stroke-none"
        />
        <polyline
          points={points}
          fill="none"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-accent"
        />
      </svg>
      {ride && (
        <span
          className="breathe-rider"
          style={{ offsetPath: `path("${path}")`, "--cycle": `${cycleSeconds(pattern)}s` } as CSSProperties}
        />
      )}
    </span>
  );
}
