"use client";

import { useCallback } from "react";
import { saveCustomThemes, saveTheme } from "@/lib/notes-api";
import {
  customThemeId,
  DEFAULT_THEME_ID,
  MAX_CUSTOM_THEMES,
  resolveTheme,
  type CustomTheme,
  type ThemeId,
} from "@/lib/themes";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * The workspace's theme API: the active palette, the user's saved custom
 * palettes, and the operations that change either. Every mutation writes through
 * to local storage, so a reload keeps what the user chose.
 *
 * The initial values are hydrated once at boot in the editor bootstrap.
 */
export function useTheme() {
  const themeId = useEditorStore((s) => s.themeId);
  const setThemeId = useEditorStore((s) => s.setTheme);
  const customThemes = useEditorStore((s) => s.customThemes);
  const setCustomThemes = useEditorStore((s) => s.setCustomThemes);

  const setTheme = useCallback(
    (next: ThemeId) => {
      setThemeId(next);
      void saveTheme(next);
    },
    [setThemeId],
  );

  /** Persist a new list, and keep the active selection valid against it. */
  const commit = useCallback(
    (next: CustomTheme[], select?: ThemeId) => {
      setCustomThemes(next);
      void saveCustomThemes(next);
      if (select !== undefined) {
        setThemeId(select);
        void saveTheme(select);
      }
    },
    [setCustomThemes, setThemeId],
  );

  /**
   * Save a new palette and switch to it. Ids are minted from the largest
   * existing one rather than the count, so deleting a theme can never mint an id
   * that collides with a surviving one.
   */
  const addCustomTheme = useCallback(
    (draft: Omit<CustomTheme, "id">): string | null => {
      if (customThemes.length >= MAX_CUSTOM_THEMES) return null;
      const used = customThemes.map((t) => Number(t.id.split(":")[1])).filter(Number.isFinite);
      const id = customThemeId(String((used.length ? Math.max(...used) : 0) + 1));
      commit([...customThemes, { ...draft, id }], id);
      return id;
    },
    [commit, customThemes],
  );

  /** Edit a saved palette in place; the active theme is unchanged. */
  const updateCustomTheme = useCallback(
    (id: string, patch: Partial<Omit<CustomTheme, "id">>) => {
      commit(customThemes.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [commit, customThemes],
  );

  /**
   * Delete a saved palette. Deleting the one in use would leave the workspace on
   * an id that resolves to nothing, so the selection falls back to the default.
   */
  const removeCustomTheme = useCallback(
    (id: string) => {
      const next = customThemes.filter((t) => t.id !== id);
      commit(next, id === themeId ? DEFAULT_THEME_ID : undefined);
    },
    [commit, customThemes, themeId],
  );

  const theme = resolveTheme(themeId, customThemes);

  return {
    themeId,
    /** The resolved palette: `data-theme` value, dark flag, label, inline vars. */
    theme,
    dark: theme.dark,
    setTheme,
    customThemes,
    canAddCustomTheme: customThemes.length < MAX_CUSTOM_THEMES,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
  };
}
