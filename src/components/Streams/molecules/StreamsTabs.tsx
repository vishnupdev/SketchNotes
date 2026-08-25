"use client";

import type { StreamsTab } from "@/store/useStreamsStore";
import { SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { LibraryIcon, LiveIcon, MusicIcon } from "@/components/Streams/atoms/icons";

const TABS: BottomNavItem<StreamsTab>[] = [
  {
    id: "music",
    label: "Music",
    hint: "Music stations — a genre or a language scene",
    icon: <MusicIcon size={19} />,
    controls: "streams-panel-music",
  },
  {
    id: "live",
    label: "Live",
    hint: "Channels broadcasting right now",
    icon: <LiveIcon size={19} />,
    controls: "streams-panel-live",
  },
  {
    id: "search",
    label: "Search",
    hint: "Find anything on YouTube",
    icon: <SearchIcon size={19} />,
    controls: "streams-panel-search",
  },
  {
    id: "library",
    label: "Library",
    hint: "What you saved, and what you played",
    icon: <LibraryIcon size={19} />,
    controls: "streams-panel-library",
  },
];

/** Tab ids in bar order, so a panel animates in from the side its tab sits on. */
export const STREAMS_TAB_ORDER = TABS.map((t) => t.id);

export function StreamsTabs({
  tab,
  onTab,
}: {
  tab: StreamsTab;
  onTab: (tab: StreamsTab) => void;
}) {
  return <BottomNav label="Streams sections" items={TABS} value={tab} onChange={onTab} maxWidth={420} />;
}
