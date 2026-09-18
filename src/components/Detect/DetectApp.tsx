"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { DETECT_TOOLS, useDetectStore, type DetectTool } from "@/store/useDetectStore";
import { LivePanel } from "@/components/Detect/organisms/LivePanel";
import { PicturePanel } from "@/components/Detect/organisms/PicturePanel";
import { SeenPanel } from "@/components/Detect/organisms/SeenPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  DetectIcon,
  ImportIcon,
  ListChecksIcon,
  CameraIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<DetectTool>[] = [
  {
    id: "live",
    label: "Live",
    hint: "Point the camera at something and see what it recognises",
    icon: <CameraIcon size={19} />,
    controls: "detect-panel-live",
  },
  {
    id: "picture",
    label: "Picture",
    hint: "Find the objects in a photo — no camera needed",
    icon: <ImportIcon size={19} />,
    controls: "detect-panel-picture",
  },
  {
    id: "seen",
    label: "Seen",
    hint: "What has turned up so far, and the eighty things it can recognise",
    icon: <ListChecksIcon size={19} />,
    controls: "detect-panel-seen",
  },
];

/**
 * Detect — what the camera is looking at, named.
 *
 * The workspace could already read a page through the camera (Scan), read its
 * words (OCR), read its colours (Color Lens) and read a code off it (QR Codes).
 * What none of them could do is say what the thing in front of the lens *is*.
 * This fills that in with a trained object detector that runs on the device.
 *
 * Two convictions shape the whole app.
 *
 * **The vocabulary is the feature, not the fine print.** A camera pointed at
 * the world looks omniscient, so the first disappointment is always something
 * it cannot see — and people conclude the app is broken rather than bounded.
 * The eighty categories it knows are therefore a tab of their own, searchable,
 * with the things already found marked off. Saying "no, never, and here is the
 * complete list" is more useful than any amount of accuracy.
 *
 * **A live camera is the workspace's most privacy-visible feature.** So it is
 * off until asked, every exit path stops it (leaving the tab unmounts the
 * panel, leaving the app unmounts the tab), no frame is ever stored or
 * uploaded, and the session tally — the only thing that outlives a frame — is
 * held in memory and never written to disk. The detector travels to the camera;
 * the camera never travels anywhere.
 *
 * The model itself is the awkward part, as it is in OCR: a few megabytes of
 * trained weights, far too much to precache for a workspace where most people
 * will never open this app. It is fetched on the first run, cached by the
 * service worker, and the screen says so rather than leaving someone staring at
 * a frozen preview.
 */
export function DetectApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useDetectStore((s) => s.tool);
  const setTool = useDetectStore((s) => s.setTool);
  const hydrate = useDetectStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Leaving the app frees the weights held in GPU memory — tens of megabytes a
  // workspace that keeps every app mounted cannot hold for one nobody is
  // looking at. The next visit reloads them from the worker's cache, not the
  // network. The camera is stopped by the Live panel's own unmount.
  useEffect(
    () => () => {
      void import("@/lib/Detect/engine").then((engine) => engine.release());
    },
    [],
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<DetectIcon size={24} />}
            name="Detect"
            tagline="name what the camera sees"
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[720px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={DETECT_TOOLS} id={`detect-panel-${tool}`} role="tabpanel">
          {tool === "live" ? <LivePanel /> : tool === "picture" ? <PicturePanel /> : <SeenPanel />}
        </NavView>
      </main>

      <BottomNav
        label="Detect tools"
        items={TABS}
        value={tool}
        onChange={setTool}
        maxWidth={360}
      />

      <AppFooter />
    </div>
  );
}
