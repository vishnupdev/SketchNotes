"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

const GripGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4.5">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
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
  {
    id: "malayalam",
    name: "Malayalam Writer",
    tagline: "Type, tap or handwrite Malayalam — transliteration, keyboard & ink.",
    icon: MalayalamGlyph,
    hue: "--app-malayalam",
  },
  {
    id: "translate",
    name: "Translate",
    tagline: "Convert text between languages — online, or fully offline on-device.",
    icon: TranslateGlyph,
    hue: "--app-translate",
  },
];

/** id → entry, so a persisted order (list of ids) can be resolved to tiles. */
const APP_MAP = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<AppId, AppEntry>;

/** Move the item at `from` to index `to`, returning a new array. */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Full-screen app switcher. Opened from the header (Sketchnotes) or from the
 * embedded PDF editor's "Apps" button. Picking a tile swaps the active app;
 * dragging a tile's handle (or arrow-keying it) reorders the grid, and the
 * order is persisted per browser.
 */
export function AppLauncher() {
  const open = useWorkspaceStore((s) => s.launcherOpen);
  const activeApp = useWorkspaceStore((s) => s.activeApp);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const closeLauncher = useWorkspaceStore((s) => s.closeLauncher);
  const openSettings = useWorkspaceStore((s) => s.openSettings);
  const appOrder = useWorkspaceStore((s) => s.appOrder);
  const setAppOrder = useWorkspaceStore((s) => s.setAppOrder);
  const hydrateAppOrder = useWorkspaceStore((s) => s.hydrateAppOrder);

  // The tile currently picked up, and the tile the pointer is hovering over.
  const [dragId, setDragId] = useState<AppId | null>(null);
  const [overId, setOverId] = useState<AppId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Edge auto-scroll: direction (-1/0/1) plus the active rAF handle.
  const scrollDir = useRef(0);
  const rafId = useRef<number | null>(null);

  // Adopt the persisted order once, after mount.
  useEffect(() => {
    hydrateAppOrder();
  }, [hydrateAppOrder]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLauncher();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeLauncher]);

  const stopAutoScroll = useCallback(() => {
    scrollDir.current = 0;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const stepScroll = useCallback(() => {
    const sc = scrollRef.current;
    if (sc && scrollDir.current !== 0) {
      sc.scrollTop += scrollDir.current * 12;
      rafId.current = requestAnimationFrame(stepScroll);
    } else {
      rafId.current = null;
    }
  }, []);

  // Clean up any running scroll loop if the launcher unmounts mid-drag.
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  function startDrag(e: React.PointerEvent, id: AppId) {
    // Primary button / touch / pen only; let other buttons pass through.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(id);
    setOverId(id);
  }

  function dragMove(e: React.PointerEvent) {
    if (!dragId) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-app-tile]");
    const id = target?.dataset.appTile as AppId | undefined;
    if (id && id !== overId) setOverId(id);

    // Nudge the scroll container when dragging near its top/bottom edge.
    const sc = scrollRef.current;
    if (sc) {
      const r = sc.getBoundingClientRect();
      const EDGE = 56;
      const dir = e.clientY < r.top + EDGE ? -1 : e.clientY > r.bottom - EDGE ? 1 : 0;
      if (dir !== scrollDir.current) {
        scrollDir.current = dir;
        if (dir !== 0 && rafId.current === null) rafId.current = requestAnimationFrame(stepScroll);
      }
    }
  }

  function endDrag(e: React.PointerEvent) {
    stopAutoScroll();
    if (dragId && overId && overId !== dragId) {
      const from = appOrder.indexOf(dragId);
      const to = appOrder.indexOf(overId);
      if (from !== -1 && to !== -1) setAppOrder(moveItem(appOrder, from, to));
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragId(null);
    setOverId(null);
  }

  function reorderByKey(e: React.KeyboardEvent, id: AppId) {
    const dir = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : 0;
    if (dir === 0) return;
    const from = appOrder.indexOf(id);
    const to = from + dir;
    if (to < 0 || to >= appOrder.length) return;
    e.preventDefault();
    // The handle keeps focus across the reorder because tiles are keyed by id.
    setAppOrder(moveItem(appOrder, from, to));
  }

  const ordered = appOrder.map((id) => APP_MAP[id]).filter(Boolean) as AppEntry[];

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
            <p className="mt-1 text-[13px] text-ink-soft">
              Pick a workspace to open — drag <span aria-hidden>⠿</span> to reorder.
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={closeLauncher}
            className="tint -mr-1 -mt-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <ul role="list" className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
          {ordered.map((app) => {
            const active = app.id === activeApp;
            const hue = `var(${app.hue})`;
            const dragging = app.id === dragId;
            const dropTarget = dragId !== null && app.id === overId && overId !== dragId;
            return (
              <li
                key={app.id}
                data-app-tile={app.id}
                className={cx(
                  "group relative rounded-2xl transition-transform duration-150",
                  dragging && "scale-[.97] opacity-60",
                )}
              >
                <button
                  onClick={() => setActiveApp(app.id)}
                  aria-current={active}
                  className={cx(
                    "flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-11 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "border-accent bg-accent-soft ring-1 ring-accent"
                      : "border-border bg-paper hover:-translate-y-0.5 hover:border-accent hover:shadow-panel",
                    dropTarget && "border-accent ring-2 ring-accent",
                  )}
                >
                  <span
                    className="grid size-12 place-items-center rounded-[14px] text-white transition-transform duration-200 group-hover:scale-105"
                    style={{
                      background: `linear-gradient(140deg, ${hue}, color-mix(in srgb, ${hue} 78%, black))`,
                      boxShadow: `0 8px 18px -6px color-mix(in srgb, ${hue} 60%, transparent)`,
                    }}
                  >
                    {app.icon}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[15.5px] font-bold tracking-[.1px]">{app.name}</span>
                    {active && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-on-accent">
                        Current
                      </span>
                    )}
                  </span>
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

                {/* Drag handle — a sibling of the tile button (never nested, so
                    the markup stays valid) and the only reorder affordance. */}
                <button
                  type="button"
                  aria-label={`Reorder ${app.name}. Drag, or press arrow keys to move.`}
                  onPointerDown={(e) => startDrag(e, app.id)}
                  onPointerMove={dragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(e) => reorderByKey(e, app.id)}
                  className={cx(
                    "absolute right-2 top-2 z-10 grid size-8 touch-none place-items-center rounded-lg text-ink-soft transition-colors hover:bg-panel hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    dragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                >
                  {GripGlyph}
                </button>
              </li>
            );
          })}
        </ul>

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
