"use client";

import { cx } from "@/lib/utils";
import type { NearbyDevice } from "@/lib/nearby/discovery";
import { BAUD_RATES, type DeviceLink } from "@/lib/nearby/connect";
import { TRANSPORTS } from "@/components/Nearby/atoms/transportMeta";
import { LinkDeviceIcon } from "@/components/SketchNotes/atoms/deviceIcons";
import { CloseIcon } from "@/components/SketchNotes/atoms/icons";

/** How long the link has been up, at the coarsest useful unit. */
function elapsed(since: number, now: number): string {
  const total = Math.max(0, Math.round((now - since) / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

interface ConnectRowProps {
  device: NearbyDevice;
  link: DeviceLink;
  /** Ticking clock, supplied by the panel so one timer serves every row. */
  now: number;
  baudRate: number;
  onBaudRate: (rate: number) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * One connectable device: what it is, whether the link is up, and the single
 * button that opens or closes it.
 *
 * The row stacks below 420px so the action never has to share a line with a
 * truncated device name — on a phone this is the primary control, not an
 * afterthought squeezed against the edge.
 */
export function ConnectRow({
  device,
  link,
  now,
  baudRate,
  onBaudRate,
  onConnect,
  onDisconnect,
}: ConnectRowProps) {
  const meta = TRANSPORTS[device.transport];
  const connected = link.state === "connected";
  const busy = link.state === "connecting" || link.state === "disconnecting";
  const isSerial = device.transport === "serial";

  const status = connected
    ? "Connected"
    : link.state === "connecting"
      ? "Connecting…"
      : link.state === "disconnecting"
        ? "Closing…"
        : "Available";

  return (
    <li
      className={cx(
        "flex flex-col gap-2.5 rounded-xl border bg-paper p-3 transition-colors",
        connected ? "border-success/50" : "border-border",
      )}
    >
      <div className="flex flex-col gap-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cx(
              "grid size-9 flex-none place-items-center rounded-lg",
              connected ? "bg-success text-on-accent" : "bg-accent-soft text-accent",
            )}
          >
            <meta.Icon size={17} />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="min-w-0 truncate text-[13.5px] font-semibold">{device.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="rounded-full border border-border px-1.5 font-mono text-[9.5px] uppercase tracking-[.08em] text-ink-soft">
                {meta.label}
              </span>
              <span
                className={cx(
                  "inline-flex items-center gap-1 text-[11px] font-semibold",
                  connected ? "text-success" : busy ? "text-accent" : "text-ink-soft",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "size-1.5 rounded-full",
                    connected
                      ? "bg-success"
                      : busy
                        ? "bg-accent motion-safe:animate-pulse"
                        : "bg-border",
                  )}
                />
                {status}
                {connected && link.since != null && ` · ${elapsed(link.since, now)}`}
              </span>
            </span>
          </span>
        </div>

        {/* A port's line speed has to be settled before it opens, and can't be
            changed underneath a live link — so the control is only offered while
            the port is closed. */}
        {isSerial && !connected && (
          <div className="flex items-center gap-1.5 min-[420px]:flex-none">
            <label
              htmlFor={`baud-${device.key}`}
              className="font-mono text-[9.5px] uppercase tracking-[.1em] text-ink-soft"
            >
              Baud
            </label>
            <select
              id={`baud-${device.key}`}
              value={baudRate}
              disabled={busy}
              onChange={(e) => onBaudRate(Number(e.target.value))}
              className="rounded-lg border border-border bg-panel px-2 py-1.5 text-[12px] font-semibold tabular-nums hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-55"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={connected ? onDisconnect : onConnect}
          disabled={busy}
          aria-label={`${connected ? "Disconnect from" : "Connect to"} ${device.name}`}
          className={cx(
            "inline-flex w-full flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-55",
            "min-[420px]:w-auto",
            connected
              ? "border border-border bg-panel hover:border-danger hover:text-danger"
              : "bg-accent text-on-accent hover:brightness-110",
          )}
        >
          {connected ? <CloseIcon size={14} /> : <LinkDeviceIcon size={14} />}
          {link.state === "connecting"
            ? "Connecting…"
            : link.state === "disconnecting"
              ? "Closing…"
              : connected
                ? "Disconnect"
                : "Connect"}
        </button>
      </div>

      {connected && link.info && (
        <p className="font-mono text-[10.5px] text-ink-soft">{link.info}</p>
      )}

      {link.error && (
        <p
          role="alert"
          className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11.5px] font-medium leading-relaxed text-danger"
        >
          {link.error}
        </p>
      )}
    </li>
  );
}
