"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { markTourDone, useWalkaroundStore } from "@/store/useWalkaroundStore";
import { TOURS } from "@/lib/Walkaround/tours";
import { APP_MAP } from "@/components/AppCatalog";
import { TourStage } from "@/components/Walkaround/molecules/TourStage";
import { StepControls } from "@/components/Walkaround/molecules/StepControls";
import { StepList } from "@/components/Walkaround/molecules/StepList";
import { AppsIcon, ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";

const TIP_ID = "walk-tip";

/**
 * A tour in progress: the stage, the tooltip, the suggestion for this stop, and
 * the whole tour as text underneath.
 *
 * Reaching the last stop is what marks a tour seen — not a "finish" button.
 * Someone who has read the last thing there is to read has been shown the app,
 * and asking them to confirm it would only be bookkeeping.
 */
export function TourPanel() {
  const app = useWalkaroundStore((s) => s.app);
  const step = useWalkaroundStore((s) => s.step);
  const goTo = useWalkaroundStore((s) => s.goTo);
  const nudge = useWalkaroundStore((s) => s.nudge);
  const setView = useWalkaroundStore((s) => s.setView);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);

  const tour = app ? TOURS[app] : null;
  const last = tour ? tour.steps.length - 1 : 0;

  const topRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = useRef<string | null>(null);

  /**
   * Keep the current stop where it can actually be read.
   *
   * Two things make this more than a nicety. Starting a tour from the other tab
   * leaves the frame scrolled wherever that list was — possibly past the whole
   * drawing. And "inside the viewport" is not the same as "visible" here: the
   * header is sticky over the top of the scroll container and the tab bar floats
   * over its bottom, so on a phone the last stop of a tour — anchored to that
   * very tab bar — lands exactly behind the real one. Both are fixed by nudging
   * the frame so the tooltip sits in the band clear of both.
   *
   * It is the AppFrame that scrolls, not the window (it is fixed and owns its
   * own overflow), so the scroller is found by walking up rather than assumed.
   */
  useEffect(() => {
    const root = topRef.current;
    if (!app || !root) return;

    let frame: HTMLElement | null = null;
    for (let el = root.parentElement; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
        frame = el;
        break;
      }
    }
    if (!frame) return;

    // A new app is a new tour: start it from the top rather than mid-page.
    if (shown.current !== app) {
      shown.current = app;
      frame.scrollTop = 0;
    }

    const view = frame.getBoundingClientRect();
    const header = frame.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const nav = document.querySelector('[aria-label="Walkaround views"]')?.getBoundingClientRect();
    const ceiling = view.top + header + 8;
    const floor = (nav ? nav.top : view.bottom) - 8;

    // The whole stage where it fits the band, and the tooltip alone where it
    // doesn't. Both matter and they are not the same box: keeping only the
    // tooltip clear can push the region it points at behind the tab bar, which
    // leaves you reading a description of something you cannot see.
    const stage = stageRef.current?.getBoundingClientRect();
    const tip = document.getElementById(TIP_ID)?.getBoundingClientRect();
    const box = stage && stage.height <= floor - ceiling ? stage : tip;
    if (!box) return;

    // Bringing the top into view wins when both edges are out: reading from the
    // first line beats seeing the last.
    if (box.top < ceiling) frame.scrollTop -= ceiling - box.top;
    else if (box.bottom > floor) frame.scrollTop += box.bottom - floor;
  }, [app, step]);

  // The left/right arrows walk the tour. Bound while a tour is on screen only,
  // and skipped whenever a text field has the focus, so typing in the search
  // box on the other tab can never scrub through a tour behind it.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowRight") nudge(1);
      else if (e.key === "ArrowLeft") nudge(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, nudge]);

  // Seeing the last stop is finishing the tour.
  useEffect(() => {
    if (app && step === last) markTourDone(app);
  }, [app, step, last]);

  if (!app || !tour) {
    return (
      <div className="rounded-2xl border border-border bg-panel px-5 py-10 text-center">
        <p className="text-[14px] font-semibold">No app picked yet</p>
        <p className="mx-auto mt-1.5 max-w-[42ch] text-[12.5px] leading-[1.55] text-ink-soft">
          Choose one on the Apps tab and this becomes a guided tour of it — where each control is,
          and what is worth doing with it.
        </p>
        <button
          type="button"
          onClick={() => setView("apps")}
          className="hover-glow mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.1em] text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Pick an app
          <ChevronRightIcon size={14} />
        </button>
      </div>
    );
  }

  const entry = APP_MAP[app];
  const current = tour.steps[step];

  return (
    <div ref={topRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold leading-tight">
            Walking around {entry.name}
          </h2>
          <p className="mt-0.5 text-[12px] leading-tight text-ink-soft">
            Stop {step + 1} of {tour.steps.length} — {tour.intro}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setView("apps")}
            className="hover-pop inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <AppsIcon size={13} />
            Change
          </button>
          <button
            type="button"
            onClick={() => setActiveApp(app)}
            className="hover-glow inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent px-3.5 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Open {entry.name}
            <ChevronRightIcon size={13} />
          </button>
        </div>
      </div>

      {/* pb leaves the tooltip room to overhang the stage, the way a real
          tooltip overhangs what it points at. */}
      <div ref={stageRef} className="pb-3">
        <TourStage appName={entry.name} tour={tour} step={step} onPick={goTo} tipId={TIP_ID} />
      </div>

      {/* The suggestion for this stop. A live region, so stepping through with
          the arrow keys is announced rather than silently changing the page. */}
      <div
        aria-live="polite"
        className="rounded-2xl border border-border bg-panel p-3.5"
      >
        <p className="font-mono text-[9.5px] uppercase tracking-[.14em] text-accent">
          Try this — {current.title}
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-text">{current.suggestion}</p>
      </div>

      <StepControls
        step={step}
        count={tour.steps.length}
        onGo={goTo}
        titles={tour.steps.map((s) => s.title)}
      />

      <div>
        <h3 className="mb-2 font-mono text-[9.5px] uppercase tracking-[.14em] text-ink-soft">
          Every stop
        </h3>
        <StepList steps={tour.steps} step={step} onGo={goTo} />
      </div>
    </div>
  );
}
