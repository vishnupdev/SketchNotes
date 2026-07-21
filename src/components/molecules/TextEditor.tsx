"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { FONT } from "@/engine/constants";
import { clamp } from "@/engine/geometry";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";

/**
 * The in-canvas text editing overlay. Position/size/colour come from the engine
 * (via `editorOverlay`); the text value lives in the store so the engine can
 * read it when it commits internally. Renders nothing when not editing.
 */
export function TextEditor() {
  const overlay = useEditorStore((s) => s.editorOverlay);
  const value = useEditorStore((s) => s.editValue);
  const setEditValue = useEditorStore((s) => s.setEditValue);
  const { commitText } = useEditorCommands();

  const ref = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(false);

  // On a fresh edit session, seed the value and focus at the end.
  useEffect(() => {
    const open = !!overlay;
    if (open && !wasOpen.current) {
      setEditValue(overlay!.value);
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
    wasOpen.current = open;
  }, [overlay, setEditValue]);

  // Autosize to content whenever value or styling changes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !overlay) return;
    el.style.width = "60px";
    el.style.height = "auto";
    el.style.width = `${clamp(el.scrollWidth + 14, 60, overlay.maxWidth)}px`;
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, overlay]);

  if (!overlay) return null;

  return (
    <textarea
      ref={ref}
      rows={1}
      wrap="off"
      spellCheck={false}
      placeholder="Type…"
      value={value}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => commitText(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          commitText(true);
        }
        e.stopPropagation();
      }}
      className="absolute z-20 resize-none overflow-hidden whitespace-pre rounded-md border-[1.5px] border-dashed border-accent bg-ed-bg px-[5px] py-0.5 leading-[1.3] outline-none"
      style={{
        left: overlay.left,
        top: overlay.top,
        fontSize: overlay.fontSize,
        color: overlay.color,
        fontFamily: FONT,
        caretColor: "var(--accent)",
        maxWidth: "78vw",
        minWidth: 60,
      }}
    />
  );
}
