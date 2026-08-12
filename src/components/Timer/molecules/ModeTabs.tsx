"use client";

import type { TimerMode } from "@/lib/Timer/types";
import { PomodoroIcon, StopwatchIcon, TimerIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<TimerMode>[] = [
  { id: "countdown", label: "Timer", hint: "Count down to zero", icon: <TimerIcon size={19} /> },
  { id: "stopwatch", label: "Stopwatch", hint: "Count up, with laps", icon: <StopwatchIcon size={19} /> },
  { id: "pomodoro", label: "Pomodoro", hint: "Focus and break cycles", icon: <PomodoroIcon size={19} /> },
];

/**
 * The tab ids in bar order. Derived from TABS rather than written out again, so
 * the direction a panel animates in can never disagree with the order the tabs
 * are actually shown in.
 */
export const TIMER_MODE_ORDER = TABS.map((t) => t.id);

interface ModeTabsProps {
  mode: TimerMode;
  onMode: (mode: TimerMode) => void;
}

/** The three timer tools, as the floating bottom bar. */
export function ModeTabs({ mode, onMode }: ModeTabsProps) {
  return <BottomNav label="Timer tools" items={TABS} value={mode} onChange={onMode} maxWidth={380} />;
}
