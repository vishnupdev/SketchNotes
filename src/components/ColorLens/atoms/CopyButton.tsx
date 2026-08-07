"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { copyText } from "@/lib/ColorLens/export";
import { CheckIcon, CopyIcon } from "@/components/SketchNotes/atoms/icons";

interface CopyButtonProps {
  value: string;
  /** What is being copied, e.g. "HEX" — used in the accessible name. */
  label: string;
  size?: number;
  className?: string;
}

/** How long the confirmation stays on screen. */
const FLASH_MS = 1400;

/**
 * Copy one value to the clipboard, confirming only when the write actually
 * succeeded — a browser that blocks the clipboard should not show "Copied".
 * The result is announced politely so the confirmation isn't purely visual.
 */
export function CopyButton({ value, label, size = 15, className }: CopyButtonProps) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending reset if the button unmounts mid-flash.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function onCopy() {
    if (!(await copyText(value))) return;
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), FLASH_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}, ${value}`}
        title={`Copy ${label}`}
        className={cx(
          "grid shrink-0 place-items-center rounded-lg border border-transparent p-1.5 text-ink-soft transition-colors hover:border-border hover:bg-panel hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          done && "text-accent",
          className,
        )}
      >
        {done ? <CheckIcon size={size} /> : <CopyIcon size={size} />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {done ? `${label} copied` : ""}
      </span>
    </>
  );
}
