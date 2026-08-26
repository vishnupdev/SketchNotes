"use client";

import { useWalkaroundStore } from "@/store/useWalkaroundStore";
import { AppPickGrid } from "@/components/Walkaround/molecules/AppPickGrid";
import { TOUR_APP_IDS } from "@/lib/Walkaround/tours";

/**
 * The picker: which app do you want walked around.
 *
 * The progress line at the top is the only summary here, and it is the honest
 * one — how many of the workspace's apps you have actually been shown, rather
 * than a percentage of anything.
 */
export function PickPanel() {
  const app = useWalkaroundStore((s) => s.app);
  const done = useWalkaroundStore((s) => s.done);
  const start = useWalkaroundStore((s) => s.start);

  const total = TOUR_APP_IDS.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-panel p-3.5">
        <h2 className="text-[15px] font-bold leading-tight">Pick an app to walk around</h2>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-soft">
          Each walkaround is a short guided tour of one app: a drawing of its screen with a tooltip
          on each control in turn, saying where it is, what it does, and what is worth trying.
          Nothing is changed in the app itself — you can read the whole thing and then open it.
        </p>
        <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[.12em] text-accent">
          {done.length} of {total} seen
        </p>
      </div>

      <AppPickGrid current={app} done={done} onPick={start} />
    </div>
  );
}
