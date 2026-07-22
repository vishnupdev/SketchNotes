"use client";

import { useNetworkSpeedStore } from "@/store/useNetworkSpeedStore";
import { SpeedGauge } from "@/components/NetworkSpeed/atoms/SpeedGauge";
import { ResultMetrics } from "@/components/NetworkSpeed/molecules/ResultMetrics";
import {
  formatMs,
  formatSpeed,
  speedToFraction,
  speedUnit,
} from "@/lib/NetworkSpeed/format";
import type { TestPhase, TestStatus } from "@/lib/NetworkSpeed/types";
import { cx } from "@/lib/utils";

const PHASE_LABEL: Record<TestPhase, string> = {
  idle: "Ready",
  ping: "Measuring latency",
  download: "Measuring download",
  upload: "Measuring upload",
  done: "Test complete",
};

/** Decide what the central gauge shows for the current phase. */
function gaugeFor(
  status: TestStatus,
  phase: TestPhase,
  live: { ping: number; download: number; upload: number },
) {
  if (phase === "upload") {
    return {
      fraction: speedToFraction(live.upload),
      value: formatSpeed(live.upload),
      unit: speedUnit(live.upload),
      caption: "Upload",
      tone: "stroke-success",
      textTone: "text-success",
    };
  }
  if (phase === "ping") {
    return {
      fraction: Math.min(1, live.ping > 0 ? 0.12 : 0.04),
      value: live.ping > 0 ? formatMs(live.ping).replace(/\s?ms$/, "") : "…",
      unit: live.ping > 0 ? "ms" : "",
      caption: "Ping",
      tone: "stroke-accent",
      textTone: "text-accent",
    };
  }
  // download phase, done, idle, error → show download (primary metric)
  return {
    fraction: speedToFraction(live.download),
    value: status === "idle" ? "0" : formatSpeed(live.download),
    unit: speedUnit(live.download),
    caption: "Download",
    tone: "stroke-accent",
    textTone: "text-accent",
  };
}

/** Central dial + primary control, driven entirely by the store. */
export function SpeedTestPanel() {
  const status = useNetworkSpeedStore((s) => s.status);
  const phase = useNetworkSpeedStore((s) => s.phase);
  const live = useNetworkSpeedStore((s) => s.live);
  const progress = useNetworkSpeedStore((s) => s.progress);
  const error = useNetworkSpeedStore((s) => s.error);
  const start = useNetworkSpeedStore((s) => s.start);
  const cancel = useNetworkSpeedStore((s) => s.cancel);

  const running = status === "running";
  const g = gaugeFor(status, phase, live);

  const statusLine = running
    ? PHASE_LABEL[phase]
    : status === "done"
      ? "Test complete"
      : status === "error"
        ? "Test failed"
        : "Ready when you are";

  return (
    <section className="flex flex-col items-center gap-5">
      <div className="relative">
        <SpeedGauge
          fraction={g.fraction}
          tone={g.tone}
          active={running && (phase === "download" || phase === "upload")}
          size={260}
        >
          <div className="flex flex-col items-center text-center">
            <span className={cx("text-[46px] font-extrabold leading-none tracking-tight tabular-nums", g.textTone)}>
              {g.value}
            </span>
            {g.unit && (
              <span className="mt-1 text-[13px] font-bold uppercase tracking-[.14em] text-ink-soft">
                {g.unit}
              </span>
            )}
            <span className="mt-2 text-[11px] font-semibold uppercase tracking-[.16em] text-ink-soft">
              {g.caption}
            </span>
          </div>
        </SpeedGauge>
      </div>

      {/* Phase progress bar (download/upload). */}
      <div className="h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-border">
        <div
          className={cx(
            "h-full rounded-full bg-accent transition-[width] duration-300 ease-out",
            running ? "opacity-100" : "opacity-0",
          )}
          style={{ width: `${Math.round((running ? progress : 0) * 100)}%` }}
        />
      </div>

      <div className="flex min-h-[20px] items-center gap-2 text-[13px] font-semibold text-ink-soft">
        {running && (
          <span className="inline-block size-2 animate-pulse rounded-full bg-accent" aria-hidden />
        )}
        <span aria-live="polite">{statusLine}</span>
      </div>

      {error && (
        <p className="max-w-[420px] rounded-xl border border-border bg-panel px-4 py-2.5 text-center text-[12.5px] leading-snug text-prio-high">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={running ? cancel : start}
        className={cx(
          "min-w-[168px] rounded-full px-7 py-3 text-[14px] font-bold tracking-[.2px] transition-all active:scale-[.98]",
          running
            ? "border border-border bg-panel text-ink-soft hover:border-danger hover:text-danger"
            : "bg-accent text-white shadow-panel hover:brightness-110",
        )}
      >
        {running ? "Stop" : status === "idle" ? "Start test" : "Test again"}
      </button>
    </section>
  );
}
