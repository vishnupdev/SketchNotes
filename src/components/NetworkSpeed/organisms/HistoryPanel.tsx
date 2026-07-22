"use client";

import { useNetworkSpeedStore } from "@/store/useNetworkSpeedStore";
import {
  ClockIcon,
  DownloadSpeedIcon,
  LatencyIcon,
  TrashSmallIcon,
  UploadSpeedIcon,
} from "@/components/SketchNotes/atoms/icons";
import { formatMs, formatSpeed, speedUnit } from "@/lib/NetworkSpeed/format";
import { timeAgo } from "@/lib/utils";

/** Recent runs, newest first, persisted across sessions. */
export function HistoryPanel() {
  const history = useNetworkSpeedStore((s) => s.history);
  const clearHistory = useNetworkSpeedStore((s) => s.clearHistory);

  return (
    <div className="rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
            <ClockIcon size={17} />
          </span>
          <span className="text-[13px] font-bold tracking-[.1px]">Recent tests</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="tint inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-danger"
          >
            <TrashSmallIcon size={15} />
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-3 text-[12px] leading-snug text-ink-soft">
          No tests yet. Your last {10} runs will show up here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {history.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">
                {timeAgo(r.at)}
              </span>
              <span className="flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-accent">
                <DownloadSpeedIcon size={14} />
                {formatSpeed(r.download)}
                <span className="text-[10px] font-normal text-ink-soft">{speedUnit(r.download)}</span>
              </span>
              <span className="flex items-center gap-1 text-[12.5px] font-semibold tabular-nums text-success">
                <UploadSpeedIcon size={14} />
                {formatSpeed(r.upload)}
                <span className="text-[10px] font-normal text-ink-soft">{speedUnit(r.upload)}</span>
              </span>
              <span className="flex w-[64px] items-center justify-end gap-1 text-[12.5px] font-semibold tabular-nums text-ink-soft">
                <LatencyIcon size={14} />
                {formatMs(r.ping)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
