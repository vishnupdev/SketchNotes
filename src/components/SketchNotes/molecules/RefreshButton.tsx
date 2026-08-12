"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";
import { RefreshIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Sticky refresh action for mobile. It takes the slot the {@link Zoomer} leaves
 * empty below 800px — installed on a phone there is no browser chrome to reload
 * from, so this is the only way to re-sync and repaint by hand. Sits above the
 * dock, and steps up when the selection chip shares that row on narrow screens.
 */
export function RefreshButton() {
  const hasSelection = useEditorStore((s) => s.hasSelection);
  const tool = useEditorStore((s) => s.tool);
  const { refresh } = useEditorCommands();
  const [busy, setBusy] = useState(false);

  const chipShowing = hasSelection && tool === "select";

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="Refresh canvas and notes"
      title="Refresh"
      aria-busy={busy}
      disabled={busy}
      onClick={onClick}
      className="tint fixed right-3 z-[29] grid size-11 place-items-center rounded-full border border-border bg-panel text-ink-soft shadow-panel transition-[bottom] hover:text-text disabled:opacity-60 min-[800px]:hidden"
      style={{ bottom: `calc(${chipShowing ? 126 : 74}px + env(safe-area-inset-bottom))` }}
    >
      <RefreshIcon size={19} className={cx(busy && "motion-safe:animate-spin")} />
    </button>
  );
}
