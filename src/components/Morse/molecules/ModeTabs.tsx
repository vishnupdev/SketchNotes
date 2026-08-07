"use client";

import { cx } from "@/lib/utils";
import type { MorseMode } from "@/lib/Morse/types";
import { BookIcon, TapIcon, TargetIcon, TranslateIcon } from "@/components/SketchNotes/atoms/icons";

const TABS: { id: MorseMode; label: string; hint: string; icon: typeof BookIcon }[] = [
  { id: "learn", label: "Learn", hint: "The full chart, one character at a time", icon: BookIcon },
  { id: "practice", label: "Practice", hint: "Drill what you know", icon: TargetIcon },
  { id: "translate", label: "Translate", hint: "Text to Morse and back", icon: TranslateIcon },
  { id: "key", label: "Key", hint: "Tap it out yourself", icon: TapIcon },
];

interface ModeTabsProps {
  mode: MorseMode;
  onMode: (mode: MorseMode) => void;
}

/**
 * The app's four tools. Stacks icon over label on narrow phones so all four
 * stay reachable at ~360px, and sits on one line from 420px up.
 */
export function ModeTabs({ mode, onMode }: ModeTabsProps) {
  return (
    <div role="tablist" aria-label="Morse tools" className="flex w-full gap-1 rounded-2xl border border-border bg-panel p-1">
      {TABS.map(({ id, label, hint, icon: Icon }) => {
        const current = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={current}
            aria-controls={`morse-panel-${id}`}
            title={hint}
            onClick={() => onMode(id)}
            className={cx(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[12.5px] font-semibold transition-colors min-[420px]:flex-row min-[420px]:gap-2 min-[420px]:py-2.5 min-[420px]:text-[13px]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              current ? "bg-accent text-on-accent shadow-panel" : "text-ink-soft hover:text-text",
            )}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
