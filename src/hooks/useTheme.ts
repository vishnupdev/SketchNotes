"use client";

import { useCallback } from "react";
import { saveTheme } from "@/lib/notes-api";
import { themeById, type ThemeId } from "@/lib/themes";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * Reads the active theme from the store and returns a persisting setter.
 * The initial value is hydrated once at boot in the editor bootstrap.
 */
export function useTheme() {
  const themeId = useEditorStore((s) => s.themeId);
  const setThemeId = useEditorStore((s) => s.setTheme);

  const setTheme = useCallback(
    (next: ThemeId) => {
      setThemeId(next);
      void saveTheme(next);
    },
    [setThemeId],
  );

  const theme = themeById(themeId);
  return { themeId, theme, dark: theme.dark, setTheme };
}
