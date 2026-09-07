"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CARDS_TOOLS, useCardsStore, type CardsTool } from "@/store/useCardsStore";
import { ReviewPanel } from "@/components/Cards/organisms/ReviewPanel";
import { DecksPanel } from "@/components/Cards/organisms/DecksPanel";
import { ProgressPanel } from "@/components/Cards/organisms/ProgressPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  CardsIcon,
  FlipIcon,
  PulseIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<CardsTool>[] = [
  {
    id: "review",
    label: "Review",
    hint: "Answer what is due",
    icon: <FlipIcon size={19} />,
    controls: "cards-panel-review",
  },
  {
    id: "decks",
    label: "Decks",
    hint: "Write cards, or paste a list you already have",
    icon: <CardsIcon size={19} />,
    controls: "cards-panel-decks",
  },
  {
    id: "stats",
    label: "Progress",
    hint: "How much is known, and what is coming",
    icon: <PulseIcon size={19} />,
    controls: "cards-panel-stats",
  },
];

/**
 * Cards — spaced repetition, on the device, with no account.
 *
 * The workspace already teaches two things (Morse Code drills, Malayalam
 * transliteration); this generalises the part they have in common — that
 * remembering something is a schedule, not an evening. It is an SM-2 scheduler
 * (`lib/Cards/srs.ts`): a card you know comes back later each time, and one you
 * miss comes back in a minute.
 *
 * The parts that make it usable rather than a demo: every answer button says
 * when the card returns, the import takes whatever list you already have, and a
 * backup carries the *schedules* — months of reviews are the one thing a text
 * export cannot preserve.
 */
export function CardsApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useCardsStore((s) => s.tool);
  const setTool = useCardsStore((s) => s.setTool);
  const hydrate = useCardsStore((s) => s.hydrate);
  const next = useCardsStore((s) => s.next);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Coming back to the Review tab re-draws the queue: cards answered "Again"
  // minutes ago are due now, and the tab has to reflect that rather than the
  // queue as it was when the tab was left.
  useEffect(() => {
    if (tool === "review") next();
  }, [next, tool]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<CardsIcon size={24} />}
            name="Cards"
            tagline="remember it on a schedule, not in an evening"
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
        <NavView viewKey={tool} order={CARDS_TOOLS} id={`cards-panel-${tool}`} role="tabpanel">
          {tool === "review" ? (
            <ReviewPanel />
          ) : tool === "decks" ? (
            <DecksPanel />
          ) : (
            <ProgressPanel />
          )}
        </NavView>
      </main>

      <BottomNav label="Cards tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
