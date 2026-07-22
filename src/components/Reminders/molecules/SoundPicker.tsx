"use client";

import { cx } from "@/lib/utils";
import type { SoundId } from "@/lib/Reminders/types";
import { SOUNDS, ensureAudioContext, playSound } from "@/lib/Reminders/sounds";
import { CheckIcon, PlayIcon } from "@/components/SketchNotes/atoms/icons";

interface SoundPickerProps {
  value: SoundId;
  onChange: (id: SoundId) => void;
}

/** Grid of selectable notification sounds, each previewable. */
export function SoundPicker({ value, onChange }: SoundPickerProps) {
  const preview = (id: SoundId) => {
    ensureAudioContext(); // this click is a user gesture → unlocks audio
    playSound(id);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {SOUNDS.map((s) => {
        const selected = s.id === value;
        return (
          <div
            key={s.id}
            className={cx(
              "flex items-center gap-2 rounded-xl border p-2 transition-colors",
              selected ? "border-accent bg-accent-soft" : "border-border bg-paper",
            )}
          >
            <button
              type="button"
              onClick={() => {
                onChange(s.id);
                preview(s.id);
              }}
              aria-pressed={selected}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                {selected && <CheckIcon size={13} className="text-accent" />}
                {s.name}
              </span>
              <span className="block truncate text-[11px] text-ink-soft">{s.description}</span>
            </button>
            <button
              type="button"
              aria-label={`Preview ${s.name}`}
              onClick={() => preview(s.id)}
              className="tint grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-accent"
            >
              <PlayIcon size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
