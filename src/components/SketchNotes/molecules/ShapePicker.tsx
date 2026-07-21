"use client";

import { SHAPE_LABEL, SHAPE_ORDER, shapeIcon } from "@/engine/shapes";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Grid of parametric shapes; selecting one makes it the active tool. */
export function ShapePicker() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div className="max-w-[min(92vw,300px)]">
      <div className="px-1 pb-2 pt-0.5 text-[11px] font-bold uppercase tracking-[.4px] text-ink-soft">
        Shapes
      </div>
      <div className="grid grid-cols-5 gap-[5px]">
        {SHAPE_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            title={SHAPE_LABEL[k]}
            aria-label={SHAPE_LABEL[k]}
            onClick={() => setTool(k)}
            className={cx(
              "grid aspect-square place-items-center rounded-[10px]",
              tool === k
                ? "bg-accent-soft text-accent outline-2 -outline-offset-2 outline-accent"
                : "tint text-text",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinejoin="round"
              className="size-6"
              dangerouslySetInnerHTML={{ __html: shapeIcon(k) }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
