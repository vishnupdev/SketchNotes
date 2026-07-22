"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useNetworkSpeedStore } from "@/store/useNetworkSpeedStore";
import { SpeedTestPanel } from "@/components/NetworkSpeed/organisms/SpeedTestPanel";
import { ResultMetrics } from "@/components/NetworkSpeed/molecules/ResultMetrics";
import { ConnectionCard } from "@/components/NetworkSpeed/molecules/ConnectionCard";
import { HistoryPanel } from "@/components/NetworkSpeed/organisms/HistoryPanel";
import { AppsIcon, GaugeIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Network Speed — measures download, upload, latency and jitter against
 * Cloudflare's public speed endpoints (no backend of ours required). Live
 * figures are driven by {@link useNetworkSpeedStore}; a run keeps going even if
 * the user switches apps, and the last runs persist to localStorage. Rendered
 * natively; theme comes from the shared <body>.
 */
export function NetworkSpeedApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const hydrate = useNetworkSpeedStore((s) => s.hydrate);
  const phase = useNetworkSpeedStore((s) => s.phase);
  const live = useNetworkSpeedStore((s) => s.live);
  const connection = useNetworkSpeedStore((s) => s.connection);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]">
              <GaugeIcon size={26} />
            </span>
            <div>
              <div className="text-[27px] font-extrabold leading-none tracking-tight">Network Speed</div>
              <div className="mt-1 font-serif text-[15px] italic text-ink-soft">
                download, upload, ping &amp; jitter
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

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-[80px] pt-[26px]">
        <div className="flex flex-col gap-6">
          <SpeedTestPanel />

          <ResultMetrics
            download={live.download}
            upload={live.upload}
            ping={live.ping}
            jitter={live.jitter}
            phase={phase}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ConnectionCard connection={connection} />
            <HistoryPanel />
          </div>

          <p className="text-center text-[11px] leading-relaxed text-ink-soft">
            Measured against Cloudflare&apos;s public speed servers. Results reflect your browser&apos;s
            throughput at test time and can vary with server load, Wi-Fi and background activity.
          </p>
        </div>
      </main>
    </div>
  );
}
