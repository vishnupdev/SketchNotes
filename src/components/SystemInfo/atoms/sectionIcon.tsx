import type { SectionIcon } from "@/lib/SystemInfo/types";
import {
  BatteryIcon,
  CpuIcon,
  DriveIcon,
  GpuIcon,
  GlobeIcon,
  HardwareIcon,
  MemoryIcon,
  MonitorIcon,
  VolumeIcon,
  WifiIcon,
  WindowIcon,
} from "@/components/SketchNotes/atoms/icons";

type IconFn = (p: { size?: number; className?: string }) => React.ReactElement;

const MAP: Record<SectionIcon, IconFn> = {
  hardware: HardwareIcon,
  os: WindowIcon,
  browser: GlobeIcon,
  cpu: CpuIcon,
  memory: MemoryIcon,
  gpu: GpuIcon,
  display: MonitorIcon,
  battery: BatteryIcon,
  network: WifiIcon,
  storage: DriveIcon,
  locale: GlobeIcon,
  media: VolumeIcon,
};

/** Resolve a section's icon key to its shared icon component. */
export function SectionGlyph({ icon, size = 18 }: { icon: SectionIcon; size?: number }) {
  const Icon = MAP[icon];
  return <Icon size={size} />;
}
