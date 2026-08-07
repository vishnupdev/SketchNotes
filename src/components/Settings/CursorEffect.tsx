"use client";

import { useEffect } from "react";
import { useCursor, useCursorCss } from "@/hooks/useCursor";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/**
 * Applies the chosen pointer to the whole workspace. Renders nothing.
 *
 * The images are written to <body> as the `--cursor-arrow` / `--cursor-hand`
 * custom properties and switched on with `data-cursor`; `globals.css` decides
 * where each one applies. Doing it from an effect (rather than as a React
 * attribute) keeps the server HTML free of a device preference, exactly like
 * the theme is applied.
 */
export function CursorEffect() {
  const hydrateCursor = useWorkspaceStore((s) => s.hydrateCursor);
  const { settings } = useCursor();
  const css = useCursorCss();
  // Kept as two strings rather than the object they arrive in, so a re-render
  // that resolves to the same images doesn't rewrite the whole cursor.
  const arrow = css?.arrow;
  const hand = css?.hand;

  useEffect(() => {
    hydrateCursor();
  }, [hydrateCursor]);

  useEffect(() => {
    const body = document.body;

    // Nothing to paint: the "system" preset, unresolved theme tokens, or a
    // custom bitmap still rendering. Hand the pointer back to the browser
    // rather than leaving a stale image behind.
    if (!arrow || !hand) {
      delete body.dataset.cursor;
      body.style.removeProperty("--cursor-arrow");
      body.style.removeProperty("--cursor-hand");
      return;
    }

    body.dataset.cursor = settings.id;
    body.style.setProperty("--cursor-arrow", arrow);
    body.style.setProperty("--cursor-hand", hand);
  }, [settings.id, arrow, hand]);

  return null;
}
