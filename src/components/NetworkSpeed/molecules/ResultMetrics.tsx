import { MetricTile } from "@/components/NetworkSpeed/atoms/MetricTile";
import {
  DownloadSpeedIcon,
  LatencyIcon,
  RepeatIcon,
  UploadSpeedIcon,
} from "@/components/SketchNotes/atoms/icons";
import { formatMs, formatSpeed, pingGrade, speedGrade, speedUnit } from "@/lib/NetworkSpeed/format";
import type { TestPhase } from "@/lib/NetworkSpeed/types";

interface ResultMetricsProps {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  /** Which phase is live, so its tile can be highlighted. */
  phase: TestPhase;
}

/** The four-up grid of final/live figures: download, upload, ping, jitter. */
export function ResultMetrics({ download, upload, ping, jitter, phase }: ResultMetricsProps) {
  const dl = speedGrade(download);
  const ul = speedGrade(upload);
  const pg = pingGrade(ping);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricTile
        icon={<DownloadSpeedIcon size={16} />}
        label="Download"
        value={formatSpeed(download)}
        unit={speedUnit(download)}
        caption={dl.label}
        tone={dl.tone}
        active={phase === "download"}
      />
      <MetricTile
        icon={<UploadSpeedIcon size={16} />}
        label="Upload"
        value={formatSpeed(upload)}
        unit={speedUnit(upload)}
        caption={ul.label}
        tone={ul.tone}
        active={phase === "upload"}
      />
      <MetricTile
        icon={<LatencyIcon size={16} />}
        label="Ping"
        value={ping > 0 ? formatMs(ping).replace(/\s?ms$/, "") : "—"}
        unit={ping > 0 && ping < 1000 ? "ms" : undefined}
        caption={pg.label}
        tone={pg.tone}
        active={phase === "ping"}
      />
      <MetricTile
        icon={<RepeatIcon size={16} />}
        label="Jitter"
        value={jitter > 0 ? formatMs(jitter).replace(/\s?ms$/, "") : "—"}
        unit={jitter > 0 && jitter < 1000 ? "ms" : undefined}
        tone="text-ink-soft"
        active={phase === "ping"}
      />
    </div>
  );
}
