"use client";

import type { WorldClockMode } from "@/store/useWorldClockStore";
import { ClockIcon, CompassIcon, NewsIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<WorldClockMode>[] = [
  {
    id: "clocks",
    label: "Clocks",
    hint: "Live times for the cities you pin",
    icon: <ClockIcon size={19} />,
    controls: "worldclock-panel-clocks",
  },
  {
    id: "country",
    label: "Country",
    hint: "Details and specialities of the country in focus",
    icon: <CompassIcon size={19} />,
    controls: "worldclock-panel-country",
  },
  {
    id: "news",
    label: "News",
    hint: "Latest headlines from that country",
    icon: <NewsIcon size={19} />,
    controls: "worldclock-panel-news",
  },
];

/**
 * The tab ids in bar order. Derived from TABS rather than written out again, so
 * the direction a panel animates in can never disagree with the order the tabs
 * are actually shown in.
 */
export const WORLDCLOCK_MODE_ORDER = TABS.map((t) => t.id);

/** The app's three views, as the floating bottom bar. */
export function ModeTabs({
  mode,
  onMode,
}: {
  mode: WorldClockMode;
  onMode: (mode: WorldClockMode) => void;
}) {
  return <BottomNav label="World Clock views" items={TABS} value={mode} onChange={onMode} maxWidth={360} />;
}
