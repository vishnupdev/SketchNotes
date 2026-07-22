import { cx } from "@/lib/utils";
import type { FeatureFlag } from "@/lib/SystemInfo/types";
import { CheckIcon, CloseIcon, LayersIcon } from "@/components/SketchNotes/atoms/icons";

/** Grid of web-platform capability probes with supported/unsupported chips. */
export function FeatureMatrix({ features }: { features: FeatureFlag[] }) {
  const supported = features.filter((f) => f.supported).length;

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-panel p-5 shadow-panel">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
          <LayersIcon size={18} />
        </span>
        <h3 className="text-[15px] font-bold tracking-tight">Capabilities</h3>
        <span className="ml-auto font-mono text-[12px] font-semibold text-ink-soft">
          {supported}/{features.length}
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
        {features.map((f) => (
          <li
            key={f.name}
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-[12.5px]"
          >
            <span
              className={cx(
                "grid size-5 flex-none place-items-center rounded-full",
                f.supported ? "bg-success/15 text-success" : "bg-border text-ink-soft",
              )}
            >
              {f.supported ? <CheckIcon size={12} /> : <CloseIcon size={11} />}
            </span>
            <span className={cx("truncate", f.supported ? "text-text" : "text-ink-soft")} title={f.name}>
              {f.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
