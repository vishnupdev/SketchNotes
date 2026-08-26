"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import {
  appsRect,
  blockRects,
  brandRect,
  centreOf,
  resolveAnchor,
  tabRects,
  tipPlacement,
} from "@/lib/Walkaround/stage";
import type { Rect, Tour } from "@/lib/Walkaround/types";
import { SpotPin } from "@/components/Walkaround/atoms/SpotPin";
import { StepTip } from "@/components/Walkaround/atoms/StepTip";
import { AppsIcon } from "@/components/SketchNotes/atoms/icons";

/** Where each stop's pin goes, and which region each stop lights up. */
interface Pin {
  index: number;
  x: number;
  y: number;
  title: string;
}

/**
 * Pins for a tour, spread along the top edge of whatever each stop points at.
 *
 * Stops that share an anchor — two things worth saying about one region — would
 * otherwise stack into a single dot, so a group of them is spaced evenly across
 * the region's width instead. Which is also why the pin sits on the region's
 * edge rather than in the middle of it: the middle is where the region's own
 * label is.
 */
function pinsFor(tour: Tour): Pin[] {
  const groups = new Map<string, number[]>();
  tour.steps.forEach((step, i) => {
    const list = groups.get(step.at) ?? [];
    list.push(i);
    groups.set(step.at, list);
  });

  const pins: Pin[] = [];
  for (const [anchor, indices] of groups) {
    const rect = resolveAnchor(tour.layout, anchor as Tour["steps"][number]["at"]);
    if (!rect) continue; // caught by walkaround.test.ts long before this renders
    indices.forEach((index, k) => {
      pins.push({
        index,
        x: rect.x + (rect.w * (k + 1)) / (indices.length + 1),
        y: rect.y,
        title: tour.steps[index].title,
      });
    });
  }
  return pins.sort((a, b) => a.index - b.index);
}

/** Percentage box, as inline style. */
const box = (r: Rect) => ({
  left: `${r.x}%`,
  top: `${r.y}%`,
  width: `${r.w}%`,
  height: `${r.h}%`,
});

function Region({
  rect,
  lit,
  children,
  className,
}: {
  rect: Rect;
  lit: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      style={box(rect)}
      className={cx(
        "absolute grid place-items-center overflow-hidden rounded-lg border px-1.5 text-center",
        lit ? "border-accent bg-accent-soft" : "border-border bg-panel",
        className,
      )}
      /* Colour only, so lighting a region costs no layout — see rule #7. */
    >
      {children}
    </div>
  );
}

/** A region's name, small enough to sit inside it without wrapping oddly. */
function Label({ lit, children }: { lit: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "line-clamp-2 text-[8.5px] leading-tight min-[560px]:text-[10px]",
        lit ? "font-semibold text-accent" : "text-ink-soft",
      )}
    >
      {children}
    </span>
  );
}

interface TourStageProps {
  appName: string;
  tour: Tour;
  /** The stop on show. */
  step: number;
  onPick: (step: number) => void;
  /** Id the active pin is described by — the tooltip's id. */
  tipId: string;
}

/**
 * The stage: a schematic of one app's screen, with the current stop pinned and
 * a tooltip pointing at it.
 *
 * It is deliberately a *drawing* and not the app. Reaching into twenty-five
 * other apps for real elements to highlight would couple every one of them to
 * this one and break the first time any of them moved a button (rule #5); a
 * schematic can only ever be out of date, which a test can check. What it has to
 * get right is recognisability — the header block, the Apps button, the working
 * area and the tab bar are where they are in every app here, so the drawing
 * reads as "that screen" at a glance.
 *
 * Everything is positioned in percentages of the box, so the same numbers work
 * on a 360px phone and a wide desktop panel with nothing measured at runtime.
 */
export function TourStage({ appName, tour, step, onPick, tipId }: TourStageProps) {
  const { layout } = tour;
  const active = tour.steps[step];
  const blocks = blockRects(layout);
  const tabs = tabRects(layout);
  const pins = pinsFor(tour);

  const target = resolveAnchor(layout, active.at);
  const place = target && tipPlacement(target);
  const lit = (anchor: string) => active.at === anchor;

  return (
    <div
      /* overflow-visible: the tooltip is allowed to overhang the stage, the way
         a real tooltip overhangs what it points at. The rounded frame it needs
         to be clipped by is the inner layer below. */
      /* 4:5 on a phone rather than 3:4: the stage has to fit between the sticky
         header and the floating tab bar for the tooltip *and* the region it
         points at to be visible at once (see TourPanel). */
      className="relative aspect-[4/5] w-full min-[560px]:aspect-[16/10]"
    >
      {/* The screen itself. Sits behind the pins and the tooltip. */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-paper">
        {/* Header band, so the masthead reads as a header and not a card. */}
        <div className="absolute inset-x-0 top-0 h-[20%] border-b border-border bg-panel/60" />
      </div>

      {/* Masthead: the app's own name, as its header carries it. */}
      <Region rect={brandRect()} lit={lit("brand")} className="px-2">
        <span className="w-full text-left">
          <span
            className={cx(
              "block truncate text-[10px] font-bold leading-tight min-[560px]:text-[12px]",
              lit("brand") ? "text-accent" : "text-text",
            )}
          >
            {appName}
          </span>
          <span className="block truncate font-serif text-[8px] italic leading-tight text-ink-soft min-[560px]:text-[10px]">
            {tour.tagline}
          </span>
        </span>
      </Region>

      {/* The Apps button — in this corner in every app in the workspace. */}
      <Region rect={appsRect()} lit={lit("apps")} className="rounded-full">
        <span
          className={cx(
            "flex items-center gap-1 font-mono text-[8px] uppercase tracking-[.1em] min-[560px]:text-[9.5px]",
            lit("apps") ? "text-accent" : "text-ink-soft",
          )}
        >
          <AppsIcon size={10} />
          Apps
        </span>
      </Region>

      {/* The working area, region by region. */}
      {layout.blocks.map((block, i) => (
        <Region key={block.label + i} rect={blocks[i]} lit={lit(`body:${i}`) || lit("body")}>
          <Label lit={lit(`body:${i}`) || lit("body")}>{block.label}</Label>
        </Region>
      ))}

      {/* The bottom tab bar, for the apps that have one. */}
      {tabs.map((rect, i) => (
        <Region key={(layout.tabs?.[i] ?? "") + i} rect={rect} lit={lit(`tab:${i}`)}>
          <Label lit={lit(`tab:${i}`)}>{layout.tabs?.[i]}</Label>
        </Region>
      ))}

      {pins.map((pin) => (
        <SpotPin
          key={pin.index}
          n={pin.index + 1}
          x={pin.x}
          y={pin.y}
          active={pin.index === step}
          title={pin.title}
          onSelect={() => onPick(pin.index)}
        />
      ))}

      {target && place && (
        <StepTip
          id={tipId}
          title={active.title}
          direction={active.direction}
          pinX={centreOf(target).x}
          edgeY={place.edgeY}
          side={place.side}
        />
      )}
    </div>
  );
}
