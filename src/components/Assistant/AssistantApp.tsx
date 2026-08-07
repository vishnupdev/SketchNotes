"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { AssistantChat } from "@/components/Assistant/organisms/AssistantChat";
import { AppsIcon, AssistantIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Assistant — a free, private AI guide to the workspace.
 *
 * It answers from a built-in knowledge base of every app (see
 * `lib/Assistant/knowledge.ts`) and, when the browser ships a built-in
 * on-device language model, uses that model to phrase the answer — so there is
 * no API key, no cost and no question ever leaves the device. Answers come with
 * buttons that open the tool being described.
 *
 * Rendered natively; theme comes from the shared <body>. Unlike the other apps
 * this one fills the viewport and scrolls its thread internally, so the composer
 * is always within reach — mobile-first, widening on larger screens.
 */
export function AssistantApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="z-20 shrink-0 border-b border-border bg-paper px-[22px] pb-3.5 pt-[22px]">
        <div className="mx-auto flex max-w-[760px] items-end justify-between gap-4">
          <AppBrand
            icon={<AssistantIcon size={26} />}
            name="Assistant"
            tagline="your guide to every app here"
            heading
          />

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

      <main className="flex min-h-0 w-full flex-1 flex-col">
        <AssistantChat />
      </main>

      <AppFooter />
    </div>
  );
}
