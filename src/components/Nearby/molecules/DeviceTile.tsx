"use client";

import { cx } from "@/lib/utils";
import type { NearbyDevice } from "@/lib/nearby/discovery";
import { SignalBars } from "@/components/Nearby/atoms/SignalBars";
import { TRANSPORTS } from "@/components/Nearby/atoms/transportMeta";

/**
 * One device in the list: transport glyph, name, its own summary line, link
 * state and — for anything seen by the live BLE scan — signal strength.
 *
 * The whole row is the button that opens the spec sheet, so the touch target is
 * the full width of the list on a phone.
 */
export function DeviceTile({
  device,
  selected,
  onSelect,
}: {
  device: NearbyDevice;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = TRANSPORTS[device.transport];
  const specCount = device.spec?.reduce((n, g) => n + g.fields.length, 0) ?? 0;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cx(
          "flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          selected
            ? "border-accent bg-accent-soft"
            : "border-transparent hover:border-border hover:bg-panel",
        )}
      >
        <span
          className={cx(
            "grid size-9 flex-none place-items-center rounded-lg",
            selected ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
          )}
        >
          <meta.Icon size={17} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate text-[13.5px] font-semibold">{device.name}</span>
            {device.connected && (
              <span
                className="size-2 flex-none rounded-full bg-success"
                role="img"
                aria-label="Connected"
              />
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="rounded-full border border-border px-1.5 font-mono text-[9.5px] uppercase tracking-[.08em] text-ink-soft">
              {meta.label}
            </span>
            {device.detail && (
              <span className="min-w-0 truncate font-mono text-[10.5px] text-ink-soft">
                {device.detail}
              </span>
            )}
          </span>
        </span>

        {device.rssi != null ? (
          <SignalBars rssi={device.rssi} showValue={false} />
        ) : (
          specCount > 0 && (
            <span className="flex-none text-[10.5px] font-semibold tabular-nums text-ink-soft">
              {specCount} facts
            </span>
          )
        )}
      </button>
    </li>
  );
}
