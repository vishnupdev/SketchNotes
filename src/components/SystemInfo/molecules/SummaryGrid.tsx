import type { SystemSummary } from "@/lib/SystemInfo/types";
import { StatTile } from "@/components/SystemInfo/atoms/StatTile";
import {
  CpuIcon,
  GlobeIcon,
  GpuIcon,
  MemoryIcon,
  MonitorIcon,
  WindowIcon,
} from "@/components/SketchNotes/atoms/icons";

/** Headline figures rendered as a responsive row of hero tiles. */
export function SummaryGrid({ summary }: { summary: SystemSummary }) {
  const tiles = [
    { icon: <WindowIcon size={18} />, label: "System", value: summary.os },
    { icon: <GlobeIcon size={18} />, label: "Browser", value: summary.browser },
    { icon: <CpuIcon size={18} />, label: "Processor", value: summary.cpu },
    { icon: <MemoryIcon size={18} />, label: "Memory", value: summary.memory },
    { icon: <GpuIcon size={18} />, label: "Graphics", value: summary.graphics },
    { icon: <MonitorIcon size={18} />, label: "Display", value: summary.display },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[860px]:grid-cols-3">
      {tiles.map((t) => (
        <StatTile key={t.label} icon={t.icon} label={t.label} value={t.value} />
      ))}
    </div>
  );
}
