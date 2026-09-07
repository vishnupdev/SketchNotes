"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { CLIP_TOOLS, useClipStore, type ClipTool } from "@/store/useClipStore";
import { RecordPanel } from "@/components/Clip/organisms/RecordPanel";
import { LibraryPanel } from "@/components/Clip/organisms/LibraryPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import { AppsIcon, FilmIcon, RecordIcon } from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<ClipTool>[] = [
  {
    id: "record",
    label: "Record",
    hint: "Capture the screen, the camera, or both at once",
    icon: <RecordIcon size={19} />,
    controls: "clip-panel-record",
  },
  {
    id: "library",
    label: "Clips",
    hint: "This session's recordings — play, save, or pull a still",
    icon: <FilmIcon size={19} />,
    controls: "clip-panel-library",
  },
];

/**
 * Clip — screen and camera recording, with nothing uploaded.
 *
 * Video was the one medium the workspace had no app for: Voice Memos covers
 * audio, Image Studio and Scan cover stills, and Resource Monitor could tell
 * you something was recording your screen without being able to do it. This
 * closes that, and the reason it belongs here rather than as an extension is
 * the same reason as everything else in this workspace — a screen recording is
 * frequently the most sensitive file on a machine, and every hosted recorder
 * begins by uploading it.
 *
 * `MediaRecorder` does the encoding in the browser. Screen-plus-camera is
 * genuinely composited onto a canvas (see `RecordPanel`), so the result is one
 * video rather than two tracks half of which players ignore. Clips are held in
 * memory rather than stored, and the app says so plainly on the Clips tab.
 */
export function ClipApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useClipStore((s) => s.tool);
  const setTool = useClipStore((s) => s.setTool);
  const state = useClipStore((s) => s.state);
  const hydrate = useClipStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[820px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<RecordIcon size={24} />}
            name="Clip"
            tagline="record the screen, keep it on the device"
          />

          <div className="flex items-center gap-2">
            {state === "recording" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-danger px-3 py-2 font-mono text-[11px] uppercase tracking-[.1em] text-on-accent">
                <span className="size-2 rounded-full bg-on-accent" />
                Recording
              </span>
            )}
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
        </div>
      </header>

      <main className="bottom-nav-clear mx-auto w-full max-w-[820px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={CLIP_TOOLS} id={`clip-panel-${tool}`} role="tabpanel">
          {tool === "record" ? <RecordPanel /> : <LibraryPanel />}
        </NavView>
      </main>

      <BottomNav label="Clip tools" items={TABS} value={tool} onChange={setTool} maxWidth={280} />

      <AppFooter />
    </div>
  );
}
