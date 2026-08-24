"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useQrStore } from "@/store/useQrStore";
import { QrTabs, QR_TAB_ORDER } from "@/components/QrTool/molecules/QrTabs";
import { ScanPanel } from "@/components/QrTool/organisms/ScanPanel";
import { CreatePanel } from "@/components/QrTool/organisms/CreatePanel";
import { HistoryPanel } from "@/components/QrTool/organisms/HistoryPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AppsIcon, QrIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * QR Codes — read one, or make one.
 *
 * Reading uses the browser's own barcode detector where it exists and a bundled
 * decoder where it doesn't, so it works on every browser here and entirely
 * on-device: no frame leaves the page, and the camera is released the moment
 * scanning stops or you leave the app. A code that is already on your screen can
 * be dropped, pasted or picked as a picture instead, with no camera at all.
 *
 * Writing produces the formats phone cameras actually act on — links, Wi-Fi
 * credentials, contact cards, email, SMS, locations — and saves as PNG or SVG.
 * The whole app works with no connection.
 */
export function QrToolApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useQrStore((s) => s.tab);
  const setTab = useQrStore((s) => s.setTab);
  const hydrate = useQrStore((s) => s.hydrate);

  // Adopt saved history and preferences once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand icon={<QrIcon size={24} />} name="QR Codes" tagline="scan one, or make one" />

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
        <NavView viewKey={tab} order={QR_TAB_ORDER} id={`qr-panel-${tab}`} role="tabpanel">
          {tab === "scan" ? <ScanPanel /> : tab === "create" ? <CreatePanel /> : <HistoryPanel />}
        </NavView>
      </main>

      <QrTabs tab={tab} onTab={setTab} />

      <AppFooter />
    </div>
  );
}
