"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useResourcesStore } from "@/store/useResourcesStore";
import { useResourceAccess } from "@/hooks/useResourceAccess";
import { ModeTabs, RESOURCE_TAB_ORDER } from "@/components/Resources/molecules/ModeTabs";
import { LivePanel } from "@/components/Resources/organisms/LivePanel";
import { AccessPanel } from "@/components/Resources/organisms/AccessPanel";
import { AppsPanel } from "@/components/Resources/organisms/AppsPanel";
import { PrivacyPanel } from "@/components/Resources/organisms/PrivacyPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppsIcon, ShieldIcon } from "@/components/SketchNotes/atoms/icons";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";

/**
 * Resource Monitor — what is using this device, and which app is doing it.
 *
 * Four views over one question. **Live** holds the camera, microphone, screen
 * or location open so "in use" is something you can see rather than infer, and
 * meters the resources that need no permission at all. **Access** lists every
 * resource the browser gates, with its current answer. **Apps** breaks the one
 * browser origin back into the nineteen apps behind it — the view a browser's
 * site settings cannot produce. **Privacy** covers the rest: the signals this
 * browser sends, the hosts the page has actually contacted, what is stored, and
 * the long list of things any site can read without ever asking.
 *
 * The app only ever reads. It writes nothing, deletes nothing, and transmits
 * nothing — every figure is measured on the device and thrown away when you
 * leave. The one thing it does hold is a capture you started yourself, and
 * {@link ResourcesState.stopAll} on unmount is what guarantees it is handed back
 * the moment you switch apps.
 */
export function ResourceMonitorApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tab = useResourcesStore((s) => s.tab);
  const setTab = useResourcesStore((s) => s.setTab);
  const hydrate = useResourcesStore((s) => s.hydrate);
  const stopAll = useResourcesStore((s) => s.stopAll);
  const { states, loading, refresh } = useResourceAccess();

  // Adopt the saved tab once, after mount.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // The workspace unmounts an app when you switch away, so this is what
  // releases the camera, the microphone, the screen share and the location
  // watch. A privacy monitor that leaked one of them into the next app would be
  // the exact failure it exists to catch.
  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-end justify-between gap-4">
          {/* Releases everything on the way out, so leaving by the brand link
              behaves exactly like leaving by the launcher. */}
          <AppBrand
            icon={<ShieldIcon size={26} />}
            name="Resource Monitor"
            tagline="what uses your camera, mic & storage"
            heading
            onLeave={stopAll}
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      {/* The tab bar floats over the content, so `bottom-nav-clear` keeps the
          last card scrollable out from under it. */}
      <main className="bottom-nav-clear mx-auto w-full max-w-[900px] flex-1 px-5 pt-[22px]">
        <NavView
          viewKey={tab}
          order={RESOURCE_TAB_ORDER}
          id={`resources-panel-${tab}`}
          role="tabpanel"
        >
          {tab === "live" ? (
            <LivePanel states={states} />
          ) : tab === "access" ? (
            <AccessPanel states={states} loading={loading} onRefresh={() => void refresh()} />
          ) : tab === "apps" ? (
            <AppsPanel />
          ) : (
            <PrivacyPanel />
          )}
        </NavView>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-soft">
          Everything here is read on this device and discarded — nothing is recorded, saved or
          uploaded. A web page can only see its own use of the camera, microphone, screen and
          location, so this reports on the OneApp workspace, never on your other tabs or your other
          applications.
        </p>
      </main>

      <ModeTabs tab={tab} onTab={setTab} />

      <AppFooter />
    </div>
  );
}
