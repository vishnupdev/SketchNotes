"use client";

import { useUiStyle } from "@/hooks/useUiStyle";
import { cx } from "@/lib/utils";
import { DENSITIES, UI_STYLES } from "@/lib/ui-style";
import { CheckIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * A live sample of one interface style.
 *
 * Scoped with its own `data-ui`, exactly as the style is applied to <body>, so
 * the real CSS paints it: the corner radius, the panel material, the bevel and
 * the shadow are all the genuine article rather than a drawing of it. That is the
 * whole point of a shape picker — the difference between Soft and Sharp is
 * something you have to see, and a static icon could only approximate it.
 *
 * `pointer-events-none` because the sample is decoration; the surrounding button
 * takes the click.
 */
function StyleSample() {
  return (
    <span aria-hidden className="pointer-events-none flex flex-col gap-1.5 rounded-xl bg-paper p-2">
      {/* a panel, the workspace's basic unit */}
      <span className="flex items-center gap-1.5 rounded-xl border border-border bg-panel p-1.5 shadow-panel">
        <span className="size-4 flex-none rounded-lg bg-accent" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="h-1 w-full rounded-full bg-ink-soft/50" />
          <span className="h-1 w-2/3 rounded-full bg-ink-soft/25" />
        </span>
      </span>
      {/* a button and a chip, so radius reads at two sizes */}
      <span className="flex items-center gap-1.5">
        <span className="h-3.5 flex-1 rounded-lg bg-accent" />
        <span className="h-3.5 w-5 rounded-lg border border-border bg-panel" />
      </span>
    </span>
  );
}

/**
 * Settings → Interface: the workspace's shape and spacing, as opposed to its
 * colour. Two independent controls — the style (what a panel is made of and how
 * its corners are cut) and the density (how tightly everything is packed) — so
 * the combinations are the user's to make.
 */
export function InterfaceSetting() {
  const { uiStyle, setUiStyle, density, setDensity } = useUiStyle();

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Interface style"
        // Sized against the settings section (see ThemeSetting), not the viewport.
        className="grid grid-cols-2 gap-2.5 @min-[340px]:grid-cols-3"
      >
        {UI_STYLES.map((s) => {
          const active = s.id === uiStyle;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-ui={s.id}
              onClick={() => setUiStyle(s.id)}
              title={s.blurb}
              className={cx(
                "flex flex-col gap-2 rounded-xl border p-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active
                  ? "border-accent ring-2 ring-accent"
                  : "border-border hover:-translate-y-0.5 hover:shadow-panel",
              )}
            >
              <StyleSample />
              <span className="flex items-center justify-between gap-1 px-0.5">
                <span className="truncate text-[12.5px] font-bold text-text">{s.label}</span>
                {active && (
                  <span className="grid size-4 flex-none place-items-center rounded-full bg-accent text-on-accent">
                    <CheckIcon size={11} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* The blurb for whatever is selected, rather than one per tile — six
          descriptions at once would drown the samples they belong to. */}
      <p className="text-[12px] leading-relaxed text-ink-soft">
        {UI_STYLES.find((s) => s.id === uiStyle)?.blurb}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3.5">
        <span className="text-[12.5px] font-semibold">Density</span>
        <div role="radiogroup" aria-label="Density" className="flex flex-wrap gap-1.5">
          {DENSITIES.map((d) => {
            const active = d.id === density;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDensity(d.id)}
                title={d.blurb}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-ink-soft hover:border-accent hover:text-accent",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11.5px] text-ink-soft">
          {DENSITIES.find((d) => d.id === density)?.blurb}
        </span>
      </div>
    </div>
  );
}
