"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useScanStore } from "@/store/useScanStore";
import { buildScanPdf, downloadPdf, PAGE_SIZES, scanFilename } from "@/lib/Scan/pdf";
import { Capture } from "@/components/Scan/organisms/Capture";
import { CropEditor } from "@/components/Scan/organisms/CropEditor";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import {
  AppsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PenIcon,
  ScanDocIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/**
 * Scan — a photograph of a page, turned into a PDF.
 *
 * The step that makes it a scanner rather than a camera roll is the perspective
 * correction: you mark the page's four corners and the page is *flattened*, not
 * merely cropped. See `lib/Scan/warp.ts` for why that needs a homography and why
 * cropping alone never looks right.
 *
 * It reuses what the workspace already has rather than adding anything: `pdf-lib`
 * from the PDF editor's stack for the output, a canvas for the pixels, and the
 * camera. Nothing is uploaded — which for the documents people actually scan (IDs,
 * payslips, signed forms) is the entire reason to use this instead of a website
 * with an upload box.
 */
export function ScanApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const pages = useScanStore((s) => s.pages);
  const editingId = useScanStore((s) => s.editingId);
  const edit = useScanStore((s) => s.edit);
  const remove = useScanStore((s) => s.remove);
  const move = useScanStore((s) => s.move);
  const pageSize = useScanStore((s) => s.pageSize);
  const setPageSize = useScanStore((s) => s.setPageSize);
  const title = useScanStore((s) => s.title);
  const setTitle = useScanStore((s) => s.setTitle);
  const clear = useScanStore((s) => s.clear);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = editingId ? pages.find((p) => p.id === editingId) : undefined;
  // Only fully-processed pages can be exported — an unprocessed one has no image.
  const ready = pages.filter((p) => p.processed !== null);
  const pending = pages.length - ready.length;

  const exportPdf = async () => {
    if (ready.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const bytes = await buildScanPdf(
        ready.map((p) => ({ dataUrl: p.processed! })),
        pageSize,
        title,
      );
      downloadPdf(bytes, scanFilename(title));
    } catch {
      setError("The PDF could not be built.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<ScanDocIcon size={24} />}
            name="Scan"
            tagline="a photo of a page, turned into a PDF"
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

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-6 pt-[22px]">
        <NavView
          viewKey={editing ? "editor" : "pages"}
          motion={editing ? "deeper" : "shallower"}
        >
          {editing ? (
            <CropEditor page={editing} />
          ) : (
            <div className="flex flex-col gap-4">
              <Capture />

              {pages.length > 0 && (
                <>
                  <section aria-labelledby="scan-pages" className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2
                        id="scan-pages"
                        className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                      >
                        {pages.length} {pages.length === 1 ? "page" : "pages"}
                        {pending > 0 && ` · ${pending} still processing`}
                      </h2>
                      <button
                        type="button"
                        onClick={clear}
                        className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft hover:text-danger"
                      >
                        Start over
                      </button>
                    </div>

                    <ol className="grid grid-cols-2 gap-2 min-[600px]:grid-cols-3 min-[820px]:grid-cols-4">
                      {pages.map((page, i) => (
                        <li
                          key={page.id}
                          className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-panel"
                        >
                          <button
                            type="button"
                            onClick={() => edit(page.id)}
                            aria-label={`Edit page ${i + 1}`}
                            className="relative block aspect-[3/4] w-full bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {page.processed ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={page.processed}
                                alt={`Page ${i + 1}`}
                                className="size-full object-contain"
                              />
                            ) : (
                              <span className="grid size-full place-items-center px-2 text-center text-[11px] text-ink-soft">
                                Processing…
                              </span>
                            )}
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-paper/90 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums">
                              {i + 1}
                            </span>
                          </button>

                          <div className="flex items-center gap-0.5 border-t border-border px-1 py-1">
                            <button
                              type="button"
                              onClick={() => move(page.id, -1)}
                              disabled={i === 0}
                              aria-label={`Move page ${i + 1} earlier`}
                              className="tint grid size-7 place-items-center rounded text-ink-soft hover:text-accent disabled:opacity-30"
                            >
                              <ChevronLeftIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => move(page.id, 1)}
                              disabled={i === pages.length - 1}
                              aria-label={`Move page ${i + 1} later`}
                              className="tint grid size-7 place-items-center rounded text-ink-soft hover:text-accent disabled:opacity-30"
                            >
                              <ChevronRightIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => edit(page.id)}
                              aria-label={`Edit page ${i + 1}`}
                              className="tint ml-auto grid size-7 place-items-center rounded text-ink-soft hover:text-accent"
                            >
                              <PenIcon size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(page.id)}
                              aria-label={`Delete page ${i + 1}`}
                              className="tint grid size-7 place-items-center rounded text-ink-soft hover:text-danger"
                            >
                              <TrashSmallIcon size={13} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section
                    aria-labelledby="scan-export"
                    className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-panel p-3"
                  >
                    <h2
                      id="scan-export"
                      className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                    >
                      Save as PDF
                    </h2>

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[160px] flex-1">
                        <label
                          htmlFor="scan-title"
                          className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft"
                        >
                          Name
                        </label>
                        <input
                          id="scan-title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Scan"
                          className="mt-0.5 w-full rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 text-[13px] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                        />
                      </div>
                      <div className="flex-none">
                        <label
                          htmlFor="scan-size"
                          className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft"
                        >
                          Page size
                        </label>
                        <select
                          id="scan-size"
                          value={pageSize}
                          onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
                          className="mt-0.5 block rounded-[10px] border-[1.5px] border-border bg-paper px-2 py-2 text-[12.5px] font-semibold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {PAGE_SIZES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => void exportPdf()}
                        disabled={ready.length === 0 || exporting}
                        className={cx(
                          "tint inline-flex flex-none items-center gap-2 rounded-[12px] bg-accent px-4 py-3 text-[13px] font-bold text-on-accent hover:opacity-90 disabled:opacity-40",
                        )}
                      >
                        <DownloadIcon size={16} />
                        {exporting ? "Building…" : `PDF · ${ready.length}`}
                      </button>
                    </div>

                    <p className="text-[11.5px] leading-snug text-ink-soft">
                      {PAGE_SIZES.find((s) => s.id === pageSize)?.hint}. Built in this browser —
                      the pages are never uploaded.
                    </p>

                    {error && (
                      <p role="alert" className="text-[12.5px] text-danger">
                        {error}
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </NavView>
      </main>

      <AppFooter />
    </div>
  );
}
