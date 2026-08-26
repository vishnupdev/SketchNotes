"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { WALLET_TOOLS, useWalletStore, type WalletTool } from "@/store/useWalletStore";
import { SpendPanel } from "@/components/Wallet/organisms/SpendPanel";
import { MonthPanel } from "@/components/Wallet/organisms/MonthPanel";
import { SplitPanel } from "@/components/Wallet/organisms/SplitPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  CoinIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<WalletTool>[] = [
  {
    id: "spend",
    label: "Log",
    hint: "Add what you spent, and see the last fortnight",
    icon: <CoinIcon size={19} />,
    controls: "wallet-panel-spend",
  },
  {
    id: "month",
    label: "Month",
    hint: "Where the month went, with a target and a CSV",
    icon: <WalletIcon size={19} />,
    controls: "wallet-panel-month",
  },
  {
    id: "split",
    label: "Split",
    hint: "Split a bill and see who pays whom",
    icon: <UsersIcon size={19} />,
    controls: "wallet-panel-split",
  },
];

/**
 * Wallet — what you spent, where it went, and who owes whom.
 *
 * Two things make this different from the spend trackers people abandon:
 *
 *  - **Logging is a four-second job.** Amount, one tap, done — see `SpendPanel`.
 *    Every field beyond that is optional, because a tracker with gaps produces
 *    confident totals that are wrong, and friction is what makes the gaps.
 *  - **It has nowhere to send your money data.** No account, no bank link, no
 *    server. Which is also why it cannot categorise your transactions for you —
 *    an honest trade, and the reason the category grid is one tap rather than a
 *    menu.
 *
 * Amounts are integer minor units throughout (`lib/Wallet/types.ts`), so nothing
 * here can lose a paisa to floating point.
 */
export function WalletApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useWalletStore((s) => s.tool);
  const setTool = useWalletStore((s) => s.setTool);
  const hydrate = useWalletStore((s) => s.hydrate);

  // Adopt the saved ledger once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<WalletIcon size={24} />}
            name="Wallet"
            tagline="what you spent, and where it went"
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[760px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={WALLET_TOOLS} id={`wallet-panel-${tool}`} role="tabpanel">
          {tool === "spend" ? <SpendPanel /> : tool === "month" ? <MonthPanel /> : <SplitPanel />}
        </NavView>
      </main>

      <BottomNav label="Wallet views" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
