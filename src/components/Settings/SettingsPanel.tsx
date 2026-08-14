"use client";

import { useEffect, type ReactNode } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cx } from "@/lib/utils";
import { CloseIcon } from "@/components/SketchNotes/atoms/icons";
import { OfflineSetting } from "@/components/Settings/OfflineSetting";
import { CursorSetting } from "@/components/Settings/CursorSetting";
import { ThemeSetting } from "@/components/Settings/ThemeSetting";
import { InterfaceSetting } from "@/components/Settings/InterfaceSetting";
import { SoundSetting } from "@/components/Settings/SoundSetting";

/**
 * One labelled block within the settings dialog. New settings go here.
 *
 * Narrow viewports stack the sections as a single ruled list; from tablet up each
 * becomes its own card so they can flow into two columns without the rules
 * reading as stray lines mid-column. The two treatments are split across the
 * breakpoint (`max-[719px]` vs `min-[720px]`) rather than layered, so neither
 * has to out-specify the other.
 */
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
    <section
      className={cx(
        "max-[719px]:border-t max-[719px]:border-border max-[719px]:pt-4 max-[719px]:first:border-t-0 max-[719px]:first:pt-0",
        "min-[720px]:break-inside-avoid min-[720px]:rounded-2xl min-[720px]:border min-[720px]:border-border min-[720px]:bg-paper min-[720px]:p-5",
      )}
    >
      <h3 className="text-[14px] font-bold tracking-[.1px] min-[720px]:text-[15px]">{title}</h3>
      {description && <p className="mt-0.5 text-[12.5px] text-ink-soft">{description}</p>}
      {/* A container, so the tile grids inside size themselves to the column they
          landed in rather than to the viewport — in two-column mode a section is
          barely a third of the window wide. */}
      <div className="mt-3 @container">{children}</div>
    </section>
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
        className="absolute inset-0 cursor-default bg-(--scrim) backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={
          {
            // Painted as a background rather than positioned children so the haze
            // stays put while the dialog's own content scrolls under it.
            "--haze":
              "radial-gradient(58% 42% at 0% 0%, var(--accent-soft), transparent 70%), radial-gradient(50% 38% at 100% 100%, var(--accent-soft), transparent 70%)",
          } as React.CSSProperties
        }
        className={cx(
          // scroll-slim keeps the overflow bar thin and theme-coloured instead
          // of the platform's full-width one, which sat proud of the rounded
          // corners; its stable gutter means nothing shifts when it appears.
          "scroll-slim relative max-h-[85vh] w-[min(92vw,540px)] overflow-y-auto rounded-2xl border border-border bg-panel p-6 shadow-panel transition-transform duration-200",
          "min-[720px]:max-h-[88vh] min-[720px]:w-[min(94vw,880px)] min-[720px]:rounded-[26px] min-[720px]:bg-(image:--haze) min-[720px]:p-8",
          "min-[1100px]:w-[min(92vw,1060px)]",
          open ? "translate-y-0" : "translate-y-3",
        )}
      >
        <div className="mb-5 flex items-start justify-between min-[720px]:mb-6">
          <div className="min-[720px]:flex-1 min-[720px]:pr-6">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-bold tracking-[.2px] min-[720px]:text-[24px] min-[720px]:tracking-[-.2px]">
                Settings
              </h2>
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
            <p className="mt-1 text-[13px] text-ink-soft">Preferences for the whole workspace.</p>
          </div>
          <button
            aria-label="Close"
            onClick={closeSettings}
            className="tint -mr-1 -mt-1 grid size-9 place-items-center rounded-[10px] text-ink-soft hover:text-text min-[720px]:size-10 min-[720px]:rounded-xl min-[720px]:border min-[720px]:border-border"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Columns rather than a grid: the sections differ wildly in height,
            and column balancing packs them without leaving a tall gap under the
            short ones. */}
        <div className="flex flex-col gap-5 min-[720px]:block min-[720px]:columns-2 min-[720px]:gap-5 min-[720px]:[&>section]:mb-5">
          <Section
            title="Theme"
            description="Pick a colour theme for the whole workspace, or build one from your own colours."
          >
            <ThemeSetting />
          </Section>

          <Section
            title="Interface"
            description="Change the shape of the workspace, not its colour — what panels are made of, how their corners are cut, and how tightly everything is packed."
          >
            <InterfaceSetting />
          </Section>

          <Section
            title="Pointer"
            description="Swap the mouse pointer — a drawn preset in your theme colours, or an image of your own. Touch input is unaffected."
          >
            <CursorSetting />
          </Section>

          <Section
            title="Sound"
            description="Quiet tones for opening the workspace and for arriving somewhere in it — each app and each page has its own note. Nothing else in the workspace makes a sound unless you ask it to."
          >
            <SoundSetting />
          </Section>

          <Section
            title="Offline"
            description="Keep every app on this device so the workspace opens with no internet."
          >
            <OfflineSetting />
          </Section>
        </div>
      </div>
    </div>
  );
}
