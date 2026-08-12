"use client";

import { useCallback } from "react";
import { saveDensity, saveUiStyle } from "@/lib/notes-api";
import { densityById, uiStyleById } from "@/lib/ui-style";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * The workspace's interface style and density, with persisting setters.
 *
 * Deliberately separate from {@link useTheme}: colour and shape are independent
 * choices, and a component that only cares about one shouldn't re-render for the
 * other. Both are hydrated at boot in the editor bootstrap.
 */
export function useUiStyle() {
  const uiStyle = useEditorStore((s) => s.uiStyle);
  const density = useEditorStore((s) => s.density);
  const setUiStyleId = useEditorStore((s) => s.setUiStyle);
  const setDensityId = useEditorStore((s) => s.setDensity);

  const setUiStyle = useCallback(
    (id: string) => {
      setUiStyleId(id);
      void saveUiStyle(id);
    },
    [setUiStyleId],
  );

  const setDensity = useCallback(
    (id: string) => {
      setDensityId(id);
      void saveDensity(id);
    },
    [setDensityId],
  );

  return {
    uiStyle,
    style: uiStyleById(uiStyle),
    density,
    densityDef: densityById(density),
    setUiStyle,
    setDensity,
  };
}
