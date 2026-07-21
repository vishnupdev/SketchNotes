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
}

const SketchGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
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
    strokeWidth={1.8}
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
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M4 17l4.5-4.5a2 2 0 0 1 2.8 0L17 18" />
  </svg>
);

const APPS: AppEntry[] = [
  {
    id: "sketchnotes",
    name: "Sketchnotes",
    tagline: "Sketch ideas and jot notes on an infinite canvas.",
    icon: SketchGlyph,
  },
  {
    id: "pdf",
    name: "PDF Editor",
    tagline: "Edit, merge, split & sign — every PDF tool, zero uploads.",
    icon: PdfGlyph,
  },
  {
    id: "image",
    name: "Image Studio",
    tagline: "Crop, resize & compress images to any size or upload preset.",
    icon: ImageGlyph,
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
    >
      {/* backdrop */}
      <button
        aria-label="Close app switcher"
        onClick={closeLauncher}
        className="absolute inset-0 cursor-default bg-[rgba(15,20,26,.55)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an app"
        className={cx(
          "relative w-[min(92vw,540px)] rounded-2xl border border-border bg-panel p-6 shadow-panel transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold tracking-[.2px]">Apps</h2>
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

        <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2">
          {APPS.map((app) => {
            const active = app.id === activeApp;
            return (
              <button
                key={app.id}
                onClick={() => setActiveApp(app.id)}
                aria-current={active}
                className={cx(
                  "group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent"
                    : "border-border bg-paper hover:-translate-y-0.5 hover:border-accent hover:shadow-panel",
                )}
              >
                {active && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                    Current
                  </span>
                )}
                <span className="grid size-12 place-items-center rounded-[14px] bg-accent text-white shadow-[0_4px_12px_rgba(15,123,108,.35)]">
                  {app.icon}
                </span>
                <span className="text-[15.5px] font-bold tracking-[.1px]">{app.name}</span>
                <span className="text-[12.5px] leading-snug text-ink-soft">{app.tagline}</span>
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
  );
}
