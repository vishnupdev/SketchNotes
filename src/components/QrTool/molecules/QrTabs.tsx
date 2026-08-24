"use client";

import type { QrTab } from "@/store/useQrStore";
import { CameraIcon, ClockIcon, QrIcon } from "@/components/SketchNotes/atoms/icons";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";

const TABS: BottomNavItem<QrTab>[] = [
  {
    id: "scan",
    label: "Scan",
    hint: "Read a code with the camera, or from a picture",
    icon: <CameraIcon size={19} />,
    controls: "qr-panel-scan",
  },
  {
    id: "create",
    label: "Create",
    hint: "Make a code for a link, Wi-Fi, contact and more",
    icon: <QrIcon size={19} />,
    controls: "qr-panel-create",
  },
  {
    id: "history",
    label: "Recent",
    hint: "Codes scanned and made on this device",
    icon: <ClockIcon size={19} />,
    controls: "qr-panel-history",
  },
];

/** Tab ids in bar order, so a panel animates in from the side its tab sits on. */
export const QR_TAB_ORDER = TABS.map((t) => t.id);

export function QrTabs({ tab, onTab }: { tab: QrTab; onTab: (tab: QrTab) => void }) {
  return <BottomNav label="QR tools" items={TABS} value={tab} onChange={onTab} maxWidth={380} />;
}
