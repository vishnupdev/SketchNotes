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

export const DiceIcon = (p: IconProps) => (
  <Svg strokeWidth={1.9} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);
