"use client";

import { PlayIcon, StopIcon, TapIcon } from "@/components/SketchNotes/atoms/icons";
import { useMetronomeStore } from "@/store/useMetronomeStore";
import { cx } from "@/lib/utils";

/**
 * Start/stop and tap tempo — the two controls every tab needs within reach.
 * Space and T do the same from the keyboard (wired in `MetronomeApp`).
 */
export function Transport({ showTap = true }: { showTap?: boolean }) {
  const playing = useMetronomeStore((s) => s.playing);
  const toggle = useMetronomeStore((s) => s.toggle);
  const tap = useMetronomeStore((s) => s.tap);
  const taps = useMetronomeStore((s) => s.taps);
  const unsupported = useMetronomeStore((s) => s.unsupported);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          aria-keyshortcuts="Space"
          className={cx(
            "hover-glow flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] text-[16px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            playing ? "border border-accent bg-panel text-accent" : "bg-accent text-on-accent",
          )}
        >
          {playing ? <StopIcon size={20} /> : <PlayIcon size={20} />}
          {playing ? "Stop" : "Start"}
        </button>
        {showTap && (
          <button
            type="button"
            onClick={tap}
            aria-keyshortcuts="T"
            title="Tap four or more times in time — the tempo follows your taps"
            className="flex h-14 w-28 flex-none items-center justify-center gap-2 rounded-[14px] border border-border bg-panel text-[15px] font-bold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-accent-soft"
          >
            <TapIcon size={19} />
            Tap
            {taps.length > 1 && (
              <span className="font-mono text-[10px] tabular-nums text-ink-soft">×{taps.length}</span>
            )}
          </button>
        )}
      </div>
      {unsupported && (
        <p role="alert" className="text-[12.5px] text-danger">
          This browser would not open an audio output, so there is nothing to click with. Any
          current Chrome, Edge, Firefox or Safari will.
        </p>
      )}
    </div>
  );
}
