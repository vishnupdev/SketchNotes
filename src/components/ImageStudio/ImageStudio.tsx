"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { ImageEditor } from "@/components/ImageStudio/ImageEditor";

/** Image Studio — crop, resize, compress & convert images to fit upload
 *  requirements. Rendered natively; theme comes from the shared <body>. */
export function ImageStudio() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
                <circle cx="8.5" cy="9.5" r="1.6" />
                <path d="M4 17l4.5-4.5a2 2 0 0 1 2.8 0L17 18" />
                <path d="M14 15l2-2a2 2 0 0 1 2.8 0L20.5 15" />
              </svg>
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">Image Studio</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                resize, crop &amp; compress for any upload
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openLauncher}
              title="Switch app"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="7" height="7" rx="1.6" />
                <rect x="13" y="4" width="7" height="7" rx="1.6" />
                <rect x="4" y="13" width="7" height="7" rx="1.6" />
                <rect x="13" y="13" width="7" height="7" rx="1.6" />
              </svg>
              Apps
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-[7px] font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
              <span className="size-[7px] rounded-full bg-[#57c98d]" />
              100% local · files never leave this device
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-[70px] pt-[26px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[.16em] text-ink-soft">
          Fit an image to size, ratio or file-size limits
        </p>
        <ImageEditor />
      </main>

      <footer className="border-t border-border px-5 py-[22px] text-center font-mono text-[10.5px] tracking-[.1em] text-ink-soft">
        <div className="font-serif text-[14.5px] not-italic tracking-normal">
          Crafted by <b className="font-semibold text-accent">Vishnu P</b> ·{" "}
          <a href="tel:7510334431" className="font-mono text-accent no-underline hover:underline">
            ☎ 7510334431
          </a>
        </div>
      </footer>
    </div>
  );
}
