"use client";

import { useEffect, useRef } from "react";

/**
 * A number that counts up to its value when it first appears. It writes to the
 * DOM directly rather than through state, so the count costs no renders, and
 * under reduced motion it simply shows the value.
 */
export function CountUp({ value, decimals = 0, ms = 900 }: { value: number; decimals?: number; ms?: number }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const final = value.toFixed(decimals);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      node.textContent = final;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = (value * eased).toFixed(decimals);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      node.textContent = final;
    };
  }, [value, decimals, ms]);

  // The final value is rendered too, so it is right before hydration, without
  // script, and for anything reading the DOM rather than watching it.
  return (
    <span ref={el} className="tabular-nums">
      {value.toFixed(decimals)}
    </span>
  );
}
