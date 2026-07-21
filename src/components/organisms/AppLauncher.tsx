"use client";

import { useEffect } from "react";
import { useWorkspaceStore, type AppId } from "@/store/useWorkspaceStore";
import { cx } from "@/lib/utils";
import { CloseIcon } from "@/components/atoms/icons";

interface AppEntry {
  id: AppId;
  name: string;
  tagline: string;
  /** Emoji glyph shown in the app tile. */
  glyph: string;
}

const APPS: AppEntry[] = [
  {
    id: "sketchnotes",
    name: "Sketchnotes",
    tagline: "Sketch ideas and jot notes on an infinite canvas.",
    glyph: "✏️",
  },
  {
    id: "pdf",
    name: "PDF Editor",
    tagline: "Edit, merge, split, sign — every PDF tool, zero uploads.",
    glyph: "📄",
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
    >
      {/* backdrop */}
      <button
        aria-label="Close app switcher"
        onClick={closeLauncher}
        className="absolute inset-0 cursor-default bg-[rgba(31,42,51,.5)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an app"
        className={cx(
          "relative w-[min(92vw,560px)] rounded-2xl border border-border bg-panel p-5 shadow-panel transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold tracking-[.2px]">Apps</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Pick a workspace to open.</p>
          </div>
          <button
            aria-label="Close"
            onClick={closeLauncher}
            className="tint grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
          {APPS.map((app) => {
            const active = app.id === activeApp;
            return (
              <button
                key={app.id}
                onClick={() => setActiveApp(app.id)}
                className={cx(
                  "group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-paper hover:border-accent hover:bg-accent-soft/60",
                )}
              >
                <span className="grid size-11 place-items-center rounded-[12px] border border-border bg-panel text-[22px] leading-none">
                  {app.glyph}
                </span>
                <span className="flex items-center gap-2 text-[15px] font-bold">
                  {app.name}
                  {active && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                      Open
                    </span>
                  )}
                </span>
                <span className="text-[12.5px] leading-snug text-ink-soft">{app.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
