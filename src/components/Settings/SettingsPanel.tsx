"use client";

import { useEffect, type ReactNode } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTheme } from "@/hooks/useTheme";
import { cx } from "@/lib/utils";
import { THEMES } from "@/lib/themes";
import { CheckIcon, CloseIcon } from "@/components/SketchNotes/atoms/icons";

/** One labelled block within the settings dialog. New settings go here. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[14px] font-bold tracking-[.1px]">{title}</h3>
      {description && <p className="mt-0.5 text-[12.5px] text-ink-soft">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Theme picker. Each tile is scoped with its own `data-theme`, so it previews
 * the real palette (paper, panel, accent, grid) straight from the CSS tokens —
 * no colour values are duplicated in JS.
 */
function ThemeSetting() {
  const { themeId, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-2 gap-2.5 min-[440px]:grid-cols-3"
    >
      {THEMES.map((t) => {
        const active = t.id === themeId;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            data-theme={t.id}
            onClick={() => setTheme(t.id)}
            className={cx(
              "relative flex flex-col gap-2.5 overflow-hidden rounded-xl border bg-paper p-3 text-left transition-all",
              active
                ? "border-accent ring-2 ring-accent"
                : "border-border hover:-translate-y-0.5 hover:shadow-panel",
            )}
          >
            {/* mini palette preview */}
            <span className="flex items-center gap-1.5">
              <span className="size-6 flex-none rounded-full bg-accent" />
              <span className="size-6 flex-none rounded-lg border border-border bg-panel" />
              <span className="h-1.5 flex-1 rounded-full bg-grid" />
            </span>
            <span className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-text">{t.label}</span>
              {active && (
                <span className="grid size-4 place-items-center rounded-full bg-accent text-white">
                  <CheckIcon size={11} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Application-wide settings overlay. Shared across every app in the workspace
 * (opened from the app launcher or the header), styled with theme tokens and
 * built section-by-section so new settings slot in without new plumbing.
 */
export function SettingsPanel() {
  const open = useWorkspaceStore((s) => s.settingsOpen);
  const closeSettings = useWorkspaceStore((s) => s.closeSettings);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSettings]);

  return (
    <div
      className={cx(
        "fixed inset-0 z-[85] flex items-center justify-center p-5 transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      {/* backdrop */}
      <button
        aria-label="Close settings"
        onClick={closeSettings}
        className="absolute inset-0 cursor-default bg-[rgba(15,20,26,.55)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={cx(
          "relative w-[min(92vw,540px)] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-panel transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold tracking-[.2px]">Settings</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Preferences for the whole workspace.</p>
          </div>
          <button
            aria-label="Close"
            onClick={closeSettings}
            className="tint -mr-1 -mt-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Theme" description="Pick a colour theme for the whole workspace.">
            <ThemeSetting />
          </Section>
        </div>
      </div>
    </div>
  );
}
