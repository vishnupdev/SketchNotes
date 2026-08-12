"use client";

import { cx } from "@/lib/utils";
import type { NearbySupport, PairableTransport } from "@/lib/nearby/discovery";
import { TRANSPORTS } from "@/components/Nearby/atoms/transportMeta";
import { EyeIcon, RadarIcon } from "@/components/SketchNotes/atoms/deviceIcons";
import { CheckIcon, CopyIcon, RefreshIcon } from "@/components/SketchNotes/atoms/icons";

/** The four transports that discover through a browser-owned device chooser. */
const PAIRABLE: PairableTransport[] = ["bluetooth", "usb", "hid", "serial"];

interface ScanPanelProps {
  support: NearbySupport;
  adapter: boolean | null;
  castAvailable: boolean | null;
  deviceCount: number;
  scanning: boolean;
  pending: PairableTransport[];
  leScanning: boolean;
  namesHidden: boolean;
  error: string | null;
  copied: boolean;
  onRescan: () => void;
  onPair: (transport: PairableTransport) => void;
  onToggleLeScan: () => void;
  onRevealNames: () => void;
  onCopy: () => void;
}

/** One headline number with its label. */
function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "off";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-border bg-paper px-3 py-2.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[.12em] text-ink-soft">
        {label}
      </span>
      <span
        className={cx(
          "wrap-break-word text-[13px] font-bold leading-tight",
          tone === "good" ? "text-success" : tone === "off" ? "text-ink-soft" : "text-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:text-text";

/**
 * The scan console: what the radios say, the buttons that open each transport's
 * chooser, the live BLE scan toggle, and the report actions.
 *
 * The copy about consent is not boilerplate — it is the model. A page cannot
 * enumerate the room; each button opens the *browser's* scanner, and only the
 * device a person picks becomes visible to this app. Saying so is the difference
 * between an empty list looking broken and looking correct.
 */
export function ScanPanel({
  support,
  adapter,
  castAvailable,
  deviceCount,
  scanning,
  pending,
  leScanning,
  namesHidden,
  error,
  copied,
  onRescan,
  onPair,
  onToggleLeScan,
  onRevealNames,
  onCopy,
}: ScanPanelProps) {
  const available = PAIRABLE.filter((t) => support[t]);
  const missing = PAIRABLE.filter((t) => !support[t]);

  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
          <RadarIcon size={18} className={scanning ? "motion-safe:animate-pulse" : undefined} />
        </span>
        <h2 className="text-[14px] font-bold tracking-tight">Scan</h2>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRescan}
            disabled={scanning}
            aria-label="Re-scan for nearby devices"
            className={chip}
          >
            <RefreshIcon size={14} className={scanning ? "motion-safe:animate-spin" : undefined} />
            {scanning ? "Scanning…" : "Re-scan"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy the device report to the clipboard"
            className={chip}
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 min-[620px]:grid-cols-3">
        <StatTile
          label="Bluetooth radio"
          value={
            !support.bluetooth
              ? "Not supported"
              : adapter === true
                ? "Available"
                : adapter === false
                  ? "Off or absent"
                  : "Unknown"
          }
          tone={adapter === true ? "good" : adapter === false || !support.bluetooth ? "off" : "neutral"}
        />
        <StatTile
          label="Cast displays"
          value={
            !support.cast
              ? "Not supported"
              : castAvailable === true
                ? "On this network"
                : castAvailable === false
                  ? "None found"
                  : "Checking…"
          }
          tone={castAvailable === true ? "good" : "off"}
        />
        <StatTile label="Devices detected" value={String(deviceCount)} />
      </div>

      {available.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-ink-soft">
            Open the browser&apos;s scanner
          </span>
          <div className="flex flex-wrap gap-2">
            {available.map((id) => {
              const meta = TRANSPORTS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onPair(id)}
                  disabled={pending.includes(id)}
                  aria-label={`Scan for ${meta.long} devices`}
                  className={chip}
                >
                  <meta.Icon size={14} />
                  {pending.includes(id) ? "Choosing…" : meta.long}
                </button>
              );
            })}
            {namesHidden && (
              <button
                type="button"
                onClick={onRevealNames}
                aria-label="Grant camera and microphone access to reveal device names"
                className={chip}
              >
                <EyeIcon size={14} />
                Reveal names
              </button>
            )}
          </div>
        </div>
      )}

      {support.leScan && (
        <button
          type="button"
          onClick={onToggleLeScan}
          className={cx(
            "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white hover:brightness-110",
            leScanning ? "bg-danger" : "bg-accent",
          )}
        >
          {leScanning ? (
            <>
              <span className="size-2 rounded-full bg-white motion-safe:animate-pulse" />
              Stop live BLE scan
            </>
          ) : (
            <>
              <RadarIcon size={15} />
              Start live BLE scan
            </>
          )}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-[12px] font-medium text-danger">
          {error}
        </p>
      )}

      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Browsers don&apos;t let a page sweep the airwaves on its own. Each button opens the
        browser&apos;s own scanner, which lists what&apos;s in range — the device you pick then
        stays here, with its full descriptor, for the rest of the session. Attached audio, video and
        controller hardware is listed without any prompt.
        {missing.length > 0 &&
          ` Not available in this browser: ${missing.map((t) => TRANSPORTS[t].api).join(", ")}.`}
      </p>
    </section>
  );
}
