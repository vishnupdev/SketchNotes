"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/Resources/format";

/**
 * How long a resource has been held, ticking once a second.
 *
 * The clock lives in this leaf rather than in the panel above it so that a
 * running session re-renders one `<time>` element per second instead of the
 * whole Live tab — which is also why the interval is cleared the moment the
 * session it belongs to unmounts.
 */
export function Elapsed({ since, className }: { since: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ms = Math.max(0, now - since);
  return (
    <time className={className} dateTime={`PT${Math.round(ms / 1000)}S`}>
      {formatElapsed(ms)}
    </time>
  );
}
