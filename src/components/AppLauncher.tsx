"use client";

import { useEffect, type ReactNode } from "react";
import { useWorkspaceStore, type AppId } from "@/store/useWorkspaceStore";
import { cx } from "@/lib/utils";
import { CloseIcon, SettingsIcon } from "@/components/SketchNotes/atoms/icons";

interface AppEntry {
  id: AppId;
  name: string;
  tagline: string;
  icon: ReactNode;
  /** CSS custom-property name holding this app's brand hue (see globals.css). */
  hue: string;
}

const ArrowIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

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

const APPS: AppEntry[] = [
  {
    id: "sketchnotes",
    name: "Sketchnotes",
    tagline: "Sketch ideas and jot notes on an infinite canvas.",
    icon: SketchGlyph,
    hue: "--app-sketchnotes",
  },
  {
    id: "pdf",
    name: "PDF Editor",
    tagline: "Edit, merge, split & sign — every PDF tool, zero uploads.",
    icon: PdfGlyph,
    hue: "--app-pdf",
  },
  {
    id: "image",
    name: "Image Studio",
    tagline: "Crop, resize & compress images to any size or upload preset.",
    icon: ImageGlyph,
    hue: "--app-image",
  },
  {
    id: "todos",
    name: "Todos",
    tagline: "Plan & track tasks by day, week, month & year.",
    icon: TodoGlyph,
    hue: "--app-todos",
  },
  {
    id: "reminders",
    name: "Reminders",
    tagline: "Timed alerts with a notification sound you pick.",
    icon: ReminderGlyph,
    hue: "--app-reminders",
  },
  {
    id: "timer",
    name: "Timer",
    tagline: "Countdown timers, a lap stopwatch & pomodoro focus cycles.",
    icon: TimerGlyph,
    hue: "--app-timer",
  },
  {
    id: "system",
    name: "System Info",
    tagline: "Analyze this device & browser — full hardware & capability report.",
    icon: SystemGlyph,
    hue: "--app-system",
  },
  {
    id: "speed",
    name: "Network Speed",
    tagline: "Measure download, upload, ping & jitter on your connection.",
    icon: SpeedGlyph,
    hue: "--app-speed",
  },
  {
    id: "news",
    name: "News",
    tagline: "Latest headlines — tech, sports, India, Kerala, world & more.",
    icon: NewsGlyph,
    hue: "--app-news",
  },
];

/**
 * Full-screen app switcher. Opened from the header (Sketchnotes) or from the
 * embedded PDF editor's "Apps" button. Picking a tile swaps the active app.
 */
export function AppLauncher() {
  const open = useWorkspaceStore((s) => s.launcherOpen);
  const activeApp = useWorkspaceStore((s) => s.activeApp);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const closeLauncher = useWorkspaceStore((s) => s.closeLauncher);
  const openSettings = useWorkspaceStore((s) => s.openSettings);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLauncher();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeLauncher]);

  return (
    <div
      className={cx(
        "fixed inset-0 z-[80] flex items-center justify-center p-5 transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      {/* backdrop */}
      <button
        aria-label="Close app switcher"
        onClick={closeLauncher}
        className="absolute inset-0 cursor-default bg-(--scrim) backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an app"
        className={cx(
          "relative flex max-h-[min(88dvh,680px)] w-[min(92vw,540px)] flex-col rounded-2xl border border-border bg-panel shadow-panel transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        <div className="flex shrink-0 items-start justify-between px-6 pb-4 pt-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold tracking-[.2px]">Apps</h2>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                {APPS.length}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink-soft">Pick a workspace to open.</p>
          </div>
          <button
            aria-label="Close"
            onClick={closeLauncher}
            className="tint -mr-1 -mt-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
          {APPS.map((app) => {
            const active = app.id === activeApp;
            const hue = `var(${app.hue})`;
            return (
              <button
                key={app.id}
                onClick={() => setActiveApp(app.id)}
                aria-current={active}
                className={cx(
                  "group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent"
                    : "border-border bg-paper hover:-translate-y-0.5 hover:border-accent hover:shadow-panel",
                )}
              >
                {active && (
                  <span className="absolute right-3 top-3 z-10 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                    Current
                  </span>
                )}
                <span
                  className="grid size-12 place-items-center rounded-[14px] text-white transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(140deg, ${hue}, color-mix(in srgb, ${hue} 78%, black))`,
                    boxShadow: `0 8px 18px -6px color-mix(in srgb, ${hue} 60%, transparent)`,
                  }}
                >
                  {app.icon}
                </span>
                <span className="text-[15.5px] font-bold tracking-[.1px]">{app.name}</span>
                <span className="text-[12.5px] leading-snug text-ink-soft">{app.tagline}</span>
                <span
                  aria-hidden
                  className={cx(
                    "absolute bottom-3 right-3 grid size-6 place-items-center rounded-full text-white transition-all duration-200",
                    active
                      ? "opacity-0"
                      : "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                  style={{ background: hue }}
                >
                  {ArrowIcon}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <button
            onClick={openSettings}
            className="tint flex w-full items-center gap-3 rounded-xl border border-border bg-paper px-4 py-3 text-left transition-colors hover:border-accent"
          >
            <span className="grid size-9 place-items-center rounded-[11px] bg-accent-soft text-accent">
              <SettingsIcon size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-bold tracking-[.1px]">Settings</span>
              <span className="text-[12px] text-ink-soft">Theme and workspace preferences.</span>
            </span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
