"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { TranslatorPanel } from "@/components/Translate/organisms/TranslatorPanel";
import { AppsIcon, TranslateIcon } from "@/components/SketchNotes/atoms/icons";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Translate — convert text between languages, online or fully offline.
 *
 * Online translations go through our own `/api/translate` route (auto-detecting
 * the source language); offline translations run entirely on-device via the
 * browser's built-in AI Translator, so no text leaves the machine once the
 * language pack is downloaded. Rendered natively; theme comes from the shared
 * <body>. Mobile-first: the two panes stack on narrow screens and sit side by
 * side from `md` up.
 */
export function TranslateApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-3.5 pt-[22px]">
        <div className="mx-auto flex max-w-[900px] items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-on-accent shadow-[0_0_0_4px_var(--accent-soft)]">
              <TranslateIcon size={26} />
            </span>
            <div>
              <h1 className="text-[27px] font-extrabold leading-none tracking-tight">Translate</h1>
              <p className="mt-1 font-serif text-[15px] italic text-ink-soft">
                any language, online or offline
              </p>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">
                by Vishnu P
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            <span className="hidden sm:inline">Apps</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-[80px] pt-5">
        <TranslatorPanel />

        <p className="mt-6 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-text">Offline</span> translation runs on your device
          with the browser&apos;s built-in AI — nothing is sent anywhere, and it keeps working with
          no connection once the language pack has downloaded (latest Chrome &amp; Edge).{" "}
          <span className="font-semibold text-text">Online</span> mode uses a network service and
          auto-detects the source language. <span className="font-semibold text-text">Auto</span>{" "}
          picks on-device when a pack is already installed, otherwise online.
        </p>
      </main>

      <AppFooter />
    </div>
  );
}
