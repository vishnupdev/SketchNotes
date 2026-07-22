"use client";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import { ReportView } from "@/components/SystemInfo/organisms/ReportView";
import { LiveDashboard } from "@/components/SystemInfo/organisms/LiveDashboard";
import { AppsIcon, ChipIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * System Info — analyzes the running device & browser and lists a complete,
 * structured spec report: OS, processor, memory, graphics, display, battery,
 * network, storage, locale and the full web-capability matrix. Data is gathered
 * client-side via {@link useSystemInfo}; "Re-scan" refetches. Rendered natively;
 * theme comes from the shared <body>.
 */
export function SystemInfoApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const { data: report, isLoading, isError, isFetching, refetch } = useSystemInfo();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[980px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <ChipIcon size={26} />
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">System Info</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                analyze this device &amp; browser
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-accent">by Vishnu P</div>
            </div>
          </div>

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

      <main className="mx-auto w-full max-w-[980px] flex-1 px-5 pb-[80px] pt-[22px]">
        {/* Live status — device health, performance & network/IP, always shown
            and self-updating, independent of the one-shot report scan below. */}
        <section className="mb-6 flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-bold uppercase tracking-wider text-ink-soft">
            Live status
          </h2>
          <LiveDashboard />
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <ChipIcon size={34} className="animate-pulse text-accent" />
            <p className="text-[13.5px] text-ink-soft">Analyzing your system…</p>
          </div>
        ) : isError || !report ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-[14px] font-semibold">Couldn&apos;t complete the scan.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-white hover:brightness-110"
            >
              Try again
            </button>
          </div>
        ) : (
          <ReportView report={report} fetching={isFetching} onRescan={() => refetch()} />
        )}
      </main>
    </div>
  );
}
