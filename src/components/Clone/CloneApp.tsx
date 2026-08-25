"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useCloneStore } from "@/store/useCloneStore";
import { SendClonePanel } from "@/components/Clone/organisms/SendClonePanel";
import { ReceiveClonePanel } from "@/components/Clone/organisms/ReceiveClonePanel";
import { DevicePanel } from "@/components/Clone/organisms/DevicePanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  CloneIcon,
  InboxIcon,
  MonitorIcon,
  SendIcon,
} from "@/components/SketchNotes/atoms/icons";

type CloneTab = "send" | "receive" | "device";

const TABS: BottomNavItem<CloneTab>[] = [
  {
    id: "send",
    label: "Send",
    hint: "Copy this device onto another one",
    icon: <SendIcon size={19} />,
    controls: "clone-panel-send",
  },
  {
    id: "receive",
    label: "Receive",
    hint: "Take another device's workspace onto this one",
    icon: <InboxIcon size={19} />,
    controls: "clone-panel-receive",
  },
  {
    id: "device",
    label: "Device",
    hint: "Name this device, and see what it has cloned",
    icon: <MonitorIcon size={19} />,
    controls: "clone-panel-device",
  },
];

const TAB_ORDER = TABS.map((t) => t.id);

/**
 * Clone — make one device's workspace into another's, whatever you have to
 * join them with.
 *
 * The workspace keeps everything in the browser and nothing on a server, which
 * is the privacy promise and also the problem this app exists for: a new laptop
 * or a new phone starts empty, and there is no account to sign into that would
 * fill it. Handoff already moves a chosen app or two by camera; this moves the
 * *whole device*, and it does it down whichever of the three routes a person
 * actually has:
 *
 *  - **By cable** — USB tethering turns the wire into a private network and the
 *    direct link runs inside it, so a full clone crosses in seconds with
 *    nothing — no router, no internet, no third party — involved. Where a cable
 *    can't carry a network, a clone file on a USB stick or memory card does the
 *    same job with one more step.
 *  - **Over a network** — the same direct link over Wi-Fi, or across the
 *    internet between two networks, which is the only case that contacts anyone
 *    else (a public STUN server, asked one question, and never shown the data).
 *  - **Without a network** — a loop of QR codes read straight off this screen by
 *    the other device's camera. No radio at all.
 *
 * Everything that travels is the same document Settings → Data writes to a
 * backup file (`lib/backup/`), wrapped with where it came from and a checksum
 * over exactly those bytes. So a clone is validated by the same reader as a
 * backup, lands through the same "add or replace" decision, and carries any
 * app's data without this app knowing anything about that app.
 */
export function CloneApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const hydrate = useCloneStore((s) => s.hydrate);
  const ready = useCloneStore((s) => s.ready);
  const [tab, setTab] = useState<CloneTab>("send");

  // Merged in after mount rather than at import, so the server and the first
  // client render agree on an empty device name.
  useEffect(() => {
    if (!ready) hydrate();
  }, [ready, hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<CloneIcon size={24} />}
            name="Clone"
            tagline="copy this whole device onto another"
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
        <NavView viewKey={tab} order={TAB_ORDER} id={`clone-panel-${tab}`} role="tabpanel">
          {tab === "send" ? (
            <SendClonePanel />
          ) : tab === "receive" ? (
            <ReceiveClonePanel />
          ) : (
            <DevicePanel />
          )}
        </NavView>
      </main>

      <BottomNav label="Clone direction" items={TABS} value={tab} onChange={setTab} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
