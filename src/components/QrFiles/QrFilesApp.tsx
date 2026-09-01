"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { QRFILES_TABS, useQrFilesStore, type QrFilesTab } from "@/store/useQrFilesStore";
import { EncodePanel } from "@/components/QrFiles/organisms/EncodePanel";
import { RebuildPanel } from "@/components/QrFiles/organisms/RebuildPanel";
import { HistoryPanel } from "@/components/QrFiles/organisms/HistoryPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  ClockIcon,
  FileQrIcon,
  QrIcon,
  ScanIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<QrFilesTab>[] = [
  {
    id: "encode",
    label: "Encode",
    hint: "Turn a picture, document, song or clip into codes",
    icon: <QrIcon size={19} />,
    controls: "qrfiles-panel-encode",
  },
  {
    id: "rebuild",
    label: "Rebuild",
    hint: "Read the codes back into the file they came from",
    icon: <ScanIcon size={19} />,
    controls: "qrfiles-panel-rebuild",
  },
  {
    id: "history",
    label: "History",
    hint: "What has passed through this device",
    icon: <ClockIcon size={19} />,
    controls: "qrfiles-panel-history",
  },
];

/**
 * QR Files — a whole file, carried by QR codes.
 *
 * The QR Codes app next door writes what a code was designed for: a link, a
 * Wi-Fi password, a contact — a line of text a phone can act on. This one uses
 * the same squares as a *storage medium*, which they were never meant to be, and
 * that difference is the app: a photo becomes two hundred numbered codes, a song
 * becomes a booklet of them, and either can be read back byte for byte.
 *
 * Why bother, when File Drop exists and is faster in every way that a network
 * can be measured: because this needs no network at all, and no second device
 * either. A code survives being printed, photocopied, glued into a notebook and
 * photographed a decade later, which is a durability nothing else in the
 * workspace offers. The cost is honest and shown before anything is built —
 * every file's size, in codes, in pages, in seconds.
 *
 * Everything happens on the device. The bytes are read from a file the user
 * picked, drawn as codes locally and never uploaded; the camera is released the
 * moment scanning stops or the app is left, and only the *names* of what passed
 * through are kept.
 */
export function QrFilesApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useQrFilesStore((s) => s.tab);
  const setTab = useQrFilesStore((s) => s.setTab);
  const hydrate = useQrFilesStore((s) => s.hydrate);

  // Adopt the saved history and settings once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<FileQrIcon size={24} />}
            name="QR Files"
            tagline="any file, as a wall of codes"
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
        <NavView viewKey={tab} order={QRFILES_TABS} id={`qrfiles-panel-${tab}`} role="tabpanel">
          {tab === "encode" ? (
            <EncodePanel />
          ) : tab === "rebuild" ? (
            <RebuildPanel />
          ) : (
            <HistoryPanel />
          )}
        </NavView>
      </main>

      <BottomNav
        label="QR Files tools"
        items={TABS}
        value={tab}
        onChange={setTab}
        maxWidth={360}
      />

      <AppFooter />
    </div>
  );
}
