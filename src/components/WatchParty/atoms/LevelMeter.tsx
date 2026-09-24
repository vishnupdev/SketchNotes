"use client";

import { useEffect, useRef } from "react";

/**
 * A thin bar showing how loud something is right now. `read` is polled about
 * twenty times a second and the bar is moved with a transform, so the meter
 * never re-renders React and never shifts layout.
 */
export function LevelMeter({ read, label }: { read: () => number; label: string }) {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let shown = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 50) return;
      last = now;
      // Rise at once, fall gently — the way a hardware meter reads.
      const level = read();
      shown = level > shown ? level : shown * 0.8 + level * 0.2;
      if (bar.current) bar.current.style.transform = `scaleX(${shown.toFixed(3)})`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [read]);

  return (
    <span role="img" aria-label={label} className="block h-1.5 w-full overflow-hidden rounded-full bg-border">
      <span ref={bar} className="block h-full w-full origin-left scale-x-0 rounded-full bg-accent" />
    </span>
  );
}
