"use client";

import type { CSSProperties } from "react";
import { BeatButton } from "@/components/Metronome/atoms/BeatButton";
import { useMetronomeStore } from "@/store/useMetronomeStore";

/**
 * The bar, one button per beat. It lights the beat being heard and lets any
 * beat be re-accented while the metronome runs.
 *
 * Bars longer than six beats fold onto two rows below `sm`, so a 12/8 bar
 * keeps targets a thumb can hit at 360px rather than twelve slivers.
 */
export function BeatStrip() {
  const accents = useMetronomeStore((s) => s.settings.accents);
  const cycleBeat = useMetronomeStore((s) => s.cycleBeat);
  const position = useMetronomeStore((s) => s.position);
  const beats = accents.length;

  const style = {
    "--cols": beats,
    "--cols-narrow": beats > 6 ? Math.ceil(beats / 2) : beats,
  } as CSSProperties;

  return (
    <div
      role="group"
      aria-label="Beats in the bar — press one to change its accent"
      style={style}
      className="grid grid-cols-[repeat(var(--cols-narrow),minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
    >
      {accents.map((accent, index) => (
        <BeatButton
          key={index}
          index={index}
          accent={accent}
          current={position !== null && position.audible && position.beat === index}
          onCycle={() => cycleBeat(index)}
        />
      ))}
    </div>
  );
}
