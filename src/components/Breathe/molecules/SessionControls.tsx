"use client";

import { PauseIcon, PlayIcon, RotateIcon, StopIcon } from "@/components/SketchNotes/atoms/icons";
import { useBreatheStore } from "@/store/useBreatheStore";
import { cx } from "@/lib/utils";

const BIG =
  "hover-glow flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] text-[16px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
const PRIMARY = "bg-accent text-on-accent";
const SECONDARY = "border border-border bg-panel hover:border-accent hover:text-accent";

/** Begin, pause, resume, end — and "again" once a session is done. Space does the first three. */
export function SessionControls() {
  const status = useBreatheStore((s) => s.status);
  const start = useBreatheStore((s) => s.start);
  const pause = useBreatheStore((s) => s.pause);
  const resume = useBreatheStore((s) => s.resume);
  const stop = useBreatheStore((s) => s.stop);
  const dismiss = useBreatheStore((s) => s.dismiss);

  if (status === "running" || status === "paused") {
    const running = status === "running";
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={running ? pause : resume}
          aria-keyshortcuts="Space"
          className={cx(BIG, running ? SECONDARY : PRIMARY)}
        >
          {running ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          {running ? "Pause" : "Resume"}
        </button>
        <button type="button" onClick={stop} className={cx(BIG, SECONDARY, "max-w-32")}>
          <StopIcon size={18} />
          End
        </button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="breathe-rise flex gap-2">
        <button type="button" onClick={start} className={cx(BIG, PRIMARY)}>
          <RotateIcon size={19} />
          Again
        </button>
        <button type="button" onClick={dismiss} className={cx(BIG, SECONDARY, "max-w-32")}>
          Done
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={start} aria-keyshortcuts="Space" className={cx(BIG, PRIMARY, "w-full flex-none")}>
      <PlayIcon size={20} />
      Begin
    </button>
  );
}
