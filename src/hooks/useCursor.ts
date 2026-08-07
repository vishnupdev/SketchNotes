"use client";

import { useEffect, useState } from "react";
import {
  CUSTOM_CURSOR_ID,
  cursorById,
  cursorCss,
  cursorInk,
  cursorPx,
  customCursorCss,
  customCursorPx,
  type CursorColors,
  type CursorVariant,
} from "@/lib/cursors";
import { resizeCursor } from "@/lib/cursor-image";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * Reads the pointer setup from the workspace store and returns a patching
 * setter. The stored value is hydrated once by `<CursorEffect />`.
 */
export function useCursor() {
  const settings = useWorkspaceStore((s) => s.cursor);
  const update = useWorkspaceStore((s) => s.updateCursor);
  return { settings, def: cursorById(settings.id), update };
}

/**
 * The live theme colours a pointer is painted with, read straight back out of
 * the CSS tokens on <body> so the art tracks the active palette. `null` until
 * the first client render (and if the tokens can't be resolved).
 */
export function useCursorColors(): CursorColors | null {
  // The theme id is what flips the tokens, so re-read whenever it changes.
  const themeId = useEditorStore((s) => s.themeId);
  const [colors, setColors] = useState<CursorColors | null>(null);

  useEffect(() => {
    const cs = getComputedStyle(document.body);
    const ink = cs.getPropertyValue("--text").trim();
    const accent = cs.getPropertyValue("--accent").trim();
    const paper = cs.getPropertyValue("--paper").trim();
    setColors(ink && accent && paper ? { ink, accent, paper } : null);
  }, [themeId]);

  return colors;
}

/**
 * A custom pointer's master bitmap redrawn at the size the settings ask for.
 * CSS can't scale a cursor image, so the resize is a real canvas pass; it runs
 * off the render and lands as state. `null` while there's nothing to resize.
 */
export function useSizedCustomCursor(src: string | undefined, px: number): string | null {
  const [sized, setSized] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setSized(null);
      return;
    }
    let live = true;
    resizeCursor(src, px)
      .then((out) => live && setSized(out))
      // A pointer that can't be drawn is not worth an error dialog — the
      // preset fallback in the CSS keeps a usable cursor on screen.
      .catch(() => live && setSized(null));
    return () => {
      live = false;
    };
  }, [src, px]);

  return sized;
}

/**
 * The two ready-to-use `cursor` values for the current setup, or `null` when
 * the device pointer should be left alone (the "system" preset, unresolved
 * theme tokens, or a custom bitmap that hasn't finished rendering).
 */
export function useCursorCss(): Record<CursorVariant, string> | null {
  const { settings, def } = useCursor();
  const colors = useCursorColors();
  const custom = settings.id === CUSTOM_CURSOR_ID ? settings.custom : null;
  const customPx = customCursorPx(settings.scale);
  const sized = useSizedCustomCursor(custom?.src, customPx);

  if (custom) {
    if (!sized) return null;
    return {
      arrow: customCursorCss(sized, customPx, custom.hot, "arrow"),
      hand: customCursorCss(sized, customPx, custom.hot, "hand"),
    };
  }

  if (!colors || !def.art) return null;
  const ink = cursorInk(settings, colors);
  const px = cursorPx(def, settings.scale);
  const arrow = cursorCss(def, { ink: ink.arrow, paper: colors.paper, px }, "arrow");
  const hand = cursorCss(def, { ink: ink.hand, paper: colors.paper, px }, "hand");
  return arrow && hand ? { arrow, hand } : null;
}
