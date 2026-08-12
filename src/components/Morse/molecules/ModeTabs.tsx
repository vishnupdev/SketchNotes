"use client";

import type { MorseMode } from "@/lib/Morse/types";
import { BookIcon, TapIcon, TargetIcon, TranslateIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<MorseMode>[] = [
  {
    id: "learn",
    label: "Learn",
    hint: "The full chart, one character at a time",
    icon: <BookIcon size={19} />,
    controls: "morse-panel-learn",
  },
  {
    id: "practice",
    label: "Practice",
    hint: "Drill what you know",
    icon: <TargetIcon size={19} />,
    controls: "morse-panel-practice",
  },
  {
    id: "translate",
    label: "Translate",
    hint: "Text to Morse and back",
    icon: <TranslateIcon size={19} />,
    controls: "morse-panel-translate",
  },
  {
    id: "key",
    label: "Key",
    hint: "Tap it out yourself",
    icon: <TapIcon size={19} />,
    controls: "morse-panel-key",
  },
];

/**
 * The tab ids in bar order. Derived from TABS rather than written out again, so
 * the direction a panel animates in can never disagree with the order the tabs
 * are actually shown in.
 */
export const MORSE_MODE_ORDER = TABS.map((t) => t.id);

interface ModeTabsProps {
  mode: MorseMode;
  onMode: (mode: MorseMode) => void;
}

/** The app's four tools, as the floating bottom bar. */
export function ModeTabs({ mode, onMode }: ModeTabsProps) {
  return <BottomNav label="Morse tools" items={TABS} value={mode} onChange={onMode} maxWidth={440} />;
}
