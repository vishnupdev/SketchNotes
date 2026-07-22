import type { SVGProps } from "react";

/**
 * Icons used only by the live dashboard (IP / health / performance). Kept local
 * to the System Info app so it stays decoupled from the shared icon set.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 16.5a8 8 0 1 1 15 0" />
    <path d="M12 13.5 15.5 9.5" />
    <circle cx="12" cy="13.8" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const PulseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 12.5h4l2.5-6 4 12 2.5-6H21" /></Svg>
);

export const WifiIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5a13 13 0 0 1 16 0M6.7 11.7a9 9 0 0 1 10.6 0M9.4 15a5 5 0 0 1 5.2 0" />
    <circle cx="12" cy="18.3" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
  </Svg>
);

export const BatteryIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="15" height="8" rx="2" />
    <path d="M20.5 11v2" />
  </Svg>
);

export const DriveIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
    <path d="M3.5 13h17" />
    <circle cx="16.5" cy="16" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const ChipIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.6" />
    <path d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M7 9.5H4M7 14.5H4M20 9.5h-3M20 14.5h-3" />
  </Svg>
);

export const MonitorIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="12" rx="2" />
    <path d="M8.5 20h7M12 16.5V20" />
  </Svg>
);

export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-.6 4" />
    <path d="M20 4.5V11h-6.5" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5H7a2 2 0 0 0-2 2v8" />
  </Svg>
);

export const CheckMiniIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}><path d="M5 12.5 10 17.5 19 6.5" /></Svg>
);
