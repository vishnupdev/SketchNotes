import { cx } from "@/lib/utils";
import { signalQuality } from "@/lib/nearby/inspect";

/** dBm → a 0–4 bar count. −55 or better is excellent, −85 is the noise floor. */
function bars(rssi: number): number {
  if (rssi >= -55) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -85) return 2;
  return 1;
}

/**
 * Advertised BLE signal strength as four rising bars plus the raw dBm.
 *
 * The number is kept next to the bars on purpose: dBm is the only part of this
 * that means anything precise, and the bars are a rough read of it, not a
 * distance measurement.
 */
export function SignalBars({ rssi, showValue = true }: { rssi: number; showValue?: boolean }) {
  const level = bars(rssi);
  const tone =
    level >= 3 ? "bg-success" : level === 2 ? "bg-prio-med" : "bg-prio-high";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Signal strength ${rssi} dBm — ${signalQuality(rssi)}`}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{ height: `${4 + i * 2.5}px` }}
            className={cx("w-[3px] rounded-sm", i <= level ? tone : "bg-border")}
          />
        ))}
      </span>
      {showValue && (
        <span className="text-[11px] font-semibold tabular-nums text-ink-soft">{rssi} dBm</span>
      )}
      <span className="sr-only">
        Signal {signalQuality(rssi)}, {rssi} dBm
      </span>
    </span>
  );
}
