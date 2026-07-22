"use client";

import { cx } from "@/lib/utils";
import { formatClock } from "@/lib/Timer/format";
import type { Countdown } from "@/lib/Timer/types";
import { cdRemaining, useTimerStore } from "@/store/useTimerStore";
import { primeAudio } from "@/lib/Timer/sound";
import { RingClock } from "@/components/Timer/atoms/RingClock";
import { ControlButton } from "@/components/Timer/atoms/ControlButton";
import {
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RotateIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

interface TimerCardProps {
  timer: Countdown;
  now: number;
}

/** One countdown: progress ring, live clock, and its controls. */
export function TimerCard({ timer, now }: TimerCardProps) {
  const start = useTimerStore((s) => s.startCountdown);
  const pause = useTimerStore((s) => s.pauseCountdown);
  const reset = useTimerStore((s) => s.resetCountdown);
  const addTime = useTimerStore((s) => s.addTime);
  const toggleLoop = useTimerStore((s) => s.toggleLoop);
  const rename = useTimerStore((s) => s.renameCountdown);
  const remove = useTimerStore((s) => s.removeCountdown);

  const remaining = cdRemaining(timer, now);
  const running = timer.status === "running";
  const done = timer.status === "done";
  const progress = timer.durationMs > 0 ? remaining / timer.durationMs : 0;
  const tone = done ? "stroke-success" : running ? "stroke-accent" : "stroke-prio-med";

  return (
    <div
      className={cx(
        "flex flex-col items-center gap-4 rounded-2xl border bg-panel p-5 shadow-panel transition-colors",
        done ? "border-success" : "border-border",
      )}
    >
      <RingClock progress={progress} tone={tone} size={190}>
        <div className="flex flex-col items-center gap-1 px-4 text-center">
          <span
            className={cx(
              "font-mono text-[34px] font-bold tabular-nums leading-none",
              done && "text-success",
            )}
          >
            {formatClock(remaining)}
          </span>
          {done && (
            <span className="text-[11px] font-bold uppercase tracking-[.14em] text-success">Done</span>
          )}
        </div>
      </RingClock>

      <input
        value={timer.label}
        onChange={(e) => rename(timer.id, e.target.value)}
        placeholder="Add a label"
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-center text-[14px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-soft hover:border-border focus:border-accent"
      />

      <div className="flex items-center justify-center gap-2">
        <ControlButton
          icon={<RepeatIcon size={17} />}
          label={timer.loop ? "Looping — tap to stop repeating" : "Repeat when finished"}
          variant={timer.loop ? "primary" : "ghost"}
          size="sm"
          onClick={() => toggleLoop(timer.id)}
        />
        <ControlButton
          icon={<RotateIcon size={18} />}
          label="Reset"
          size="sm"
          onClick={() => reset(timer.id)}
        />
        {running ? (
          <ControlButton
            icon={<PauseIcon size={22} />}
            label="Pause"
            variant="primary"
            size="lg"
            onClick={() => pause(timer.id)}
          />
        ) : (
          <ControlButton
            icon={<PlayIcon size={22} />}
            label={done ? "Restart" : "Start"}
            variant="primary"
            size="lg"
            onClick={() => {
              primeAudio();
              start(timer.id);
            }}
          />
        )}
        <button
          type="button"
          onClick={() => addTime(timer.id, 60_000)}
          className="tint grid h-9 flex-none place-items-center rounded-full border border-border px-2.5 font-mono text-[12px] font-bold hover:border-accent hover:text-accent"
          title="Add one minute"
        >
          +1:00
        </button>
        <ControlButton
          icon={<TrashSmallIcon size={17} />}
          label="Remove timer"
          variant="danger"
          size="sm"
          onClick={() => remove(timer.id)}
        />
      </div>
    </div>
  );
}
