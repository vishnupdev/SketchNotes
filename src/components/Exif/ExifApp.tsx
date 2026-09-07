"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { EXIF_TOOLS, useExifStore, type ExifTool } from "@/store/useExifStore";
import { ReadPanel } from "@/components/Exif/organisms/ReadPanel";
import { CleanPanel } from "@/components/Exif/organisms/CleanPanel";
import { BatchPanel } from "@/components/Exif/organisms/BatchPanel";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { BottomNav, type BottomNavItem } from "@/components/SketchNotes/molecules/BottomNav";
import {
  AppsIcon,
  BroomIcon,
  EyeIcon,
  LayersIcon,
  TagIcon,
} from "@/components/SketchNotes/atoms/icons";

const TABS: BottomNavItem<ExifTool>[] = [
  {
    id: "read",
    label: "Read",
    hint: "Everything the file says about itself",
    icon: <EyeIcon size={19} />,
    controls: "exif-panel-read",
  },
  {
    id: "clean",
    label: "Clean",
    hint: "Take the metadata out without re-encoding the picture",
    icon: <BroomIcon size={19} />,
    controls: "exif-panel-clean",
  },
  {
    id: "batch",
    label: "Batch",
    hint: "Clean a whole folder's worth at once, out as a zip",
    icon: <LayersIcon size={19} />,
    controls: "exif-panel-batch",
  },
];

/**
 * Exif — what your pictures are telling people, and how to stop them.
 *
 * A phone writes the camera, the lens, the exposure, the software, the time to
 * the second and, very often, the coordinates to a few metres. Most people have
 * never seen it, and the ones who go looking find tools that either upload the
 * file to a server or "strip" it by redrawing the photo through a canvas —
 * which does remove the metadata, along with a generation of JPEG quality and
 * the colour profile.
 *
 * This does neither. The parser (`lib/Exif/tiff.ts`) reads the embedded TIFF
 * block on the device; the cleaner (`lib/Exif/containers.ts`) drops the
 * metadata *segments* and copies every other byte through, so the picture that
 * comes out is bit-identical to the one that went in. Nothing is uploaded and
 * nothing is stored — the file lives in memory while it is on screen and is
 * gone when you close it, which for a photo carrying your address is the only
 * defensible behaviour.
 */
export function ExifApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const tool = useExifStore((s) => s.tool);
  const setTool = useExifStore((s) => s.setTool);
  const close = useExifStore((s) => s.close);
  const clearBatch = useExifStore((s) => s.clearBatch);

  // Leaving the app drops the picture, revokes its preview URL and empties the
  // batch queue. A photo whose location you just looked at should not still be
  // in memory when somebody else opens the tab — and a queue of sixty cleaned
  // files is real memory as well. The Read panel's own Close button clears only
  // the open picture, so it leaves a batch in progress alone.
  useEffect(
    () => () => {
      close();
      clearBatch();
    },
    [clearBatch, close],
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<TagIcon size={24} />}
            name="Exif"
            tagline="what your pictures are telling people"
            onLeave={close}
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

      <main className="bottom-nav-clear mx-auto w-full max-w-[760px] flex-1 px-5 pt-[22px]">
        <NavView viewKey={tool} order={EXIF_TOOLS} id={`exif-panel-${tool}`} role="tabpanel">
          {tool === "read" ? <ReadPanel /> : tool === "clean" ? <CleanPanel /> : <BatchPanel />}
        </NavView>
      </main>

      <BottomNav label="Exif tools" items={TABS} value={tool} onChange={setTool} maxWidth={360} />

      <AppFooter />
    </div>
  );
}
