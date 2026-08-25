"use client";

import { NEWS_TABS } from "@/lib/News/catalog";
import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";

interface NewsTabsProps {
  active: string;
  onSelect: (id: string) => void;
}

/**
 * The News category bar. The row itself is the shared {@link ChipBar}; this
 * component's job is only to name the categories, so a filter row looks and
 * behaves the same here as it does anywhere else in the workspace.
 */
export function NewsTabs({ active, onSelect }: NewsTabsProps) {
  return (
    <ChipBar label="News categories" items={NEWS_TABS} value={active} onChange={onSelect} />
  );
}
