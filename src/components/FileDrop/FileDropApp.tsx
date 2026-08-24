"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useFileDrop } from "@/hooks/useFileDrop";
import { inviteFromLocation } from "@/lib/rtc/code";
import { SendFilesPanel } from "@/components/FileDrop/organisms/SendFilesPanel";
import { ReceiveFilesPanel } from "@/components/FileDrop/organisms/ReceiveFilesPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { AppsIcon, DropIcon, ImportIcon, SendIcon } from "@/components/SketchNotes/atoms/icons";

type DropTab = "send" | "receive";

const TABS: BottomNavItem<DropTab>[] = [
  {
    id: "send",
    label: "Send",
    hint: "Pick files and hand over an invite",
    icon: <SendIcon size={19} />,
    controls: "drop-panel-send",
  },
  {
    id: "receive",
    label: "Receive",
    hint: "Open an invite and save what arrives",
    icon: <ImportIcon size={19} />,
    controls: "drop-panel-receive",
  },
];

const TAB_ORDER = TABS.map((t) => t.id);

/**
 * File Drop — send a file of any size from any device to any device.
 *
 * The workspace has no server and no account, which is exactly why this exists
 * as a peer-to-peer transfer rather than an upload: the bytes go straight from
 * one browser to the other over a WebRTC data channel, streamed a chunk at a time
 * so a four-gigabyte video costs no more memory than a text file, and verified
 * with a checksum per file on arrival.
 *
 * The two devices still have to be introduced, and that is the only part a user
 * has to do by hand — carrying a code across by QR, by link, or by pasting it
 * into whatever chat they already use. In exchange:
 *
 *  - **on one network** nothing outside it is contacted, so it works with no
 *    internet connection at all;
 *  - **across the internet** a public STUN server is asked for this device's
 *    public address — and only that; the files never touch it.
 *
 * There is no relay server, which is the one honest limitation: a small share of
 * network pairs cannot be connected directly, and the app says so and points at
 * the same-network route rather than failing vaguely.
 */
export function FileDropApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  // An invite link lands on this app, so it opens on the receiving side.
  const [tab, setTab] = useState<DropTab>(() => (inviteFromLocation() ? "receive" : "send"));
  const drop = useFileDrop();

  // Leaving the app ends any session: no open connection, no half-written file.
  const { reset } = drop;
  useEffect(() => reset, [reset]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<DropIcon size={24} />}
            name="File Drop"
            tagline="send any file, device to device"
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
        <NavView viewKey={tab} order={TAB_ORDER} id={`drop-panel-${tab}`} role="tabpanel">
          {tab === "send" ? (
            <SendFilesPanel drop={drop} />
          ) : (
            <ReceiveFilesPanel drop={drop} />
          )}
        </NavView>
      </main>

      <BottomNav
        label="File Drop direction"
        items={TABS}
        value={tab}
        onChange={(next) => {
          // One session at a time: changing direction ends whatever was open.
          drop.reset();
          setTab(next);
        }}
        maxWidth={300}
      />

      <AppFooter />
    </div>
  );
}
