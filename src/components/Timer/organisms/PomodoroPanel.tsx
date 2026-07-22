"use client";

import { cx } from "@/lib/utils";
import { formatClock } from "@/lib/Timer/format";
import { primeAudio, requestNotify } from "@/lib/Timer/sound";
import { POMO_PHASE_LABEL, type PomoPhase } from "@/lib/Timer/types";
import { pomoRemaining, useTimerStore } from "@/store/useTimerStore";
import { RingClock } from "@/components/Timer/atoms/RingClock";
import { ControlButton } from "@/components/Timer/atoms/ControlButton";
import { PomoSettingsForm } from "@/components/Timer/molecules/PomoSettings";
import { PauseIcon, PlayIcon, RotateIcon, SkipIcon } from "@/components/SketchNotes/atoms/icons";

const PHASE_TONE: Record<PomoPhase, string> = {
  focus: "stroke-accent",
  short: "stroke-success",
  long: "stroke-prio-med",
};

/** Pomodoro tool: focus/break cycles with a session counter and settings. */
export function PomodoroPanel() {
  const pomo = useTimerStore((s) => s.pomodoro);
  const settings = useTimerStore((s) => s.settings);
  const now = useTimerStore((s) => s.now);
  const startPomo = useTimerStore((s) => s.startPomo);
  const pausePomo = useTimerStore((s) => s.pausePomo);
  const resetPomo = useTimerStore((s) => s.resetPomo);
  const skipPomo = useTimerStore((s) => s.skipPomo);
  const updateSettings = useTimerStore((s) => s.updateSettings);

  const remaining = pomoRemaining(pomo, now);
  const totalMs =
    (pomo.phase === "focus" ? settings.focusMin : pomo.phase === "short" ? settings.shortMin : settings.longMin) *
    60_000;
  const progress = totalMs > 0 ? remaining / totalMs : 0;
  const running = pomo.status === "running";
  const idle = pomo.status === "idle";

  // Dots showing progress toward the next long break.
  const dots = Array.from({ length: settings.longEvery }, (_, i) => i < pomo.cycleCount % settings.longEvery);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-panel p-6 shadow-panel">
        <span
          className={cx(
            "rounded-full px-4 py-1.5 text-[12px] font-bold uppercase tracking-[.14em]",
            pomo.phase === "focus" ? "bg-accent-soft text-accent" : "bg-accent-soft text-text",
          )}
        >
          {POMO_PHASE_LABEL[pomo.phase]}
        </span>

        <RingClock progress={progress} tone={PHASE_TONE[pomo.phase]} size={260}>
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[52px] font-bold tabular-nums leading-none">
              {formatClock(remaining)}
            </span>
            <div className="flex items-center gap-1.5">
              {dots.map((filled, i) => (
                <span
                  key={i}
                  className={cx("size-2 rounded-full", filled ? "bg-accent" : "bg-border")}
                />
              ))}
            </div>
          </div>
        </RingClock>

        <div className="flex items-center justify-center gap-4">
          <ControlButton icon={<RotateIcon size={20} />} label="Reset cycle" size="md" onClick={resetPomo} />
          {running ? (
            <ControlButton icon={<PauseIcon size={24} />} label="Pause" variant="primary" size="lg" onClick={pausePomo} />
          ) : (
            <ControlButton
              icon={<PlayIcon size={24} />}
              label={idle ? "Start" : "Resume"}
              variant="primary"
              size="lg"
              onClick={() => {
                primeAudio();
                requestNotify();
                startPomo();
              }}
            />
          )}
          <ControlButton icon={<SkipIcon size={19} />} label="Skip phase" size="md" onClick={skipPomo} />
        </div>

        <p className="text-[12.5px] text-ink-soft">
          <span className="font-bold text-text">{pomo.totalFocus}</span> focus session
          {pomo.totalFocus === 1 ? "" : "s"} completed
        </p>
      </div>

      <PomoSettingsForm settings={settings} disabled={!idle} onChange={updateSettings} />
    </div>
  );
}
