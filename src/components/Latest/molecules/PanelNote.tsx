"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * The panel-sized message every tab needs: nothing chosen, nothing saved,
 * nothing to list, something went wrong.
 *
 * One component for all four because the difference between them is entirely in
 * the words. What is not negotiable is that each of them says **what to do
 * next** — a panel reading only "No results" has told the reader something they
 * could already see.
 *
 * Kept in this app's own folder rather than imported from the app next door
 * (CLAUDE.md rule #5): it is thirty lines, and sharing it would couple two apps
 * through a component that each will want to evolve differently.
 */
export function PanelNote({
  title,
  children,
  tone = "quiet",
  action,
}: {
  title: string;
  /** What happened, and what to do about it. */
  children: ReactNode;
  /** `alert` for a failure, `quiet` for an empty or waiting state. */
  tone?: "quiet" | "alert";
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "alert" ? "alert" : undefined}
      className={cx(
        "rounded-[14px] border px-4 py-3.5",
        tone === "alert" ? "border-accent bg-accent-soft" : "border-border bg-panel",
      )}
    >
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <div className="mt-1 text-[12px] leading-relaxed text-ink-soft">{children}</div>
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
