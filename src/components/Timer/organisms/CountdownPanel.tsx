"use client";

import { useTimerStore } from "@/store/useTimerStore";
import { TimerSetup } from "@/components/Timer/molecules/TimerSetup";
import { TimerCard } from "@/components/Timer/molecules/TimerCard";
import { TimerIcon } from "@/components/SketchNotes/atoms/icons";

/** Countdown tool: compose durations and run any number of timers at once. */
export function CountdownPanel() {
  const timers = useTimerStore((s) => s.countdowns);
  const now = useTimerStore((s) => s.now);
  const addCountdown = useTimerStore((s) => s.addCountdown);
  const clearFinished = useTimerStore((s) => s.clearFinished);

  const hasDone = timers.some((t) => t.status === "done");

  return (
    <div className="flex flex-col gap-5">
      <TimerSetup onAdd={(ms, label) => addCountdown(ms, label, true)} />

      {timers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
          <TimerIcon size={34} className="text-ink-soft" />
          <p className="text-[13.5px] text-ink-soft">
            No timers yet — pick a preset or set a duration above.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
            {timers.map((t) => (
              <TimerCard key={t.id} timer={t} now={now} />
            ))}
          </div>
          {hasDone && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={clearFinished}
                className="text-[12.5px] font-semibold text-ink-soft hover:text-danger"
              >
                Clear finished
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
