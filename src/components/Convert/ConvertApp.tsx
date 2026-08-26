"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CONVERT_TOOLS, useConvertStore, type ConvertTool } from "@/store/useConvertStore";
import { UnitPanel } from "@/components/Convert/organisms/UnitPanel";
import { CurrencyPanel } from "@/components/Convert/organisms/CurrencyPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { AppsIcon, ConvertIcon, CoinIcon, RulerIcon } from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<ConvertTool>[] = [
  {
    id: "units",
    label: "Units",
    hint: "Length, weight, temperature, data, and more",
    icon: <RulerIcon size={19} />,
    controls: "convert-panel-units",
  },
  {
    id: "currency",
    label: "Money",
    hint: "Currency, at the latest published rate",
    icon: <CoinIcon size={19} />,
    controls: "convert-panel-currency",
  },
];

/**
 * Convert — the number half of the small-jobs pair, where Text Kit is the text
 * half: how long, how heavy, how hot, how much.
 *
 * Split into physical units and money because they behave differently in the one
 * way that matters here. A metre is a metre forever, so units work with no
 * network at all and no caveats. A rate is only true for a day, so money needs
 * fetching and needs its date shown — see `CurrencyPanel`. Putting them in one
 * app but separate tabs is what lets the units side stay unconditionally offline
 * while the money side is honest about what it knows.
 */
export function ConvertApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useConvertStore((s) => s.tool);
  const setTool = useConvertStore((s) => s.setTool);
  const hydrate = useConvertStore((s) => s.hydrate);

  // Adopt the saved pickers once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<ConvertIcon size={24} />}
            name="Convert"
            tagline="how long, how heavy, how much"
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
        <NavView
          viewKey={tool}
          order={CONVERT_TOOLS}
          id={`convert-panel-${tool}`}
          role="tabpanel"
        >
          {tool === "units" ? <UnitPanel /> : <CurrencyPanel />}
        </NavView>
      </main>

      <BottomNav label="Convert tools" items={TABS} value={tool} onChange={setTool} maxWidth={300} />

      <AppFooter />
    </div>
  );
}
