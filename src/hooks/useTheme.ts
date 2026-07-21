"use client";

import { useCallback } from "react";
import type { Theme } from "@/engine/types";
import { saveTheme } from "@/lib/notes-api";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * Reads the reactive theme from the store and returns a persisting toggle.
 * The initial value is hydrated once at boot in the editor bootstrap.
 */
export function useTheme() {
  const dark = useEditorStore((s) => s.dark);
  const setDark = useEditorStore((s) => s.setDark);

  const setTheme = useCallback(
    (next: Theme) => {
      setDark(next === "dark");
      void saveTheme(next);
    },
    [setDark],
  );

  const toggle = useCallback(() => {
    const next: Theme = dark ? "light" : "dark";
    setDark(!dark);
    void saveTheme(next);
  }, [dark, setDark]);

  return { dark, setTheme, toggle };
}
