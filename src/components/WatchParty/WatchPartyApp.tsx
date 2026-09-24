"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PARTY_TABS, useWatchPartyStore, type PartyTab } from "@/store/useWatchPartyStore";
import { Lobby } from "@/components/WatchParty/organisms/Lobby";
import { Stage } from "@/components/WatchParty/organisms/Stage";
import { WatchPanel } from "@/components/WatchParty/organisms/WatchPanel";
import { QueuePanel } from "@/components/WatchParty/organisms/QueuePanel";
import { ChatPanel } from "@/components/WatchParty/organisms/ChatPanel";
import { PeoplePanel } from "@/components/WatchParty/organisms/PeoplePanel";
import { VoiceOut } from "@/components/WatchParty/molecules/VoiceOut";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  ChatIcon,
  QueueIcon,
  UsersIcon,
  WatchPartyIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const tabs = (unread: number): BottomNavItem<PartyTab>[] => [
  {
    id: "watch",
    label: "Watch",
    hint: "Reactions, voice, subtitles and sync",
    icon: <WatchPartyIcon size={19} />,
    controls: "party-panel-watch",
  },
  {
    id: "queue",
    label: "Queue",
    hint: "What's on, what's next, and adding more",
    icon: <QueueIcon size={19} />,
    controls: "party-panel-queue",
  },
  {
    id: "chat",
    label: "Chat",
    hint: "Talk to the room",
    icon: <ChatIcon size={19} />,
    controls: "party-panel-chat",
    badge: unread,
  },
  {
    id: "people",
    label: "People",
    hint: "Who's here, invites and room rules",
    icon: <UsersIcon size={19} />,
    controls: "party-panel-people",
  },
];

/**
 * Watch Party — a room where several people watch a film or listen to music
 * together, every player held at the same moment.
 *
 * The workspace has no server, so a room is hosted by one person's browser and
 * joined by hand-carried invite codes, exactly as File Drop pairs two devices —
 * but where File Drop is one sender and one receiver, a room is a hub with up
 * to seven spokes, and what flows is a shared clock rather than a file.
 *
 * Switching to another app keeps the room open (the connections live beside the
 * store, not in this component) and closes only the microphone; returning picks
 * the film up where the room has got to. Closing the tab ends it.
 */
export function WatchPartyApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const phase = useWatchPartyStore((s) => s.phase);
  const tab = useWatchPartyStore((s) => s.tab);
  const setTab = useWatchPartyStore((s) => s.setTab);
  const unread = useWatchPartyStore((s) => s.unread);
  const roomName = useWatchPartyStore((s) => s.room?.name ?? "");
  const count = useWatchPartyStore((s) => s.room?.members.length ?? 0);
  const role = useWatchPartyStore((s) => s.role);
  const toast = useWatchPartyStore((s) => s.toast);
  const hydrate = useWatchPartyStore((s) => s.hydrate);
  const release = useWatchPartyStore((s) => s.release);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // A microphone that followed you into another app would be a bug.
  useEffect(() => release, [release]);

  useEffect(() => {
    // Closing the page leaves the room properly, so nobody waits on a ghost.
    const onHide = () => {
      const s = useWatchPartyStore.getState();
      if (s.phase === "room" || s.phase === "joining") s.leave();
    };
    // A host with guests gets the browser's "leave this page?" check first.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const s = useWatchPartyStore.getState();
      if (s.role === "host" && (s.room?.members.length ?? 0) > 1) e.preventDefault();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  const inRoom = phase === "room";

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={cx(
          "border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]",
          !inRoom && "sticky top-0 z-20",
        )}
      >
        <div
          className={cx(
            "mx-auto flex flex-wrap items-end justify-between gap-4",
            inRoom ? "max-w-[1200px]" : "max-w-[680px]",
          )}
        >
          <AppBrand
            icon={<WatchPartyIcon size={24} />}
            name="Watch Party"
            tagline={
              inRoom ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{roomName}</span>
                  <span aria-hidden>·</span>
                  <span className="flex-none">
                    {count} {count === 1 ? "person" : "people"}
                    {role === "host" ? " · you're hosting" : ""}
                  </span>
                </span>
              ) : (
                "watch and listen together, in sync"
              )
            }
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

      <main
        className={cx(
          "mx-auto w-full flex-1 px-5",
          // Phones and tablets stack the player over the tabs; a wide screen
          // puts them side by side, so the film and the chat are both in view.
          inRoom
            ? "bottom-nav-clear max-w-[1240px] min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,1fr)_380px] min-[1024px]:items-start min-[1024px]:gap-6"
            : "max-w-[720px] pt-[22px]",
        )}
      >
        {inRoom ? (
          <>
            <Stage />
            <div className="min-w-0 pt-4">
              <NavView viewKey={tab} order={PARTY_TABS} id={`party-panel-${tab}`} role="tabpanel">
                {tab === "watch" ? (
                  <WatchPanel />
                ) : tab === "queue" ? (
                  <QueuePanel />
                ) : tab === "chat" ? (
                  <ChatPanel />
                ) : (
                  <PeoplePanel />
                )}
              </NavView>
            </div>
            <VoiceOut />
          </>
        ) : (
          <Lobby />
        )}
      </main>

      {inRoom && <BottomNav label="Watch Party" items={tabs(unread)} value={tab} onChange={setTab} maxWidth={380} />}

      {/* Always in the page, so a screen reader hears each notice as it lands. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
        style={{ bottom: "calc(var(--footer-h) + var(--bottom-nav-h) + 1.5rem)" }}
      >
        {toast && (
          <p className="pointer-events-auto max-w-md rounded-2xl border border-border bg-paper px-4 py-2.5 text-center text-[12.5px] font-semibold text-text shadow-panel">
            {toast.text}
          </p>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
