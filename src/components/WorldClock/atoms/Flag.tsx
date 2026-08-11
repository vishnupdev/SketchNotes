"use client";

import { useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cx } from "@/lib/utils";

interface FlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "JP". */
  code: string;
  /** Rendered width in px; height follows the 4:3 flag ratio. */
  width?: number;
  className?: string;
}

/**
 * A country flag.
 *
 * Deliberately *not* an emoji flag: Windows ships no flag glyphs at all, so
 * `🇯🇵` renders there as a pair of boxed letters — the one platform where the
 * app would look broken. An image is the same everywhere.
 *
 * It degrades in the two ways that matter. On a metered or 2g-class link the
 * request is skipped outright, and a failed load — offline, blocked, cache
 * miss — falls back to the ISO code in a bordered tile. The tile is always the
 * same size as the image, so no fallback can shift the layout (rule #7).
 */
export function Flag({ code, width = 32, className }: FlagProps) {
  const { slow } = useNetworkStatus();
  const [broken, setBroken] = useState(false);
  const height = Math.round(width * 0.75);
  const lower = code.toLowerCase();

  const box = cx(
    "inline-grid flex-none place-items-center overflow-hidden rounded-[4px] border border-border bg-paper",
    className,
  );

  if (slow || broken) {
    return (
      <span
        aria-hidden
        className={cx(box, "font-mono font-bold leading-none text-ink-soft")}
        style={{ width, height, fontSize: Math.round(width * 0.38) }}
      >
        {code}
      </span>
    );
  }

  return (
    <span aria-hidden className={box} style={{ width, height }}>
      {/* Plain <img>: explicitly sized to avoid CLS, lazy so flags far down a
          long country list don't fetch until they're near the viewport. */}
      <img
        src={`https://flagcdn.com/w${width <= 40 ? 80 : 160}/${lower}.png`}
        alt=""
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-full object-cover"
      />
    </span>
  );
}
