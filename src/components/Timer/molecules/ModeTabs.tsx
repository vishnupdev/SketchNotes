import { cx } from "@/lib/utils";
import type { TimerMode } from "@/lib/Timer/types";
import { PomodoroIcon, StopwatchIcon, TimerIcon } from "@/components/SketchNotes/atoms/icons";

const TABS: { id: TimerMode; label: string; icon: typeof TimerIcon }[] = [
  { id: "countdown", label: "Timer", icon: TimerIcon },
  { id: "stopwatch", label: "Stopwatch", icon: StopwatchIcon },
  { id: "pomodoro", label: "Pomodoro", icon: PomodoroIcon },
];

interface ModeTabsProps {
  mode: TimerMode;
  onMode: (mode: TimerMode) => void;
}

/** Segmented control switching between the three timer tools. */
export function ModeTabs({ mode, onMode }: ModeTabsProps) {
  return (
    <div className="inline-flex w-full gap-1 rounded-2xl border border-border bg-panel p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onMode(id)}
          aria-current={mode === id}
          className={cx(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
            mode === id ? "bg-accent text-white shadow-panel" : "text-ink-soft hover:text-text",
          )}
        >
          <Icon size={17} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
