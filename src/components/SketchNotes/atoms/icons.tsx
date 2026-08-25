import type { SVGProps } from "react";

/**
 * Shared icon set. Every glyph is drawn on a 24×24 grid with a single uniform
 * stroke weight and `currentColor`, so the whole app reads as one minimalist
 * family. Icons favour clear, literal metaphors over decorative detail.
 * Each export is a thin wrapper that forwards size/props.
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

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9.5 7V5.3A1.3 1.3 0 0 1 10.8 4h2.4a1.3 1.3 0 0 1 1.3 1.3V7" />
    <path d="M6.8 7l.8 12a1.3 1.3 0 0 0 1.3 1.2h6.2a1.3 1.3 0 0 0 1.3-1.2l.8-12" />
    <path d="M10 11v5M14 11v5" />
  </Svg>
);

export const TrashSmallIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9.5 7V5.3A1.3 1.3 0 0 1 10.8 4h2.4a1.3 1.3 0 0 1 1.3 1.3V7" />
    <path d="M6.8 7l.8 12a1.3 1.3 0 0 0 1.3 1.2h6.2a1.3 1.3 0 0 0 1.3-1.2l.8-12" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8.5 5.5 5 9l3.5 3.5M5 9h9a5 5 0 0 1 0 10h-4" /></Svg>
);

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M15.5 5.5 19 9l-3.5 3.5M19 9h-9a5 5 0 0 0 0 10h4" /></Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v10.5M8 10.5 12 14.5 16 10.5M5 19.5h14" /></Svg>
);

export const SelectIcon = (p: IconProps) => (
  <Svg strokeLinecap="butt" {...p}><path d="M5.5 3.5l6.6 15.6 2-6.6 6.6-2z" /></Svg>
);

export const PenIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 20l1-4L15.5 5.5a2.12 2.12 0 0 1 3 3L8 19l-4 1z" /><path d="M13.5 7.5l3 3" /></Svg>
);

export const EraserIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.8 15.2 12.2 7.8a2.3 2.3 0 0 1 3.2 0l1.8 1.8a2.3 2.3 0 0 1 0 3.2l-5.4 5.4H8.2l-3.4-3.2z" /><path d="M6 21h13" /></Svg>
);

export const LineIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5.5 18.5 18.5 5.5" /></Svg>
);

export const ArrowIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5.5 18.5 18 6M10.5 6H18v7.5" /></Svg>
);

export const ShapesIcon = (p: IconProps) => (
  <Svg strokeLinecap="butt" {...p}>
    <rect x="3.5" y="12.5" width="8" height="8" rx="1.5" />
    <circle cx="16.5" cy="16.5" r="4" />
    <path d="M12 3.5 15.5 10h-7z" />
  </Svg>
);

export const EmojiIcon = (p: IconProps) => (
  <Svg strokeLinecap="butt" {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
  </Svg>
);

export const TextIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5.5 6.5h13M12 6.5V19" /></Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const MinusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M5 12h14" /></Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);

export const AppsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </Svg>
);

export const DuplicateIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5H7a2 2 0 0 0-2 2v8" />
  </Svg>
);

export const ImportIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 15V4M8 8.5 12 4l4 4.5M5 19.5h14" /></Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20.2 13.6A8.2 8.2 0 1 1 10.4 3.8a6.8 6.8 0 0 0 9.8 9.8z" /></Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}><path d="M5 12.5 10 17.5 19 6.5" /></Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h9M17 8h3" />
    <path d="M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2.2" />
    <circle cx="9" cy="16" r="2.2" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M14.5 6 9 12l5.5 6" /></Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M9.5 6 15 12l-5.5 6" /></Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M6 9.5 12 15l6-5.5" /></Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
    <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
  </Svg>
);

export const FlagIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 21V4M6 4.5h11l-2 4 2 4H6" /></Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.8-3.8" /></Svg>
);

export const ListChecksIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5 5.5 8 8.5 5M4 12.5 5.5 14 8.5 11M4 18.5 5.5 20 8.5 17" />
    <path d="M12 6.5h8M12 12.5h8M12 18.5h8" />
  </Svg>
);

export const InboxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 13.5 6.5 5.5h11L20 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
    <path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);

export const VolumeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 9.5h3l4-3v11l-4-3h-3z" />
    <path d="M15 9a4 4 0 0 1 0 6M17.5 6.8a7 7 0 0 1 0 10.4" />
  </Svg>
);

export const DiceIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const TimerIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5V9M9.5 2.5h5M12 2.5V6M18.5 7l1.4-1.4" />
  </Svg>
);

export const StopwatchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5 15 10.5M9.5 2.5h5M12 2.5V6" />
  </Svg>
);

export const PomodoroIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 7c-3.7 0-6.5 2.7-6.5 6.4a6.5 6.4 0 0 0 13 0C18.5 9.7 15.7 7 12 7Z" />
    <path d="M9 5c1.4 1 4.6 1 6 0" />
    <path d="M12 7c-.6-1.2-1.9-1.9-3.2-1.7" />
  </Svg>
);

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}><path d="M7 5.5 18 12 7 18.5z" fill="currentColor" /></Svg>
);

export const PauseIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M8.5 5.5v13M15.5 5.5v13" /></Svg>
);

export const RotateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12a7 7 0 1 1 2.1 5" />
    <path d="M4.5 18.5 6.8 17l.6 2.4" />
  </Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6l1.5 2h-14z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Svg>
);

export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5 6.5 7h11L20 9.5M20 14.5 17.5 17h-11L4 14.5" />
    <path d="M17.5 4.5 20 7l-2.5 2.5M6.5 19.5 4 17l2.5-2.5" />
  </Svg>
);

export const SkipIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6.5 14 12 6 17.5z" fill="currentColor" />
    <path d="M17 6v12" />
  </Svg>
);

export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16 15.5 9.5" />
    <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const DownloadSpeedIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></Svg>
);

export const UploadSpeedIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4.5h14" /></Svg>
);

export const LatencyIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 12h4l2.5 6 5-13 2.5 7h4" /></Svg>
);

/* ---- System Info app ---- */

export const HardwareIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
  </Svg>
);

export const CpuIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <rect x="10" y="10" width="4" height="4" rx="0.6" />
    <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
  </Svg>
);

export const MemoryIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="8" rx="1.5" />
    <path d="M7 16v2.5M11 16v2.5M15 16v2.5" />
    <path d="M7 11.5v1.2M10.5 11.5v1.2M14 11.5v1.2M17.5 11.5v1.2" />
  </Svg>
);

export const GpuIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="8" width="19" height="10" rx="2" />
    <circle cx="8" cy="13" r="2.2" />
    <path d="M13 11.5h5.5M13 14.5h5.5M6 18v2.5M13 18v2.5" />
  </Svg>
);

export const MonitorIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="12" rx="2" />
    <path d="M8.5 20h7M12 16.5V20" />
  </Svg>
);

export const BatteryIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2" />
    <path d="M21 11v2" />
    <path d="M6.5 11v2M9.5 11v2" />
  </Svg>
);

export const WifiIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9a13 13 0 0 1 16 0M6.5 12.2a9 9 0 0 1 11 0M9 15.4a5 5 0 0 1 6 0" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
);

/** Wifi arcs struck through — "no connection". */
export const WifiOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9a13 13 0 0 1 16 0M6.5 12.2a9 9 0 0 1 11 0M9 15.4a5 5 0 0 1 6 0" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" stroke="none" />
    <path d="M3.5 20.5 20.5 3.5" />
  </Svg>
);

/** Cloud with a tick — "saved on this device for offline use". */
export const CloudCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18.5a4 4 0 0 1-.3-8A5.5 5.5 0 0 1 17.4 10a3.8 3.8 0 0 1 1.5 7.3" />
    <path d="M9 15.2 11.2 17.5 15.5 12.8" />
  </Svg>
);

export const DriveIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 13h18" />
    <circle cx="16.5" cy="16" r="0.7" fill="currentColor" stroke="none" />
  </Svg>
);

export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5S14.5 18.2 12 20.5C9.5 18.2 8.2 15.2 8.2 12S9.5 5.8 12 3.5Z" />
  </Svg>
);

export const WindowIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M3.5 9h17M6.5 7h.01M9 7h.01" />
  </Svg>
);

export const ChipIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
    <path d="M9 9h6v6H9z" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 21 8l-9 4.5L3 8z" />
    <path d="M3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5H7a2 2 0 0 0-2 2v8" />
  </Svg>
);

export const NewsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5h11.5v13H6a2 2 0 0 1-2-2z" />
    <path d="M15.5 8.5H18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
    <path d="M7 9h5.5M7 12h5.5M7 15h3.5" />
  </Svg>
);

export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-.5 4" />
    <path d="M20 5v6h-6" />
  </Svg>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 5h5v5" />
    <path d="M19 5l-8 8" />
    <path d="M18 13.5V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4.5" />
  </Svg>
);

/** Assistant glyph — a chat bubble with a spark, for the in-app AI guide. */
export const AssistantIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12.5a7 7 0 0 1-7 7H8.8L5 21.5v-4.2A7 7 0 0 1 9.5 5.6" />
    <path d="M16.5 2.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
    <path d="M9.5 13h6" />
  </Svg>
);

export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h6" />
    <path d="M5.2 5.4 20 12 5.2 18.6l1.7-6.6z" />
  </Svg>
);

export const KeyboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 9.5h.01M11 9.5h.01M15 9.5h.01M8.5 12.5h7" />
  </Svg>
);

export const TranslateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h7M7.5 5v1.5" />
    <path d="M9.5 7c-.6 3.2-2.8 6-5.5 7.5M5.5 8.5c.7 2 2.4 3.8 4.5 4.7" />
    <path d="M12.5 20l3.75-9h.5L20.5 20M13.9 16.5h5.2" />
  </Svg>
);

export const SwapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4 3.5 7.5 7 11" />
    <path d="M3.5 7.5H16a4 4 0 0 1 4 4" />
    <path d="M17 20l3.5-3.5L17 13" />
    <path d="M20.5 16.5H8a4 4 0 0 1-4-4" />
  </Svg>
);

/**
 * Morse — a dit, a dah and a dit, drawn as filled marks so the 1:3 length ratio
 * that defines the code is visible even at 16px.
 */
export const MorseIcon = ({ size = 20, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
    <circle cx="4" cy="12" r="2" />
    <rect x="8.5" y="10" width="11" height="4" rx="2" />
  </svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2.5 2.5 0 0 1 2 1v13a2.5 2.5 0 0 0-2-1H5.5A1.5 1.5 0 0 1 4 15.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2.5 2.5 0 0 0-2 1v13a2.5 2.5 0 0 1 2-1h4.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </Svg>
);

export const TargetIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const TapIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="10" r="3.5" />
    <path d="M5.5 16.5a8 8 0 0 1 13 0" />
    <path d="M3 20.5a12 12 0 0 1 18 0" />
  </Svg>
);

/**
 * App glyph for the Malayalam writer — the letter "അ" set in the icon grid.
 * Uses a filled text node (not the shared stroke paths) so the script reads
 * cleanly at small sizes; `currentColor` keeps it themeable like the rest.
 */
export const MalayalamIcon = ({ size = 20, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
    <text
      x="12"
      y="13"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="20"
      fontWeight="700"
      fill="currentColor"
    >
      അ
    </text>
  </svg>
);

export const EyedropperIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 6.5 17.5 9.5" />
    <path d="M16 3.6a2.2 2.2 0 0 1 3.1 0l1.3 1.3a2.2 2.2 0 0 1 0 3.1L18.6 9.8 14.2 5.4z" />
    <path d="M13.2 6.4 4.6 15a2 2 0 0 0-.55 1.05L3.5 19.2a1 1 0 0 0 1.15 1.15l3.15-.55A2 2 0 0 0 8.85 19.25L17.6 10.8z" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5h2.8l1.4-2.4a1.3 1.3 0 0 1 1.1-.6h5.4a1.3 1.3 0 0 1 1.1.6l1.4 2.4H20a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 4 8.5Z" />
    <circle cx="12" cy="13.5" r="3.3" />
  </Svg>
);

/** Switch between the front and rear camera. */
export const CameraFlipIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5h2.8l1.4-2.4a1.3 1.3 0 0 1 1.1-.6h5.4a1.3 1.3 0 0 1 1.1.6l1.4 2.4H20a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 4 8.5Z" />
    <path d="M9.6 13.6a2.6 2.6 0 0 1 4.4-1.9M14.4 13.6a2.6 2.6 0 0 1-4.4 1.9" />
    <path d="M14.2 10.6h1.5v1.5M9.8 16.6H8.3v-1.5" />
  </Svg>
);

export const PaletteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.9-.8 1.9-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h1.3a4.6 4.6 0 0 0 4.6-4.6c0-3.7-3.8-6.6-8.5-6.6Z" />
    <circle cx="7.6" cy="11.4" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="10.4" cy="7.4" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="15" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
  </Svg>
);

/** Split disc — the standard mark for a light/dark contrast reading. */
export const ContrastIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" />
  </Svg>
);

/* ---- Sound Meter app ---- */

export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.8" width="6" height="11" rx="3" />
    <path d="M5.5 11.2a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.7v3.5M8.8 21.2h6.4" />
  </Svg>
);

/** Microphone with the standard "off" slash. */
export const MicOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 5.6A3 3 0 0 0 9 5.8v4.4M9 12.3a3 3 0 0 0 5.6 1.5" />
    <path d="M5.5 11.2a6.5 6.5 0 0 0 9.6 5.7M18.5 11.2a6.4 6.4 0 0 1-.5 2.5" />
    <path d="M12 17.7v3.5M8.8 21.2h6.4" />
    <path d="M3.5 3.5 20.5 20.5" />
  </Svg>
);

/** Oscilloscope trace — the time-domain view. */
export const WaveformIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12h2.2c.9 0 1.3-.7 1.7-2.4S7.2 5 8.1 5s1.3 2.6 1.9 7 1 7 1.9 7 1.3-2.6 1.9-7 1-7 1.9-7 1.3 2.9 1.7 4.6.8 2.4 1.7 2.4h2.4" />
  </Svg>
);

/** FFT bars — the frequency-domain view. */
export const SpectrumIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20V14M8 20V6.5M12.5 20v-9M17 20V4M21 20v-7" />
  </Svg>
);

/** Tuning fork — pitch and note detection. */
export const TuningForkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v7.5a4 4 0 0 0 8 0V3" />
    <path d="M12 14.5V21" />
    <path d="M9.6 21h4.8" />
  </Svg>
);

/* ----------------------------- world clock ---------------------------- */

/** A globe with a clock face — the World Clock app mark. */
export const WorldClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.9 13.4A9 9 0 1 1 10.6 3.1" />
    <path d="M3.5 9h8.2M3.5 15h6.1" />
    <path d="M11.5 3.2A14 14 0 0 0 9.4 20.6" />
    <circle cx="17" cy="17" r="4.5" />
    <path d="M17 14.9V17l1.5 1.1" />
  </Svg>
);

/** Pin — add a city to the clock board. */
export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21v-6.5" />
    <path d="M8.2 3h7.6l-1 4.6 2.4 3.3a1 1 0 0 1-.8 1.6H7.6a1 1 0 0 1-.8-1.6l2.4-3.3z" />
  </Svg>
);

/** Pin with a strike — remove a city from the board. */
export const PinOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21v-6.5" />
    <path d="M8.2 3h7.6l-1 4.6 2.4 3.3a1 1 0 0 1-.8 1.6H7.6a1 1 0 0 1-.8-1.6l2.4-3.3z" />
    <path d="M4 4l16 16" />
  </Svg>
);

/** Sun rising over a horizon — the dawn/dusk clock states. */
export const SunriseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18h18" />
    <path d="M6.5 14.5a5.5 5.5 0 0 1 11 0" />
    <path d="M12 3v3.5M5.2 7.2l1.6 1.6M18.8 7.2l-1.6 1.6" />
  </Svg>
);

/** A group of people — population. */
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="3.2" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.2a6 6 0 0 1 3 5.3" />
  </Svg>
);

/** A coin — currency. */
export const CoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.4 9.2a3 3 0 1 0 0 5.6" />
    <path d="M12 6.5v11" />
  </Svg>
);

/** A handset — international dialling code. */
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.2 3.5 9.4 8l-1.9 1.6a12 12 0 0 0 6.9 6.9L16 14.6l4.5 2.2v3a1.7 1.7 0 0 1-1.9 1.7C10.5 20.7 3.3 13.5 2.5 5.4A1.7 1.7 0 0 1 4.2 3.5z" />
  </Svg>
);

/** A car — which side of the road a country drives on. */
export const CarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 16.5v2a1 1 0 0 1-1 1H2.5M20 16.5v2a1 1 0 0 0 1 1h.5" />
    <path d="M3 16.5v-3.2l1.9-4.6A2 2 0 0 1 6.7 7.5h10.6a2 2 0 0 1 1.8 1.2l1.9 4.6v3.2z" />
    <path d="M3.5 13.3h17" />
    <circle cx="7.5" cy="16.4" r="1.1" />
    <circle cx="16.5" cy="16.4" r="1.1" />
  </Svg>
);

/** A ruler — land area. */
export const RulerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.8 2.9 21.1 9.2a1.5 1.5 0 0 1 0 2.1L11.3 21.1a1.5 1.5 0 0 1-2.1 0L2.9 14.8a1.5 1.5 0 0 1 0-2.1L12.7 2.9a1.5 1.5 0 0 1 2.1 0Z" />
    <path d="M7.5 12.2 9.3 14M10.4 9.3l1.8 1.8M13.3 6.4l1.8 1.8" />
  </Svg>
);

/** A compass — region and orientation. */
export const CompassIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15.4 8.6 13.7 13.7 8.6 15.4 10.3 10.3z" />
  </Svg>
);

/** Two speech bubbles — spoken languages. */
export const LanguagesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.5A2 2 0 0 1 5 4.5h7a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H8l-3 2.5V11.5a2 2 0 0 1-2-2z" />
    <path d="M17 9.5h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2v2.8L16 16.5h-3" />
  </Svg>
);

/** A classical building — the capital city. */
export const CapitolIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 9.5 12 4.5l8.5 5" />
    <path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8" />
    <path d="M3 20.5h18" />
  </Svg>
);

/** A sparkle — what a place is known for. */
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 13.9 9 19.7 10.9 13.9 12.8 12 18.6 10.1 12.8 4.3 10.9 10.1 9z" />
    <path d="M18.5 3v3M20 4.5h-3" />
  </Svg>
);

/** A slider handle on a track — the time scrubber. */
export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8h17M3.5 16h17" />
    <circle cx="9" cy="8" r="2.3" />
    <circle cx="15.5" cy="16" r="2.3" />
  </Svg>
);

/** A page of cards with a spark on it — a board you compose by prompting. */
export const BoardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="3.5" width="7.6" height="7" rx="1.6" />
    <rect x="13.2" y="3.5" width="7.6" height="11" rx="1.6" />
    <rect x="3.2" y="13" width="7.6" height="7.5" rx="1.6" />
    <path d="M15 18.4h5.8M17.9 15.6v5.6" />
  </Svg>
);

/** Two links of a chain — a saved web address. */
export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 13.7a3.6 3.6 0 0 0 5.1 0l3-3a3.6 3.6 0 1 0-5.1-5.1l-1.2 1.2" />
    <path d="M13.7 10.3a3.6 3.6 0 0 0-5.1 0l-3 3a3.6 3.6 0 1 0 5.1 5.1l1.2-1.2" />
  </Svg>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M6 14.5 12 9l6 5.5" /></Svg>
);

/** Three dots — an overflow menu. */
export const MoreIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <circle cx="12" cy="5.4" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="18.6" r="1.7" />
  </Svg>
);

/** Arrows pushing outward against two walls — widen this card. */
export const WidthIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 5.5v13M20.5 5.5v13" />
    <path d="M7 12h10M9.4 9.4 7 12l2.4 2.6M14.6 9.4 17 12l-2.4 2.6" />
  </Svg>
);

/** A question mark in a circle — show the grammar. */
export const HelpIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.3" />
    <path d="M12 17.1h.01" />
  </Svg>
);

/* ---- Resource Monitor app ---- */

/** A shield — a resource the browser gates behind permission. */
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.9 4.8 5.7v5.6c0 4.3 2.9 8.3 7.2 9.8 4.3-1.5 7.2-5.5 7.2-9.8V5.7z" />
  </Svg>
);

/** A shield with a tick — this resource is allowed. */
export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.9 4.8 5.7v5.6c0 4.3 2.9 8.3 7.2 9.8 4.3-1.5 7.2-5.5 7.2-9.8V5.7z" />
    <path d="M8.9 11.9 11.2 14.2 15.3 9.8" />
  </Svg>
);

/** An open eye — what can be watched, and what is being watched. */
export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

/** A heartbeat trace — live, in-use-right-now. */
export const PulseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 12.5h4l2-6 3.4 12 2.6-8 1.8 4h5.2" /></Svg>
);

/** A filled square — release the resource being held. */
export const StopIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </Svg>
);

/** A display with an arrow leaving it — screen capture / recording. */
export const ScreenShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <path d="M9 20.5h6" />
    <path d="M12 13.5v-5M9.6 10.9 12 8.4l2.4 2.5" />
  </Svg>
);

/** A map pin — where this device is. */
export const LocationIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.5s6.5-5.9 6.5-10.4a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21.5 12 21.5Z" />
    <circle cx="12" cy="10.8" r="2.5" />
  </Svg>
);

/** A clipboard — read or write what you last copied. */
export const ClipboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4.5H7A1.5 1.5 0 0 0 5.5 6v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2" />
    <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" />
  </Svg>
);

/** A closed padlock — hold something open, or keep it shut. */
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d="M8.4 10.5V7.8a3.6 3.6 0 0 1 7.2 0v2.7" />
  </Svg>
);

/** Letterforms — the list of fonts installed on this machine. */
export const FontIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 18 7.8 7h.6L12.7 18M5.3 14.4h6" />
    <path d="M14.5 12.6a2.9 2.9 0 0 1 5.2 1.8V18M19.7 15.4h-2.4a2 2 0 0 0 0 4c1.4 0 2.4-1.1 2.4-2.6" />
  </Svg>
);

/** A tilted device with motion arcs — accelerometer and gyroscope. */
export const SensorIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7.5" y="3.5" width="9" height="14" rx="2.2" transform="rotate(18 12 10.5)" />
    <path d="M3.6 18.4a5 5 0 0 0 2.2 2.1M20.4 18.4a5 5 0 0 1-2.2 2.1" />
  </Svg>
);

/** Piano keys — attached instruments and controllers. */
export const MidiIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.8" y="7" width="18.4" height="10" rx="1.8" />
    <path d="M8.9 7v6.2M15.1 7v6.2M12 7v6.2" />
  </Svg>
);

/** The Bluetooth rune. */
export const BluetoothIcon = (p: IconProps) => (
  <Svg {...p}><path d="M7 7.5 17 16.5 12 21V3l5 4.5L7 16.5" /></Svg>
);

/** The USB trident. */
export const UsbIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21V5" />
    <path d="M12 3.2 10.2 6h3.6z" fill="currentColor" />
    <path d="M12 15.5 16.5 11V8.2M12 12 7.5 8.2v-2" />
    <circle cx="16.5" cy="7" r="1.5" />
    <rect x="6" y="4.2" width="3" height="2.6" rx="0.6" />
  </Svg>
);

/** A biscuit with crumbs — stored and cross-site cookies. */
export const CookieIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.4 11.2a8.5 8.5 0 1 1-7.6-7.6 3.4 3.4 0 0 0 3.3 3.4 1 1 0 0 1 1 1 3.4 3.4 0 0 0 3.3 3.2Z" />
    <path d="M8.6 10.4h.01M11.8 14.6h.01M15.4 12.8h.01M7.9 15.6h.01" />
  </Svg>
);

/** Stacked platters — a database on this device. */
export const DatabaseIcon = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6.2" rx="7.5" ry="2.9" />
    <path d="M4.5 6.2v11.6c0 1.6 3.4 2.9 7.5 2.9s7.5-1.3 7.5-2.9V6.2" />
    <path d="M4.5 12c0 1.6 3.4 2.9 7.5 2.9s7.5-1.3 7.5-2.9" />
  </Svg>
);

/** Three finder squares and a data cell — a QR code. */
export const QrIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="6" height="6" rx="1.2" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1.2" />
    <rect x="3.5" y="14.5" width="6" height="6" rx="1.2" />
    <path d="M14.5 14.5h2.5v2.5h-2.5zM20.5 14.5h-1M14.5 20.5h2.5M20 18.5v2M20.5 20.5h-1" />
  </Svg>
);

/** A viewfinder's corner brackets — aim at a code. */
export const ScanIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5V5.6a2 2 0 0 1 2-2h2.9M15.6 3.6h2.9a2 2 0 0 1 2 2v2.9M20.5 15.6v2.9a2 2 0 0 1-2 2h-2.9M8.4 20.5H5.5a2 2 0 0 1-2-2v-2.9" />
    <path d="M3.5 12h17" />
  </Svg>
);

/** Two devices with an arrow between them — handing something across. */
export const HandoffIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.6" y="5" width="7.4" height="10.5" rx="1.6" />
    <rect x="14" y="8.5" width="7.4" height="10.5" rx="1.6" />
    <path d="M10.6 10.6h4.2M13.2 8.9l1.9 1.7-1.9 1.7" />
  </Svg>
);

/** A file with a downward arrow crossing it — dropping a file across. */
export const DropIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.4 3.5H7.5A1.6 1.6 0 0 0 6 5.1v13.8a1.6 1.6 0 0 0 1.5 1.6h9a1.6 1.6 0 0 0 1.5-1.6V8.2z" />
    <path d="M13.2 3.6v4.6h4.7" />
    <path d="M12 11.4v5.2M9.9 14.4l2.1 2.2 2.1-2.2" />
  </Svg>
);

/**
 * Two identical device outlines, the second drawn from the first by a curved
 * arrow — a copy of a whole machine, not a file being sent.
 */
export const CloneIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.6" y="3.2" width="9" height="12.4" rx="1.7" />
    <rect x="12.4" y="8.4" width="9" height="12.4" rx="1.7" />
    <path d="M6 18.2a5.4 5.4 0 0 0 5.2 2.4" />
    <path d="M5.2 15.9 6.1 18.4l2.5-.6" />
  </Svg>
);

/** A hash sign — checksums and digests. */
export const HashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.4 3.6 7.9 20.4M16.1 3.6l-1.5 16.8M4.2 8.9h15.2M3.6 15.1h15.2" />
  </Svg>
);

/** A capital A with a caret — text tools. */
export const TextKitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 17.5 9.5 5.5h1.2l5 12" />
    <path d="M6.6 13.4h7.4" />
    <path d="M17.5 8.5v11M15.4 17.2l2.1 2.3 2.1-2.3" />
  </Svg>
);
