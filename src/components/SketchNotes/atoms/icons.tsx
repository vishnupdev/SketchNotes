import type { SVGProps } from "react";

/**
 * Shared icon set, ported 1:1 from the original hand-tuned SVG paths so the
 * visual language is identical. Each icon is a thin wrapper that forwards
 * size/props; stroke inherits `currentColor`.
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

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></Svg>
);

export const TrashSmallIcon = (p: IconProps) => (
  <Svg strokeWidth={1.9} {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8.5 5.5 5 9l3.5 3.5M5 9h9a5 5 0 0 1 0 10h-4" /></Svg>
);

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M15.5 5.5 19 9l-3.5 3.5M19 9h-9a5 5 0 0 0 0 10h4" /></Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M12 4v11M7.5 11 12 15.5 16.5 11M4.5 19.5h15" /></Svg>
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
  <Svg strokeLinejoin="round" {...p}><path d="M5.5 18.5 18.5 5.5" /></Svg>
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
  <Svg strokeLinejoin="round" {...p}><path d="M5.5 6.5h13M12 6.5V19" /></Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const MinusIcon = (p: IconProps) => (
  <Svg strokeWidth={2} strokeLinejoin="round" {...p}><path d="M5 12h14" /></Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg strokeWidth={2} strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);

export const AppsIcon = (p: IconProps) => (
  <Svg strokeWidth={1.9} {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </Svg>
);

export const DuplicateIcon = (p: IconProps) => (
  <Svg strokeWidth={1.9} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5H7a2 2 0 0 0-2 2v8" />
  </Svg>
);

export const ImportIcon = (p: IconProps) => (
  <Svg strokeWidth={1.9} {...p}><path d="M12 19V8M7.5 12.5 12 8l4.5 4.5M4.5 21h15" /></Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20.2 13.6A8.2 8.2 0 1 1 10.4 3.8a6.8 6.8 0 0 0 9.8 9.8z" /></Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}><path d="M5 12.5 10 17.5 19 6.5" /></Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 12.9a7.7 7.7 0 0 0 0-1.8l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.5-.9l-.3-2.5h-4l-.3 2.5a7.6 7.6 0 0 0-1.5.9l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 1.8l-2 1.6 2 3.4 2.4-1c.5.4 1 .6 1.5.9l.3 2.5h4l.3-2.5c.5-.3 1-.5 1.5-.9l2.4 1 2-3.4-2-1.6Z" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M14.5 6 9 12l5.5 6" /></Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}><path d="M9.5 6 15 12l-5.5 6" /></Svg>
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
  <Svg strokeWidth={1.9} {...p}>
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
    <path d="M12 6.5c-4 0-7 2.8-7 7a7 7 0 0 0 14 0c0-4.2-3-7-7-7Z" />
    <path d="M9 4.5c1.2 1 4.8 1 6 0" />
    <path d="M12 6.5c-1-1.4-3-2-4.2-1.6" />
  </Svg>
);

export const PlayIcon = (p: IconProps) => (
  <Svg strokeLinejoin="round" {...p}>
    <path d="M7 5.5 18 12 7 18.5z" fill="currentColor" />
  </Svg>
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
  <Svg strokeLinejoin="round" {...p}>
    <path d="M6 6.5 14 12 6 17.5z" fill="currentColor" />
    <path d="M17 6v12" />
  </Svg>
);
