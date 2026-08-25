import type { SVGProps } from "react";

/**
 * Glyphs only the Streams app uses, drawn to match the shared set in
 * `SketchNotes/atoms/icons` - the same 24x24 grid, the same 1.75 stroke, the
 * same `currentColor` - so the app reads as part of one family.
 *
 * Kept here rather than added to the shared file because nothing else in the
 * workspace needs a broadcast mark or a bookmark (rule #5): an app's own
 * vocabulary stays in the app's own folder.
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

/** Two beamed notes - the Music tab. */
export const MusicIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18V6.2l10-2v11.6" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="15.8" r="2.5" />
  </Svg>
);

/** A signal radiating from a point - broadcasting now. */
export const LiveIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 15.8a5.4 5.4 0 0 0 0-7.6" />
    <path d="M5.4 5.4a9.4 9.4 0 0 0 0 13.2M18.6 18.6a9.4 9.4 0 0 0 0-13.2" />
  </Svg>
);

/** An outlined bookmark - not saved yet. */
export const BookmarkIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6.5 4.5h11a1 1 0 0 1 1 1v14L12 15.6 5.5 19.5v-14a1 1 0 0 1 1-1z" /></Svg>
);

/** The same bookmark, filled - saved. */
export const BookmarkFilledIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4.5h11a1 1 0 0 1 1 1v14L12 15.6 5.5 19.5v-14a1 1 0 0 1 1-1z" fill="currentColor" />
  </Svg>
);

/** Arrows pushing apart - open the player to its full frame. */
export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9.5 4.5h-5v5M14.5 19.5h5v-5M4.5 4.5l5.5 5.5M19.5 19.5L14 14" /></Svg>
);

/** Arrows pulling together - shrink the player back to its bar. */
export const CollapseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 9.5h5v-5M19.5 14.5h-5v5M10 10 4.5 4.5M14 14l5.5 5.5" /></Svg>
);

/** A stacked, ticked list - the saved-and-recent library. */
export const LibraryIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6.5h8M4.5 11h8M4.5 15.5h5" />
    <path d="M14.5 15.5l2 2 3.5-4" />
    <path d="M15 6.5h5M15 11h5" />
  </Svg>
);

/**
 * The app's own mark: a screen with a play triangle in it and a pair of
 * antennae. Mirrors `StreamsGlyph` in the app catalog, so the tile you press and
 * the header you land on carry the same drawing.
 */
export const StreamsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="17" height="14" rx="2.5" />
    <path d="M8.6 2.8 11.2 6M15.4 2.8 12.8 6" />
    <path d="M10.4 10 15.4 13 10.4 16z" fill="currentColor" />
  </Svg>
);
