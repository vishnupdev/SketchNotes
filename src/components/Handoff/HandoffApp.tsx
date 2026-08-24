"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { SendPanel } from "@/components/Handoff/organisms/SendPanel";
import { ReceivePanel } from "@/components/Handoff/organisms/ReceivePanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { AppsIcon, HandoffIcon, ScanIcon, SendIcon } from "@/components/SketchNotes/atoms/icons";

type HandoffTab = "send" | "receive";

const TABS: BottomNavItem<HandoffTab>[] = [
  {
    id: "send",
    label: "Send",
    hint: "Show this device's data as codes",
    icon: <SendIcon size={19} />,
    controls: "handoff-panel-send",
  },
  {
    id: "receive",
    label: "Receive",
    hint: "Read another device's codes",
    icon: <ScanIcon size={19} />,
    controls: "handoff-panel-receive",
  },
];

const TAB_ORDER = TABS.map((t) => t.id);

/**
 * Handoff — move what this browser holds onto another device, with nothing in
 * between.
 *
 * The workspace deliberately has no account and no server, which left one thing
 * genuinely awkward: getting your board, notes or tasks onto your phone. This
 * closes it using only what both devices already have. One shows codes, the
 * other reads them; for anything large the same codes are used to open a direct
 * connection over the local network instead, so the transfer takes seconds.
 *
 * What travels is exactly the backup document Settings → Data writes to a file
 * (`lib/backup/`), so a transfer is validated by the same reader, lands through
 * the same "add or replace" choice, and can carry any app's data without this
 * app knowing anything about that app.
 */
export function HandoffApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const [tab, setTab] = useState<HandoffTab>("send");

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<HandoffIcon size={24} />}
            name="Handoff"
            tagline="move your data to another device"
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
        <NavView viewKey={tab} order={TAB_ORDER} id={`handoff-panel-${tab}`} role="tabpanel">
          {tab === "send" ? <SendPanel /> : <ReceivePanel />}
        </NavView>
      </main>

      <BottomNav label="Handoff direction" items={TABS} value={tab} onChange={setTab} maxWidth={300} />

      <AppFooter />
    </div>
  );
}
