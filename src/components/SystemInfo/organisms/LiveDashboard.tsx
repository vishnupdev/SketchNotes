"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { formatBytes, formatSeconds } from "@/lib/SystemInfo/format";
import { useLiveSystemStats } from "@/hooks/useLiveSystemStats";
import { useDeviceIp } from "@/hooks/useDeviceIp";
import { Meter, toneForUsage } from "@/components/SystemInfo/molecules/Meter";
import {
  BatteryIcon,
  CheckMiniIcon,
  CopyIcon,
  GaugeIcon,
  GlobeIcon,
  PulseIcon,
  WifiIcon,
} from "@/components/SystemInfo/atoms/liveIcons";

/* --------------------------- shared card shell ---------------------------- */

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
        <h3 className="text-[14px] font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/** One-line copyable value with a transient "copied" tick. */
function CopyValue({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-paper px-2.5 py-1.5">
      <code className="min-w-0 truncate font-mono text-[13px] font-semibold">{text}</code>
      <button
        type="button"
        aria-label={`Copy ${text}`}
        onClick={copy}
        className="tint grid size-7 flex-none place-items-center rounded-md text-ink-soft hover:text-accent"
      >
        {copied ? <CheckMiniIcon size={15} className="text-success" /> : <CopyIcon size={15} />}
      </button>
    </div>
  );
}

const label = "text-[12px] font-medium text-ink-soft";

/* ------------------------------- dashboard -------------------------------- */

/** Live, self-updating device panels: performance, health and network/IP. */
export function LiveDashboard() {
  const { perf, heapSupported, battery, batterySupported, storage, net } = useLiveSystemStats();
  const ip = useDeviceIp();

  const heapPct =
    perf.heapUsed != null && perf.heapLimit ? (perf.heapUsed / perf.heapLimit) * 100 : null;
  const storagePct = storage ? (storage.usage / storage.quota) * 100 : null;
  const batteryPct = battery ? battery.level * 100 : null;

  // FPS tone (higher is better, so invert the usage scale).
  const fpsTone = perf.fps >= 50 ? "success" : perf.fps >= 30 ? "warn" : "danger";

  // Overall health verdict from the worst of the tracked signals.
  const concerns: ("warn" | "danger")[] = [];
  if (!net.online) concerns.push("warn");
  if (batteryPct != null && !battery?.charging) {
    if (batteryPct < 15) concerns.push("danger");
    else if (batteryPct < 30) concerns.push("warn");
  }
  if (storagePct != null && storagePct >= 90) concerns.push("danger");
  else if (storagePct != null && storagePct >= 75) concerns.push("warn");
  if (heapPct != null && heapPct >= 90) concerns.push("danger");
  else if (heapPct != null && heapPct >= 75) concerns.push("warn");
  const verdict = concerns.includes("danger")
    ? { text: "Needs attention", cls: "bg-danger/15 text-danger" }
    : concerns.includes("warn")
      ? { text: "Fair", cls: "bg-prio-med/15 text-prio-med" }
      : { text: "Healthy", cls: "bg-success/15 text-success" };

  return (
    <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[1040px]:grid-cols-3">
      {/* ---------------------------- Performance --------------------------- */}
      <Card icon={<GaugeIcon size={18} />} title="Performance">
        <div className="flex items-end gap-3">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cx(
                "text-[38px] font-extrabold leading-none tabular-nums",
                fpsTone === "success" ? "text-success" : fpsTone === "warn" ? "text-prio-med" : "text-danger",
              )}
            >
              {perf.fps}
            </span>
            <span className="text-[13px] font-semibold text-ink-soft">FPS</span>
          </div>
          <span className="mb-0.5 inline-flex items-center gap-1 text-[11.5px] text-ink-soft">
            <PulseIcon size={13} /> {perf.frameMs}ms / frame
          </span>
        </div>

        <Meter
          label="Frame rate"
          value={`${perf.fps} fps`}
          pct={Math.min(100, (perf.fps / 60) * 100)}
          tone={fpsTone}
        />

        {heapSupported && heapPct != null ? (
          <Meter
            label="JS heap in use"
            value={`${formatBytes(perf.heapUsed ?? 0)} / ${formatBytes(perf.heapLimit ?? 0)}`}
            pct={heapPct}
            tone={toneForUsage(heapPct)}
          />
        ) : (
          <p className="text-[11.5px] text-ink-soft">Memory profiling isn&apos;t exposed by this browser.</p>
        )}

        <div className="flex items-baseline justify-between">
          <span className={label}>Session uptime</span>
          <span className="text-[12.5px] font-semibold tabular-nums">
            {formatSeconds(perf.uptimeMs / 1000)}
          </span>
        </div>
      </Card>

      {/* ------------------------------ Health ------------------------------ */}
      <Card icon={<BatteryIcon size={18} />} title="Device health">
        <div className="flex items-center justify-between">
          <span className={label}>Overall</span>
          <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", verdict.cls)}>
            {verdict.text}
          </span>
        </div>

        {batterySupported && batteryPct != null ? (
          <Meter
            label={battery?.charging ? "Battery (charging)" : "Battery"}
            value={`${Math.round(batteryPct)}%`}
            pct={batteryPct}
            tone={battery?.charging || batteryPct >= 30 ? "success" : batteryPct >= 15 ? "warn" : "danger"}
          />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className={label}>Battery</span>
            <span className="text-[12.5px] font-semibold text-ink-soft">Not available</span>
          </div>
        )}

        {storagePct != null && storage ? (
          <Meter
            label="Storage used"
            value={`${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}`}
            pct={storagePct}
            tone={toneForUsage(storagePct)}
          />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className={label}>Storage</span>
            <span className="text-[12.5px] font-semibold text-ink-soft">Not available</span>
          </div>
        )}

        {heapSupported && heapPct != null && (
          <Meter
            label="Memory pressure"
            value={`${Math.round(heapPct)}%`}
            pct={heapPct}
            tone={toneForUsage(heapPct)}
          />
        )}
      </Card>

      {/* --------------------------- Network / IP --------------------------- */}
      <Card icon={<WifiIcon size={18} />} title="Network & IP">
        <div className="flex items-center gap-2">
          <span className={cx("size-2.5 rounded-full", net.online ? "bg-success" : "bg-danger")} />
          <span className="text-[13px] font-semibold">{net.online ? "Online" : "Offline"}</span>
          {net.effectiveType && (
            <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
              {net.effectiveType.toUpperCase()}
            </span>
          )}
        </div>

        {(net.downlink != null || net.rtt != null) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
            {net.downlink != null && <span>↓ {net.downlink} Mbps</span>}
            {net.rtt != null && <span>{net.rtt} ms RTT</span>}
            {net.saveData && <span>Data saver on</span>}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={label}>Local IP address</span>
          {ip.localLoading ? (
            <p className="text-[12.5px] text-ink-soft">Detecting…</p>
          ) : ip.local && ip.local.ips.length > 0 ? (
            ip.local.ips.map((addr) => <CopyValue key={addr} text={addr} />)
          ) : ip.local?.mdnsHidden ? (
            <p className="text-[12px] text-ink-soft">Hidden by the browser (mDNS privacy).</p>
          ) : (
            <p className="text-[12px] text-ink-soft">Unavailable in this browser.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>Public IP address</span>
          {ip.pub ? (
            <>
              <CopyValue text={ip.pub.ip} />
              <span className="text-[10.5px] text-ink-soft">via {ip.pub.source}</span>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={ip.lookupPublic}
                disabled={ip.pubLoading}
                className="self-start rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {ip.pubLoading ? "Looking up…" : "Look up public IP"}
              </button>
              <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-soft">
                <GlobeIcon size={12} />
                {ip.pubError ? "Lookup failed — try again." : "Contacts api.ipify.org (external request)."}
              </span>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
