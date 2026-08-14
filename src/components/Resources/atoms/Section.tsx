import type { ReactNode } from "react";

/**
 * A titled block within a panel.
 *
 * Every panel sits under the app's single `<h1>`, so these are `<h2>`s and the
 * heading order stays correct on every tab (rule 7). The blurb is bound to the
 * section with `aria-describedby`, which is what stops a screen reader hearing
 * an unexplained list of resource names.
 */
export function Section({
  id,
  title,
  blurb,
  action,
  children,
}: {
  id: string;
  title: string;
  blurb?: string;
  /** Optional control on the heading row — a re-scan, a filter. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} aria-describedby={blurb ? `${id}-blurb` : undefined}>
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className="text-[13px] font-bold uppercase tracking-wider text-ink-soft"
          >
            {title}
          </h2>
          {blurb && (
            <p id={`${id}-blurb`} className="mt-1 text-[12.5px] leading-snug text-ink-soft">
              {blurb}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
