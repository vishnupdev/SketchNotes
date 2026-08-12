import { cx } from "@/lib/utils";
import type { GattReport } from "@/lib/nearby/gatt";
import { FieldRow } from "@/components/Nearby/atoms/FieldRow";

/**
 * What a GATT read found: the standard identity/telemetry values first, then
 * every primary service with its characteristics and what each one permits.
 *
 * A characteristic with no value shown is not a failure — most of them carry
 * device-specific binary payloads that only mean something to their own app, so
 * only the standard ones are decoded.
 */
export function GattTable({ report }: { report: GattReport }) {
  const characteristicCount = report.services.reduce(
    (n, s) => n + s.characteristics.length,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      {report.battery != null && (
        <div className="rounded-xl border border-border bg-panel px-3.5 py-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
              Battery
            </h4>
            <span className="text-[13px] font-bold tabular-nums">{report.battery}%</span>
          </div>
          <div
            role="meter"
            aria-label="Device battery level"
            aria-valuenow={report.battery}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-border"
          >
            <div
              style={{ width: `${Math.max(2, Math.min(100, report.battery))}%` }}
              className={cx(
                "h-full rounded-full",
                report.battery <= 15 ? "bg-danger" : report.battery <= 40 ? "bg-prio-med" : "bg-success",
              )}
            />
          </div>
        </div>
      )}

      {report.details.length > 0 && (
        <section className="rounded-xl border border-border bg-panel px-3.5 py-3">
          <h4 className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
            Device information
          </h4>
          <dl className="flex flex-col">
            {report.details.map((f) => (
              <FieldRow key={f.label} label={f.label} value={f.value} mono={f.mono} />
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-border bg-panel px-3.5 py-3">
        <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-accent">
          Services
          <span className="ml-1.5 tracking-normal text-ink-soft">
            {report.services.length} · {characteristicCount} characteristics
          </span>
        </h4>

        <ul className="flex flex-col gap-2.5">
          {report.services.map((service) => (
            <li key={service.uuid} className="rounded-lg border border-border bg-paper px-3 py-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[12.5px] font-semibold">{service.name}</span>
                <span className="font-mono text-[10.5px] text-ink-soft">{service.label}</span>
              </div>

              <ul className="mt-1.5 flex flex-col gap-1.5">
                {service.characteristics.map((c) => (
                  <li key={c.uuid} className="border-t border-border pt-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[12px] font-medium">{c.name}</span>
                      <span className="font-mono text-[10px] text-ink-soft">{c.label}</span>
                      {c.value && (
                        <span className="ml-auto font-mono text-[11px] font-semibold">
                          {c.value}
                        </span>
                      )}
                    </div>
                    {c.properties.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.properties.map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-accent-soft px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[.06em] text-accent"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
