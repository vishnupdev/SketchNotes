"use client";

import type { RefObject } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { TextEditor } from "@/components/SketchNotes/molecules/TextEditor";

interface CanvasStageProps {
  stageRef: RefObject<HTMLElement | null>;
  bgRef: RefObject<HTMLCanvasElement | null>;
  cvRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * The drawing surface: a background grid canvas, the ink canvas, an empty-state
 * hint and the text overlay. The engine attaches to these elements via refs;
 * this component stays purely presentational.
 */
export function CanvasStage({ stageRef, bgRef, cvRef }: CanvasStageProps) {
  const isEmpty = useEditorStore((s) => s.isEmpty);

  return (
    <main
      ref={stageRef as RefObject<HTMLElement>}
      id="stage"
      className="fixed inset-x-0 bottom-0"
      style={{ top: "calc(54px + env(safe-area-inset-top))" }}
    >
      <canvas ref={bgRef} className="absolute inset-0 block size-full" />
      <canvas
        ref={cvRef}
        className="absolute inset-0 block size-full cursor-crosshair touch-none [-webkit-touch-callout:none]"
      />

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-ink-soft">
          <div>
            <div className="mb-1.5 font-hand text-[21px] text-ink-soft">
              Sketch your ideas here ✏️
            </div>
            <div className="text-[12.5px]">
              Pick a tool below · pinch to zoom · double-tap for text
            </div>
          </div>
        </div>
      )}

      <TextEditor />
    </main>
  );
}
