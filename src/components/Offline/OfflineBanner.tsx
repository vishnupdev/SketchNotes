"use client";

import { useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cx } from "@/lib/utils";
import {
  CheckIcon,
  CloseIcon,
  WifiIcon,
  WifiOffIcon,
} from "@/components/SketchNotes/atoms/icons";

/** Which message the pill is showing, if any. */
type Kind = "offline" | "restored" | "slow";

const COPY: Record<Kind, { text: string; sticky: boolean }> = {
  offline: { text: "Offline — your apps and files still work", sticky: true },
  restored: { text: "Back online", sticky: false },
  slow: { text: "Weak connection — showing saved content", sticky: false },
};

/** How long the non-sticky messages stay up. */
const AUTO_HIDE_MS = 4000;

/**
 * Workspace-wide connection pill.
 *
 * Everything in OneApp is local-first, so losing the network is not an error —
 * it only changes what a handful of features can do. The pill says so plainly
 * (rather than letting the user guess why News won't refresh), stays up while
 * offline, and confirms briefly when the connection returns. A weak connection
 * gets its own note, because that is when the app starts serving saved content.
 *
 * Sits above the sketch dock and every app footer, clear of the safe area, and
 * is dismissible — announced politely so it never interrupts a screen reader
 * mid-task.
 */
export function OfflineBanner() {
  const { online, slow } = useNetworkStatus();
  // `kind` outlives `visible` so the pill keeps its text while fading out.
  const [kind, setKind] = useState<Kind | null>(null);
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const wasOffline = useRef(false);
  const hideTimer = useRef(0);

  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    setDismissed(false);

    if (!online) {
      wasOffline.current = true;
      setKind("offline");
      setShown(true);
      return;
    }

    const next: Kind | null = wasOffline.current ? "restored" : slow ? "slow" : null;
    wasOffline.current = false;
    if (!next) {
      setShown(false);
      return;
    }
    setKind(next);
    setShown(true);
    hideTimer.current = window.setTimeout(() => setShown(false), AUTO_HIDE_MS);
  }, [online, slow]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const visible = shown && !dismissed;
  const copy = kind ? COPY[kind] : null;
  const Icon = kind === "restored" ? CheckIcon : kind === "offline" ? WifiOffIcon : WifiIcon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "fixed left-1/2 z-[78] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2",
        "rounded-full border border-border bg-panel py-2 pl-3.5 shadow-panel",
        "transition-all duration-200 motion-reduce:transition-none",
        copy?.sticky ? "pr-1.5" : "pr-4",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
      style={{ bottom: "calc(74px + env(safe-area-inset-bottom))" }}
    >
      {copy && (
        <>
          <Icon
            size={15}
            className={cx("flex-none", kind === "restored" ? "text-success" : "text-ink-soft")}
          />
          <span className="truncate text-[12.5px] font-medium">{copy.text}</span>
          {copy.sticky && (
            <button
              type="button"
              aria-label="Dismiss offline notice"
              onClick={() => setDismissed(true)}
              className="grid size-7 flex-none place-items-center rounded-full text-ink-soft transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
