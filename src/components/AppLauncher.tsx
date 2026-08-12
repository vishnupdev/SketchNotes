"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceStore, type AppId } from "@/store/useWorkspaceStore";
import { cx, trackSpot } from "@/lib/utils";
import { CloseIcon, SettingsIcon } from "@/components/SketchNotes/atoms/icons";
import { APPS, APP_MAP, chipGradient, type AppEntry } from "@/components/AppCatalog";

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
        "fixed inset-0 z-[80] flex items-center justify-center p-3 transition-opacity duration-200 min-[440px]:p-5",
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
          // Phones keep the compact sheet; from tablet up the dialog stretches
          // into a wide, multi-column gallery.
          "relative flex max-h-[min(88dvh,680px)] w-[min(96vw,540px)] flex-col rounded-2xl border border-border bg-panel shadow-panel transition-transform duration-200",
          "min-[720px]:max-h-[min(90dvh,780px)] min-[720px]:w-[min(94vw,900px)] min-[720px]:rounded-[26px]",
          "min-[1100px]:w-[min(92vw,1120px)] min-[1440px]:w-[min(90vw,1280px)]",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        {/* Ambient accent haze — desktop-only decoration behind the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[26px] min-[720px]:block"
        >
          <div className="absolute -left-24 -top-32 size-80 rounded-full bg-accent-soft opacity-70 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 size-72 rounded-full bg-accent-soft opacity-50 blur-3xl" />
        </div>

        <div className="relative z-10 flex shrink-0 items-start justify-between px-4 pb-3 pt-5 min-[440px]:px-6 min-[440px]:pb-4 min-[440px]:pt-6 min-[720px]:px-8 min-[720px]:pb-5 min-[720px]:pt-7">
          <div className="min-[720px]:flex-1 min-[720px]:pr-6">
            <div className="flex items-center gap-2 min-[720px]:gap-3">
              <h2 className="text-[18px] font-bold tracking-[.2px] min-[720px]:text-[24px] min-[720px]:tracking-[-.2px]">
                Apps
              </h2>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent min-[720px]:px-2.5 min-[720px]:text-[12px]">
                {APPS.length}
              </span>
              {/* Hairline rule that fills the space a wide header opens up. */}
              <span
                aria-hidden
                className="hidden h-px flex-1 bg-(image:--rule-grad) min-[720px]:block"
                style={
                  {
                    "--rule-grad":
                      "linear-gradient(90deg, var(--border), color-mix(in srgb, var(--border) 20%, transparent))",
                  } as React.CSSProperties
                }
              />
            </div>
            <p className="mt-1 text-[13px] text-ink-soft min-[720px]:mt-1.5 min-[720px]:text-[13.5px]">
              Pick a workspace to open — drag <span aria-hidden>⠿</span> to reorder.
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={closeLauncher}
            className="tint hover-pop -mr-1 -mt-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text min-[720px]:size-10 min-[720px]:rounded-xl min-[720px]:border min-[720px]:border-border"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="scroll-slim relative z-10 min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 min-[440px]:px-6 min-[440px]:pb-6 min-[720px]:px-8 min-[720px]:pb-8"
        >
        <ul
          role="list"
          className="grid grid-cols-2 gap-2 min-[440px]:gap-2.5 min-[720px]:grid-cols-3 min-[1100px]:grid-cols-4"
        >
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
                  "group relative rounded-xl transition-transform duration-150 min-[440px]:rounded-2xl",
                  dragging && "scale-[.97] opacity-60",
                )}
              >
                <button
                  onClick={() => setActiveApp(app.id)}
                  onPointerMove={dragId ? undefined : trackSpot}
                  aria-current={active}
                  style={
                    {
                      "--spot": hue,
                      // The small chip is the only place the app's hue lands;
                      // the card itself stays paper-plain.
                      "--chip-grad": chipGradient(app.hue),
                    } as React.CSSProperties
                  }
                  className={cx(
                    // One structure at every width: a single compact row —
                    // hue chip, then name over tagline. No tall card, no rails.
                    "hover-spot flex h-full w-full items-center gap-2.5 rounded-xl border p-2 pr-7 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    "min-[440px]:gap-3 min-[440px]:p-2.5 min-[440px]:pr-8",
                    "min-[720px]:rounded-[14px] min-[720px]:px-3 min-[720px]:py-3 min-[720px]:pr-9",
                    active
                      ? "border-accent bg-accent-soft"
                      : "hover-lift border-border bg-paper hover:border-accent",
                    dropTarget && "border-accent ring-2 ring-accent",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-9 shrink-0 place-items-center rounded-[10px] bg-(image:--chip-grad) text-white transition-transform duration-300 ease-[cubic-bezier(.2,.7,.3,1)] [&>svg]:size-4.5",
                      "min-[720px]:size-10 min-[720px]:rounded-xl min-[720px]:[&>svg]:size-5",
                      "group-hover:scale-105",
                    )}
                  >
                    {app.icon}
                  </span>
                  {/* Active marker: a corner dot, so it costs the label no width
                      on phones where "Malayalam Writer" already needs both lines. */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 size-1.5 rounded-full bg-accent min-[720px]:right-2.5 min-[720px]:top-2.5"
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 min-w-0 wrap-break-word text-[12px] font-semibold leading-tight tracking-[.1px] min-[440px]:text-[13px] min-[720px]:text-[14px] min-[720px]:tracking-normal">
                      {app.name}
                    </span>
                    {/* Wrapper owns the show/hide so `hidden` never races the
                        display line-clamp-2 sets on the text itself. */}
                    <span className="hidden min-[440px]:block">
                      <span className="line-clamp-2 text-[11px] leading-[1.35] text-ink-soft min-[720px]:text-[12px]">
                        {app.tagline}
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cx(
                      "hidden shrink-0 text-ink-soft transition-all duration-200 min-[720px]:block",
                      active
                        ? "opacity-0"
                        : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                    )}
                  >
                    {ArrowIcon}
                  </span>
                </button>

                {/* Drag handle — a sibling of the tile button (never nested, so
                    the markup stays valid) and the only reorder affordance. It
                    sits centred on the row's right edge and stays out of the way
                    on pointer devices until the row is hovered or focused. */}
                <button
                  type="button"
                  aria-label={`Reorder ${app.name}. Drag, or press arrow keys to move.`}
                  onPointerDown={(e) => startDrag(e, app.id)}
                  onPointerMove={dragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(e) => reorderByKey(e, app.id)}
                  className={cx(
                    "hover-pop absolute right-0.5 top-1/2 z-10 grid size-7 -translate-y-1/2 touch-none place-items-center rounded-lg text-ink-soft opacity-60 hover:text-text focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent [&>svg]:size-3.5",
                    "min-[720px]:right-1 min-[720px]:size-8 min-[720px]:opacity-0 min-[720px]:group-hover:opacity-100 min-[720px]:[&>svg]:size-4",
                    dragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                >
                  {GripGlyph}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 border-t border-border pt-3 min-[440px]:mt-5 min-[440px]:pt-4 min-[720px]:mt-6 min-[720px]:flex min-[720px]:items-center min-[720px]:justify-between min-[720px]:gap-4 min-[720px]:pt-5">
          <button
            onClick={openSettings}
            className="tint hover-lift group flex w-full items-center gap-2.5 rounded-xl border border-border bg-paper px-3 py-2.5 text-left hover:border-accent min-[440px]:gap-3 min-[440px]:px-4 min-[440px]:py-3 min-[720px]:w-auto min-[720px]:min-w-75 min-[720px]:rounded-2xl"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent transition-transform duration-300 ease-[cubic-bezier(.2,.7,.3,1)] group-hover:rotate-45">
              <SettingsIcon size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-bold tracking-[.1px]">Settings</span>
              <span className="hidden text-[12px] text-ink-soft min-[440px]:block">
                Theme and workspace preferences.
              </span>
            </span>
          </button>
          {/* Room only a wide dialog has: spell out the shortcuts. */}
          <p className="hidden items-center gap-1.5 text-[12px] text-ink-soft min-[720px]:flex">
            <kbd className="rounded-md border border-border bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold">
              Esc
            </kbd>
            to close ·
            <kbd className="rounded-md border border-border bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold">
              ↑ ↓
            </kbd>
            on <span aria-hidden>⠿</span> to reorder
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
