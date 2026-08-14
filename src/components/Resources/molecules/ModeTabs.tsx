"use client";

import type { ResourceTab } from "@/store/useResourcesStore";
import { AppsIcon, EyeIcon, PulseIcon, ShieldIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<ResourceTab>[] = [
  {
    id: "live",
    label: "Live",
    hint: "What is being used right now",
    icon: <PulseIcon size={19} />,
    controls: "resources-panel-live",
  },
  {
    id: "access",
    label: "Access",
    hint: "Every resource this site can ask for",
    icon: <ShieldIcon size={19} />,
    controls: "resources-panel-access",
  },
  {
    id: "apps",
    label: "Apps",
    hint: "What each app in the workspace uses",
    icon: <AppsIcon size={19} />,
    controls: "resources-panel-apps",
  },
  {
    id: "privacy",
    label: "Privacy",
    hint: "Tracking signals and what is stored",
    icon: <EyeIcon size={19} />,
    controls: "resources-panel-privacy",
  },
];

/** The tab ids in bar order — derived, so a panel can't animate the wrong way. */
export const RESOURCE_TAB_ORDER = TABS.map((t) => t.id);

export function ModeTabs({
  tab,
  onTab,
}: {
  tab: ResourceTab;
  onTab: (tab: ResourceTab) => void;
}) {
  return (
    <BottomNav label="Resource Monitor views" items={TABS} value={tab} onChange={onTab} maxWidth={440} />
  );
}
