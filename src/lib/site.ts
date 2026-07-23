/**
 * Single source of truth for site-wide SEO metadata: the canonical origin, the
 * brand name (and its search aliases), and the catalog of apps in the workspace.
 * Consumed by the root layout, sitemap, robots, per-route metadata and the
 * server-rendered SEO landing content so the domain/name live in exactly one place.
 */

// The production origin. Override per-environment via NEXT_PUBLIC_SITE_URL.
// Falls back to the live Vercel deployment so canonical/sitemap/robots are
// correct even when the env var is missing at build time.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://oneappready.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "OneApp";

// Search aliases people actually type. Surfaced in JSON-LD `alternateName` so
// Google associates all these spellings with the brand.
export const SITE_ALIASES = ["One App", "OneApp Workspace", "One App Online"];

export const SITE_TAGLINE = "Every tool in one place";

export const SITE_DESCRIPTION =
  "OneApp — every tool in one place. Sketch notes, a full PDF editor, image studio, todos, reminders, timer and more, in a single free offline-first web workspace. No sign-up, all data stays in your browser.";

/** One entry per app/deep-link. Drives the sitemap, the crawlable landing list
 * and per-route <title>/description/canonical. */
export type AppEntry = {
  path: string;
  name: string;
  /** Short marketing line used in metadata + the landing list. */
  blurb: string;
};

export const APPS: AppEntry[] = [
  { path: "/", name: "Sketch Notes", blurb: "freehand drawing and infinite note canvas" },
  { path: "/pdfeditor", name: "PDF Editor", blurb: "view, edit, annotate, merge and organize PDF files" },
  { path: "/image", name: "Image Studio", blurb: "crop, adjust and edit images in the browser" },
  { path: "/todos", name: "Todos", blurb: "task list and weekly planner" },
  { path: "/reminders", name: "Reminders", blurb: "scheduled reminders with notifications" },
  { path: "/timer", name: "Timer", blurb: "pomodoro and countdown timer" },
  { path: "/system", name: "System Info", blurb: "live device and system dashboard" },
  { path: "/speedtest", name: "Speed Test", blurb: "measure your network speed" },
];

/** Keywords targeting the brand plus each tool's search intent. */
export const SITE_KEYWORDS = [
  "OneApp",
  "One App",
  "one app",
  "all in one app",
  "all-in-one web app",
  "online tools",
  "sketch notes",
  "PDF editor",
  "image studio",
  "todo app",
  "reminders app",
  "pomodoro timer",
  "offline PWA",
  "free online tools no signup",
];
