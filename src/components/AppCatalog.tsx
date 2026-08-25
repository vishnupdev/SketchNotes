import type { ReactNode } from "react";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * The workspace's app directory: one entry per app, holding its mark, its copy
 * and the brand hue every shell-level surface draws it with.
 *
 * It lives outside any single app's folder because it is shell furniture — the
 * launcher grid (`AppLauncher`) and the opening animation (`AppIntro`) both
 * render from it, so an app is described once and appears correctly in both.
 */
export interface AppEntry {
  id: AppId;
  name: string;
  /** Launcher-card blurb: a few words, sized to fit one line on a card. Each
   *  app's own header carries the long-form tagline (see AppBrand). */
  tagline: string;
  icon: ReactNode;
  /** CSS custom-property name holding this app's brand hue (see globals.css). */
  hue: string;
}

const SketchGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M4.5 19.5 8 18.5 19 7.5a2 2 0 0 0-2.9-2.9L5 15.6 4 19a.4.4 0 0 0 .5.5Z" />
    <path d="M14.5 6.6 17.4 9.5" />
  </svg>
);

const PdfGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M7 3.5h6.2L18 8.3V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z" />
    <path d="M13 3.6V8.5H17.9" />
    <path d="M8.6 12.5h6.8M8.6 15.4h6.8M8.6 18.2h4.2" />
  </svg>
);

const ImageGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M4 17l4.5-4.5a2 2 0 0 1 2.8 0L17 18" />
  </svg>
);

const BoardGlyph = (
  // Cards on a page with a spark at the corner: sections you conjure by typing.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="3.2" y="3.5" width="7.6" height="7" rx="1.6" />
    <rect x="13.2" y="3.5" width="7.6" height="11" rx="1.6" />
    <rect x="3.2" y="13" width="7.6" height="7.5" rx="1.6" />
    <path d="M15 18.4h5.8M17.9 15.6v5.6" />
  </svg>
);

const TodoGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="4" y="4.5" width="16" height="15.5" rx="2.4" />
    <path d="M8 3v3M16 3v3" />
    <path d="M7.5 12l1.6 1.6 3-3.4" />
    <path d="M13.5 12.5h4M7.5 16.4l1.6 1.6 3-3.4M13.5 16h4" />
  </svg>
);

const ReminderGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z" />
    <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" />
  </svg>
);

const TimerGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5V9M9.5 2.5h5M12 2.5V6M18.5 7l1.4-1.4" />
  </svg>
);

const SystemGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 2.8v1.7M15 2.8v1.7M9 19.5v1.7M15 19.5v1.7M2.8 9h1.7M2.8 15h1.7M19.5 9h1.7M19.5 15h1.7" />
  </svg>
);

const NearbyGlyph = (
  // A radar sweep with a contact painted on it: the scan, and what it finds.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M12 12 18.2 5.8" />
    <path d="M15.9 8.1a5.5 5.5 0 1 1-7.8 0" />
    <path d="M19.4 4.6a10.5 10.5 0 1 1-14.8 0" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="16.9" cy="16.9" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const SpeedGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16 15.5 9.5" />
    <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

const NewsGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M4 5.5h11.5v13H6a2 2 0 0 1-2-2z" />
    <path d="M15.5 8.5H18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
    <path d="M7 9h5.5M7 12h5.5M7 15h3.5" />
  </svg>
);

const StreamsGlyph = (
  // A screen with a play triangle and a pair of antennae: something being
  // broadcast, and the press that starts it.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="3.5" y="6" width="17" height="14" rx="2.5" />
    <path d="M8.6 2.8 11.2 6M15.4 2.8 12.8 6" />
    <path d="M10.4 10 15.4 13 10.4 16z" fill="currentColor" />
  </svg>
);

const WorldClockGlyph = (
  // A globe with a clock set into it: the two halves of the app in one mark.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M20.9 13.4A9 9 0 1 1 10.6 3.1" />
    <path d="M3.5 9h8.2M3.5 15h6.1" />
    <path d="M11.5 3.2A14 14 0 0 0 9.4 20.6" />
    <circle cx="17" cy="17" r="4.5" />
    <path d="M17 14.9V17l1.5 1.1" />
  </svg>
);

const MalayalamGlyph = (
  // Geometrically centered at (12,12) so the glyph sits dead-centre regardless
  // of the font's line metrics; overflow-visible keeps its tall parts uncropped.
  <svg viewBox="0 0 24 24" className="size-6 overflow-visible" aria-hidden>
    <text
      x="12"
      y="12"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="17"
      fontWeight="700"
      fill="currentColor"
    >
      അ
    </text>
  </svg>
);

const TranslateGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M4 5h7M7.5 5v1.5" />
    <path d="M9.5 7c-.6 3.2-2.8 6-5.5 7.5M5.5 8.5c.7 2 2.4 3.8 4.5 4.7" />
    <path d="M12.5 20l3.75-9h.5L20.5 20M13.9 16.5h5.2" />
  </svg>
);

const AssistantGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M20 12.5a7 7 0 0 1-7 7H8.8L5 21.5v-4.2A7 7 0 0 1 9.5 5.6" />
    <path d="M16.5 2.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
    <path d="M9.5 13h6" />
  </svg>
);

const MorseGlyph = (
  // Filled marks rather than strokes, so the 1:3 dit-to-dah ratio that defines
  // the code stays readable at tile size.
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden>
    <circle cx="4.5" cy="6.5" r="1.9" />
    <rect x="9" y="4.6" width="10.5" height="3.8" rx="1.9" />
    <rect x="2.6" y="10.1" width="10.5" height="3.8" rx="1.9" />
    <circle cx="17.5" cy="12" r="1.9" />
    <circle cx="4.5" cy="17.5" r="1.9" />
    <circle cx="10" cy="17.5" r="1.9" />
    <rect x="14" y="15.6" width="7.4" height="3.8" rx="1.9" />
  </svg>
);

const SoundGlyph = (
  // A tuning fork over a level trace: the two things the app measures, pitch
  // and loudness, in one mark.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M3 12v3M6.5 9.5v8M10 6v12M13.5 9v6M17 4.5v15M20.5 10.5v4" />
  </svg>
);

const ColorGlyph = (
  // An eyedropper over a colour drop: the action (sample) and the result
  // (a colour) in one mark.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M16 3.6a2.2 2.2 0 0 1 3.1 0l1.3 1.3a2.2 2.2 0 0 1 0 3.1L18.6 9.8 14.2 5.4z" />
    <path d="M13.2 6.4 4.6 15a2 2 0 0 0-.55 1.05L3.5 19.2a1 1 0 0 0 1.15 1.15l3.15-.55A2 2 0 0 0 8.85 19.25L17.6 10.8z" />
  </svg>
);

const ResourceGlyph = (
  // A shield with an eye set into it: what the browser gates, and what is
  // watching through it.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M12 2.6 4.4 5.6v5.8c0 4.5 3.1 8.7 7.6 10.2 4.5-1.5 7.6-5.7 7.6-10.2V5.6z" />
    <path d="M7.6 11.6s2-3 4.4-3 4.4 3 4.4 3-2 3-4.4 3-4.4-3-4.4-3Z" />
    <circle cx="12" cy="11.6" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const QrGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3.5" y="3.5" width="6" height="6" rx="1.2" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1.2" />
    <rect x="3.5" y="14.5" width="6" height="6" rx="1.2" />
    <path d="M14.5 14.5h2.5v2.5h-2.5zM20.5 14.5h-1M14.5 20.5h2.5M20 18.5v2M20.5 20.5h-1" />
  </svg>
);

const HandoffGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2.6" y="5" width="7.4" height="10.5" rx="1.6" />
    <rect x="14" y="8.5" width="7.4" height="10.5" rx="1.6" />
    <path d="M10.6 10.6h4.2M13.2 8.9l1.9 1.7-1.9 1.7" />
  </svg>
);

const CloneGlyph = (
  // Two identical devices, the second drawn out of the first by a curved arrow:
  // a whole machine being copied, not a file being sent.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2.6" y="3.2" width="9" height="12.4" rx="1.7" />
    <rect x="12.4" y="8.4" width="9" height="12.4" rx="1.7" />
    <path d="M6 18.2a5.4 5.4 0 0 0 5.2 2.4" />
    <path d="M5.2 15.9 6.1 18.4l2.5-.6" />
  </svg>
);

const TextKitGlyph = (
  // A letter and the lines it sits among: the app is letters (case, encoding)
  // and lines (sort, dedupe, diff) in one place.
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 18.5 8 5.5l4.5 13" />
    <path d="M5.6 14.2h4.8" />
    <path d="M16 8.5h4.5M16 12.5h4.5M16 16.5h2.8" />
  </svg>
);

const DropGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13.4 3.5H7.5A1.6 1.6 0 0 0 6 5.1v13.8a1.6 1.6 0 0 0 1.5 1.6h9a1.6 1.6 0 0 0 1.5-1.6V8.2z" />
    <path d="M13.2 3.6v4.6h4.7" />
    <path d="M12 11.4v5.2M9.9 14.4l2.1 2.2 2.1-2.2" />
  </svg>
);

export const APPS: AppEntry[] = [
  {
    id: "sketchnotes",
    name: "Sketchnotes",
    tagline: "Notes on an infinite canvas",
    icon: SketchGlyph,
    hue: "--app-sketchnotes",
  },
  {
    id: "assistant",
    name: "Assistant",
    tagline: "A private guide to every app",
    icon: AssistantGlyph,
    hue: "--app-assistant",
  },
  {
    id: "pdf",
    name: "PDF Editor",
    tagline: "Edit, merge, split & sign",
    icon: PdfGlyph,
    hue: "--app-pdf",
  },
  {
    id: "image",
    name: "Image Studio",
    tagline: "Crop, resize & compress",
    icon: ImageGlyph,
    hue: "--app-image",
  },
  {
    id: "board",
    name: "Board",
    tagline: "Build a page by prompting",
    icon: BoardGlyph,
    hue: "--app-board",
  },
  {
    id: "todos",
    name: "Todos",
    tagline: "Plan tasks by day or week",
    icon: TodoGlyph,
    hue: "--app-todos",
  },
  {
    id: "reminders",
    name: "Reminders",
    tagline: "Timed alerts with a sound",
    icon: ReminderGlyph,
    hue: "--app-reminders",
  },
  {
    id: "timer",
    name: "Timer",
    tagline: "Countdown & stopwatch",
    icon: TimerGlyph,
    hue: "--app-timer",
  },
  {
    id: "system",
    name: "System Info",
    tagline: "Inspect device & browser",
    icon: SystemGlyph,
    hue: "--app-system",
  },
  {
    id: "resources",
    name: "Resource Monitor",
    tagline: "See what uses camera, mic & data",
    icon: ResourceGlyph,
    hue: "--app-resources",
  },
  {
    id: "nearby",
    name: "Nearby Devices",
    tagline: "Scan devices & read features",
    icon: NearbyGlyph,
    hue: "--app-nearby",
  },
  {
    id: "speed",
    name: "Network Speed",
    tagline: "Speed, ping & jitter",
    icon: SpeedGlyph,
    hue: "--app-speed",
  },
  {
    id: "news",
    name: "News",
    tagline: "Headlines from every beat",
    icon: NewsGlyph,
    hue: "--app-news",
  },
  {
    id: "streams",
    name: "Streams",
    tagline: "Music & live from YouTube",
    icon: StreamsGlyph,
    hue: "--app-streams",
  },
  {
    id: "world",
    name: "World Clock",
    tagline: "Live times worldwide",
    icon: WorldClockGlyph,
    hue: "--app-world",
  },
  {
    id: "malayalam",
    name: "Malayalam Writer",
    tagline: "Type or handwrite Malayalam",
    icon: MalayalamGlyph,
    hue: "--app-malayalam",
  },
  {
    id: "translate",
    name: "Translate",
    tagline: "Translate any text",
    icon: TranslateGlyph,
    hue: "--app-translate",
  },
  {
    id: "text",
    name: "Text Kit",
    tagline: "Convert, compare & check text",
    icon: TextKitGlyph,
    hue: "--app-text",
  },
  {
    id: "morse",
    name: "Morse Code",
    tagline: "Learn, practise & send Morse",
    icon: MorseGlyph,
    hue: "--app-morse",
  },
  {
    id: "sound",
    name: "Sound Meter",
    tagline: "Pitch, note & loudness",
    icon: SoundGlyph,
    hue: "--app-sound",
  },
  {
    id: "color",
    name: "Color Lens",
    tagline: "Read colours from a photo",
    icon: ColorGlyph,
    hue: "--app-color",
  },
  {
    id: "qr",
    name: "QR Codes",
    tagline: "Scan one, or make one",
    icon: QrGlyph,
    hue: "--app-qr",
  },
  {
    id: "handoff",
    name: "Handoff",
    tagline: "Send data to another device",
    icon: HandoffGlyph,
    hue: "--app-handoff",
  },
  {
    id: "clone",
    name: "Clone",
    tagline: "Copy this device onto another",
    icon: CloneGlyph,
    hue: "--app-clone",
  },
  {
    id: "drop",
    name: "File Drop",
    tagline: "Send any file, device to device",
    icon: DropGlyph,
    hue: "--app-drop",
  },
];

/** id → entry, so a persisted order (list of ids) can be resolved to tiles. */
export const APP_MAP = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<AppId, AppEntry>;

/**
 * The gradient an app's logo chip is filled with — the one place the brand hue
 * becomes a paintable value, shared by the launcher tile and the opening mark so
 * the same square appears to fly out of the tile.
 */
export const chipGradient = (hue: string): string =>
  `linear-gradient(140deg, var(${hue}), color-mix(in srgb, var(${hue}) 78%, black))`;
