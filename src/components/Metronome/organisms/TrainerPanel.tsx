"use client";

import { useId, type ReactNode } from "react";
import { Stepper } from "@/components/SketchNotes/atoms/Stepper";
import { Transport } from "@/components/Metronome/molecules/Transport";
import { useMetronomeStore } from "@/store/useMetronomeStore";
import {
  barAudible,
  barsToTarget,
  BPM_MAX,
  BPM_MIN,
  formatDuration,
  meterLabel,
  rampSeconds,
} from "@/lib/Metronome/rhythm";
import { cx } from "@/lib/utils";

/**
 * The two practice modes that a plain click cannot do for you.
 *
 * **Speed ramp** is the standard way to get a passage up to tempo: start where
 * it is clean and let the metronome raise the bar a few BPM at a time, so the
 * speed arrives before the tension does.
 *
 * **Silent bars** drops the click out for a few bars while it keeps counting.
 * Landing on beat one when it comes back is the honest test of whether you
 * are keeping time or following it.
 */
export function TrainerPanel() {
  const settings = useMetronomeStore((s) => s.settings);
  const update = useMetronomeStore((s) => s.update);
  const playing = useMetronomeStore((s) => s.playing);
  const position = useMetronomeStore((s) => s.position);
  const { ramp, gap, meter } = settings;

  const bars = barsToTarget(ramp);
  const seconds = rampSeconds(ramp, meter);
  const direction = ramp.to >= ramp.from ? "up" : "down";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-border bg-panel p-4">
        {playing && position ? (
          <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[34px] font-extrabold leading-none tabular-nums">
              {position.bpm}
              <span className="ml-1.5 font-mono text-[11px] font-normal uppercase tracking-[.14em] text-ink-soft">
                BPM
              </span>
            </span>
            <span className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-soft">
              Bar {position.bar + 1} · {position.audible ? "clicking" : "silent — keep going"}
            </span>
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Switch on either mode below, or both, then start. They use the bar from the Beat
            tab ({meterLabel(meter)}), and the tempo shows here as it moves.
          </p>
        )}
      </div>

      <Transport showTap={false} />

      <Mode
        title="Speed ramp"
        on={settings.rampOn}
        onToggle={(rampOn) => update({ rampOn })}
        summary={
          ramp.from === ramp.to
            ? "From and to are the same, so this holds one tempo."
            : `Goes ${direction} from ${ramp.from} to ${ramp.to} BPM, reaching it at bar ${bars + 1} — about ${formatDuration(seconds)} in — then holds there.`
        }
      >
        <Stepper label="From" value={ramp.from} min={BPM_MIN} max={BPM_MAX} suffix="BPM" onChange={(from) => update({ ramp: { ...ramp, from } })} />
        <Stepper label="To" value={ramp.to} min={BPM_MIN} max={BPM_MAX} suffix="BPM" onChange={(to) => update({ ramp: { ...ramp, to } })} />
        <Stepper label="Change by" value={ramp.step} min={1} max={50} suffix="BPM" onChange={(step) => update({ ramp: { ...ramp, step } })} />
        <Stepper label="Every" value={ramp.everyBars} min={1} max={64} suffix="bars" onChange={(everyBars) => update({ ramp: { ...ramp, everyBars } })} />
      </Mode>

      <Mode
        title="Silent bars"
        on={settings.gapOn}
        onToggle={(gapOn) => update({ gapOn })}
        summary={`${gap.play} bar${gap.play === 1 ? "" : "s"} with the click, then ${gap.rest} without, over and over. Come back in on beat one.`}
      >
        <Stepper label="Play" value={gap.play} min={1} max={32} suffix="bars" onChange={(play) => update({ gap: { ...gap, play } })} />
        <Stepper label="Silent" value={gap.rest} min={1} max={32} suffix="bars" onChange={(rest) => update({ gap: { ...gap, rest } })} />
        <GapPreview play={gap.play} rest={gap.rest} />
      </Mode>
    </div>
  );
}

function Mode({
  title,
  on,
  onToggle,
  summary,
  children,
}: {
  title: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  summary: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className={cx("rounded-[14px] border bg-panel p-4", on ? "border-accent" : "border-border")}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-[14px] font-bold">
          {title}
        </h2>
        <input
          type="checkbox"
          role="switch"
          aria-labelledby={id}
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-6 cursor-pointer accent-accent"
        />
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{summary}</p>
      <div className="mt-2 divide-y divide-border">{children}</div>
    </section>
  );
}

/** Two cycles of the pattern drawn as blocks, so "4 and 2" is seen rather than worked out. */
function GapPreview({ play, rest }: { play: number; rest: number }) {
  const length = Math.min(32, (play + rest) * 2);
  return (
    <div className="pt-3">
      <ol aria-label="Pattern preview" className="flex flex-wrap gap-1">
        {Array.from({ length }, (_, bar) => {
          const audible = barAudible({ play, rest }, bar);
          return (
            <li
              key={bar}
              title={`Bar ${bar + 1}: ${audible ? "click" : "silent"}`}
              className={cx(
                "h-3 w-5 rounded-[3px]",
                audible ? "bg-accent" : "border border-dashed border-ink-soft/60",
              )}
            >
              <span className="sr-only">{`Bar ${bar + 1}: ${audible ? "click" : "silent"}`}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
