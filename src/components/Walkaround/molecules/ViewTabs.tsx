"use client";

import { AppsIcon, WalkaroundIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import type { WalkView } from "@/store/useWalkaroundStore";

const TABS: BottomNavItem<WalkView>[] = [
  {
    id: "apps",
    label: "Apps",
    hint: "Choose which app to walk around",
    icon: <AppsIcon size={19} />,
    controls: "walk-panel-apps",
  },
  {
    id: "tour",
    label: "Walkaround",
    hint: "The guided tour, stop by stop",
    icon: <WalkaroundIcon size={19} />,
    controls: "walk-panel-tour",
  },
];

/** Tab ids in bar order, so a panel animates in from the side its tab sits on. */
export const WALK_TAB_ORDER = TABS.map((t) => t.id);

export function ViewTabs({
  view,
  onView,
}: {
  view: WalkView;
  onView: (view: WalkView) => void;
}) {
  return <BottomNav label="Walkaround views" items={TABS} value={view} onChange={onView} maxWidth={300} />;
}
