"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";
import { MinusIcon, PlusIcon } from "@/components/atoms/icons";

/** Zoom controls, shown on wider viewports (matches the original ≥800px rule). */
export function Zoomer() {
  const zoom = useEditorStore((s) => s.zoom);
  const { zoomIn, zoomOut, resetZoom } = useEditorCommands();

  return (
    <div
      className="fixed right-3 z-[29] hidden flex-col items-stretch overflow-hidden rounded-xl border border-border bg-panel shadow-panel min-[800px]:flex"
      style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        aria-label="Zoom in"
        onClick={zoomIn}
        className="tint grid h-[34px] w-10 place-items-center text-ink-soft hover:text-text"
      >
        <PlusIcon size={16} />
      </button>
      <button
        type="button"
        title="Reset zoom"
        onClick={resetZoom}
        className="tint h-auto px-0 py-[5px] text-[10.5px] text-ink-soft hover:text-text"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={zoomOut}
        className="tint grid h-[34px] w-10 place-items-center text-ink-soft hover:text-text"
      >
        <MinusIcon size={16} />
      </button>
    </div>
  );
}
