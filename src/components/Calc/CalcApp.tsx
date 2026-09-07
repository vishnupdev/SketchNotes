"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CALC_TOOLS, useCalcStore, type CalcTool } from "@/store/useCalcStore";
import { TapePanel } from "@/components/Calc/organisms/TapePanel";
import { BasesPanel } from "@/components/Calc/organisms/BasesPanel";
import { PercentPanel } from "@/components/Calc/organisms/PercentPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  BinaryIcon,
  CalcIcon,
  PercentIcon,
  TapeIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<CalcTool>[] = [
  {
    id: "tape",
    label: "Tape",
    hint: "A calculation a line, each one named and reusable",
    icon: <TapeIcon size={19} />,
    controls: "calc-panel-tape",
  },
  {
    id: "bases",
    label: "Bases",
    hint: "Hex, binary and octal, with the bits laid out",
    icon: <BinaryIcon size={19} />,
    controls: "calc-panel-bases",
  },
  {
    id: "percent",
    label: "Percent",
    hint: "The four percentage questions, asked in words",
    icon: <PercentIcon size={19} />,
    controls: "calc-panel-percent",
  },
];

/**
 * Calc — the calculator the workspace was missing.
 *
 * Convert handles units, Chrono handles durations and Text Kit handles
 * encodings, but nothing here would work out a bill. The gap was worth filling
 * as three tabs rather than a keypad, because the arithmetic is not the hard
 * part of any of them:
 *
 * - **Tape** is a *document*, not a line. A real question — what does this cost
 *   a month, what is left after the discount — is a rate, a count and a total,
 *   and on a one-line calculator every intermediate answer has to be held in
 *   your head. Here each line keeps its answer, can be named, and one bad line
 *   never costs you the rest.
 * - **Bases** exists because JavaScript cannot do it. Its bitwise operators
 *   coerce to 32-bit signed, so a 64-bit mask is simply wrong; this works in
 *   arbitrary-precision integers masked to a width you choose, and shows the
 *   bits, numbered, because "is bit 6 set" is the actual question.
 * - **Percent** asks the question in words, because which figure a percentage
 *   is measured *against* is the whole difficulty — a price including 18% tax
 *   does not have 18% taken off it.
 *
 * Every calculation is a pure function in `lib/Calc/`, so all of it works
 * offline and none of it leaves the device.
 */
export function CalcApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useCalcStore((s) => s.tool);
  const setTool = useCalcStore((s) => s.setTool);
  const hydrate = useCalcStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<CalcIcon size={24} />}
            name="Calc"
            tagline="a tape, not a keypad"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="bottom-nav-clear mx-auto w-full max-w-[720px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={CALC_TOOLS} id={`calc-panel-${tool}`} role="tabpanel">
          {tool === "tape" ? <TapePanel /> : tool === "bases" ? <BasesPanel /> : <PercentPanel />}
        </NavView>
      </main>

      <BottomNav label="Calc tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
