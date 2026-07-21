"use client";

import { useRef } from "react";
import type { Tool } from "@/engine/types";
import { FONTS, mapColor } from "@/engine/constants";
import type { FontKey } from "@/engine/constants";
import { isShape } from "@/engine/shapes";
import { useEditorStore } from "@/store/useEditorStore";
import { ToolButton } from "@/components/SketchNotes/atoms/ToolButton";
import { Popover } from "@/components/SketchNotes/atoms/Popover";
import { ColorPicker } from "@/components/SketchNotes/molecules/ColorPicker";
import { WidthPicker } from "@/components/SketchNotes/molecules/WidthPicker";
import { ShapePicker } from "@/components/SketchNotes/molecules/ShapePicker";
import { EmojiPicker } from "@/components/SketchNotes/molecules/EmojiPicker";
import { FontPicker } from "@/components/SketchNotes/molecules/FontPicker";
import { TextSizePicker } from "@/components/SketchNotes/molecules/TextSizePicker";
import {
  ArrowIcon,
  EmojiIcon,
  EraserIcon,
  LineIcon,
  PenIcon,
  SelectIcon,
  ShapesIcon,
  TextIcon,
} from "@/components/SketchNotes/atoms/icons";

interface DirectTool {
  tool: Tool;
  label: string;
  title: string;
  Icon: (p: { size?: number }) => React.ReactNode;
}

const DIRECT_TOOLS: DirectTool[] = [
  { tool: "select", label: "Select and move", title: "Select / move / pan (V)", Icon: SelectIcon },
  { tool: "pen", label: "Pen", title: "Pen (P)", Icon: PenIcon },
  { tool: "eraser", label: "Eraser", title: "Eraser (E)", Icon: EraserIcon },
  { tool: "line", label: "Line", title: "Line (L)", Icon: LineIcon },
  { tool: "arrow", label: "Arrow", title: "Arrow (A)", Icon: ArrowIcon },
];

/** Bottom tool dock with tool buttons, colour and width selectors + popovers. */
export function Dock() {
  const tool = useEditorStore((s) => s.tool);
  const color = useEditorStore((s) => s.color);
  const dark = useEditorStore((s) => s.dark);
  const fontKey = useEditorStore((s) => s.fontKey);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setTool = useEditorStore((s) => s.setTool);
  const activePopover = useEditorStore((s) => s.activePopover);
  const togglePopover = useEditorStore((s) => s.togglePopover);
  const closePopovers = useEditorStore((s) => s.closePopovers);

  const shapeRef = useRef<HTMLButtonElement>(null);
  const emojiRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const widthRef = useRef<HTMLButtonElement>(null);
  const fontRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <nav
        aria-label="Drawing tools"
        className="fixed left-1/2 z-30 flex w-[min(calc(100%-16px),620px)] -translate-x-1/2 items-center gap-1 rounded-2xl bg-ink p-1.5 shadow-panel"
        style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
          {DIRECT_TOOLS.map(({ tool: t, label, title, Icon }) => (
            <ToolButton
              key={t}
              aria-label={label}
              title={title}
              active={tool === t}
              onClick={() => setTool(t)}
            >
              <Icon size={20} />
            </ToolButton>
          ))}

          <ToolButton
            ref={shapeRef}
            aria-label="Shapes"
            title="Shapes"
            active={isShape(tool)}
            onClick={() => togglePopover("shape")}
          >
            <ShapesIcon size={20} />
          </ToolButton>

          <ToolButton
            ref={emojiRef}
            aria-label="Emojis and stickers"
            title="Emojis & stickers"
            active={tool === "emoji"}
            onClick={() => togglePopover("emoji")}
          >
            <EmojiIcon size={20} />
          </ToolButton>

          <ToolButton
            aria-label="Text"
            title="Text (T)"
            active={tool === "text"}
            onClick={() => setTool("text")}
          >
            <TextIcon size={20} />
          </ToolButton>

          <ToolButton
            ref={fontRef}
            aria-label="Font"
            title="Font"
            data-text-style
            onPointerDown={(e) => e.preventDefault()}
            active={activePopover === "font"}
            onClick={() => togglePopover("font")}
          >
            <span
              className="text-[16px] font-bold leading-none"
              style={{ fontFamily: FONTS[fontKey as FontKey]?.stack ?? FONTS.hand.stack }}
            >
              Aa
            </span>
          </ToolButton>

          <ToolButton
            ref={sizeRef}
            aria-label="Text size"
            title="Text size"
            data-text-style
            onPointerDown={(e) => e.preventDefault()}
            active={activePopover === "textsize"}
            onClick={() => togglePopover("textsize")}
          >
            <span className="text-[12px] font-bold leading-none tabular-nums">{fontSize}</span>
          </ToolButton>
        </div>

        <div className="mx-[3px] my-[5px] w-px flex-none self-stretch bg-white/15" />

        <ToolButton ref={colorRef} aria-label="Stroke color" onClick={() => togglePopover("color")}>
          <span
            className="size-[21px] rounded-full shadow-[inset_0_0_0_2px_rgba(255,255,255,.85)]"
            style={{ background: mapColor(color, dark) }}
          />
        </ToolButton>

        <ToolButton ref={widthRef} aria-label="Stroke width" onClick={() => togglePopover("width")}>
          <span className="flex w-5 flex-col items-center gap-[3px]">
            <span className="block w-full rounded-full bg-current" style={{ height: 2 }} />
            <span className="block w-full rounded-full bg-current" style={{ height: 3.5 }} />
            <span className="block w-full rounded-full bg-current" style={{ height: 5.5 }} />
          </span>
        </ToolButton>
      </nav>

      <Popover open={activePopover === "shape"} anchorRef={shapeRef} onClose={closePopovers}>
        <ShapePicker />
      </Popover>
      <Popover open={activePopover === "emoji"} anchorRef={emojiRef} onClose={closePopovers}>
        <EmojiPicker />
      </Popover>
      <Popover open={activePopover === "color"} anchorRef={colorRef} onClose={closePopovers}>
        <ColorPicker />
      </Popover>
      <Popover open={activePopover === "width"} anchorRef={widthRef} onClose={closePopovers}>
        <WidthPicker />
      </Popover>
      <Popover open={activePopover === "font"} anchorRef={fontRef} onClose={closePopovers}>
        <FontPicker />
      </Popover>
      <Popover open={activePopover === "textsize"} anchorRef={sizeRef} onClose={closePopovers}>
        <TextSizePicker />
      </Popover>
    </>
  );
}
