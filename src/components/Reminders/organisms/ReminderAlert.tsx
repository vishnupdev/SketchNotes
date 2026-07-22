"use client";

import { useEffect } from "react";
import { useReminderStore } from "@/store/useReminderStore";
import { useReminderMutations } from "@/hooks/useReminders";
import { startRingLoop, stopRingLoop } from "@/lib/Reminders/sounds";
import { startVibrate, stopVibrate } from "@/lib/Reminders/notify";
import { clockTime } from "@/lib/Reminders/format";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { BellIcon } from "@/components/SketchNotes/atoms/icons";

const SNOOZE_MIN = 10;

/**
 * Full-screen alert shown when reminders fire. Plays the current reminder's
 * sound on appear and offers snooze / dismiss. Mounted app-wide so it surfaces
 * over any app.
 */
export function ReminderAlert() {
  const ringing = useReminderStore((s) => s.ringing);
  const dismiss = useReminderStore((s) => s.dismissRinging);
  const clearRinging = useReminderStore((s) => s.clearRinging);
  const { update } = useReminderMutations();

  const current = ringing[0] ?? null;
  const currentId = current?.id;
  const currentSound = current?.sound;

  // Ring + buzz continuously while a reminder is at the front, restarting for
  // each new one. Both self-stop after 30s (see MAX_RING_MS); dismissing early
  // runs the cleanup. The alert dialog stays until the user acts.
  useEffect(() => {
    if (!currentId || !currentSound) return;
    startRingLoop(currentSound);
    startVibrate();
    return () => {
      stopRingLoop();
      stopVibrate();
    };
  }, [currentId, currentSound]);

  if (!current) return null;

  const snooze = () => {
    update.mutate({
      id: current.id,
      patch: { fireAt: Date.now() + SNOOZE_MIN * 60_000, firedAt: null, enabled: true },
    });
    dismiss(current.id);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[rgba(15,20,26,.6)] backdrop-blur-sm" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Reminder"
        className="relative w-[min(92vw,400px)] rounded-2xl border border-border bg-panel p-6 text-center shadow-panel"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
          <BellIcon size={28} />
        </span>

        <h2 className="mt-4 text-[19px] font-extrabold leading-tight">{current.title}</h2>
        {current.notes && <p className="mt-1 text-[13.5px] text-ink-soft">{current.notes}</p>}
        <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-accent">
          {clockTime(current.fireAt)}
        </p>

        {ringing.length > 1 && (
          <p className="mt-2 text-[12px] text-ink-soft">+{ringing.length - 1} more reminder(s)</p>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={snooze}
            className="tint rounded-[10px] border border-border px-4 py-2 text-[13px] font-semibold hover:border-accent"
          >
            Snooze {SNOOZE_MIN}m
          </button>
          <PrimaryButton onClick={() => dismiss(current.id)} className="px-6">
            Dismiss
          </PrimaryButton>
        </div>

        {ringing.length > 1 && (
          <button
            type="button"
            onClick={clearRinging}
            className="mt-3 text-[12px] font-semibold text-ink-soft hover:text-text"
          >
            Dismiss all
          </button>
        )}
      </div>
    </div>
  );
}
