import type { SVGProps } from "react";

/**
 * Icons for the Nearby Devices panel — one per transport, plus the radar mark
 * for the section itself. Local to the System Info app and drawn to the same
 * 24×24 grid and 1.75 stroke weight as {@link file://./liveIcons.tsx}.
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
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Concentric sweep — the Nearby Devices section mark. */
export const RadarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 12 18.2 5.8" />
    <path d="M15.9 8.1a5.5 5.5 0 1 1-7.8 0" />
    <path d="M19.4 4.6a10.5 10.5 0 1 1-14.8 0" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const BluetoothIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v18l5-5-10-8M7 16l10-8-5-5" />
  </Svg>
);

export const UsbIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5V5.5" />
    <path d="M9.7 7 12 3.6 14.3 7z" fill="currentColor" />
    <path d="M12 16 8.2 12.6V10" />
    <rect x="6.7" y="7.4" width="3" height="2.6" rx=".4" />
    <path d="M12 13 15.8 9.8" />
    <circle cx="16.7" cy="8.6" r="1.4" />
  </Svg>
);

/** HID — drawn as a keyboard, the commonest device on that transport. */
export const KeyboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2.2" />
    <path d="M6.2 10.2h.01M9.4 10.2h.01M12.6 10.2h.01M15.8 10.2h.01M8 14h8" />
  </Svg>
);

/** Serial — a port plug. */
export const PortIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5v5.5M15 3.5v5.5" />
    <rect x="6" y="9" width="12" height="6" rx="1.8" />
    <path d="M12 15v5.5" />
  </Svg>
);

export const GamepadIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="7.8" width="19" height="9.8" rx="4.6" />
    <path d="M7.6 11.2v3.2M6 12.8h3.2" />
    <circle cx="15.9" cy="11.9" r=".95" fill="currentColor" stroke="none" />
    <circle cx="18" cy="14.1" r=".95" fill="currentColor" stroke="none" />
  </Svg>
);

export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.8" width="6" height="10" rx="3" />
    <path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8v3.4" />
  </Svg>
);

/** Audio output — a speaker cone with sound arcs. */
export const SpeakerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.5 4.2 6.8 8.5H3.6v7h3.2l4.7 4.3z" />
    <path d="M15.2 9.4a3.7 3.7 0 0 1 0 5.2M18 6.6a7.6 7.6 0 0 1 0 10.8" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="7" width="12.5" height="10" rx="2.2" />
    <path d="M14.5 12.3 21 8.4v7.2z" />
  </Svg>
);

export const CastIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7.5V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7.5" />
    <path d="M3 12.2a7.3 7.3 0 0 1 7.3 7.3M3 15.8a3.7 3.7 0 0 1 3.7 3.7" />
    <circle cx="3.3" cy="19.6" r=".75" fill="currentColor" stroke="none" />
  </Svg>
);

/** Bars used for advertised signal strength. */
export const SignalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 18v-3M9.3 18v-6M14.7 18v-9M20 18V6" />
  </Svg>
);
