"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { WifiOffIcon } from "@/components/SketchNotes/atoms/icons";

interface OfflineNoticeProps {
  /** Headline — say what can't happen, in the user's terms. */
  title: string;
  /** One line of detail: what still works, or what to do next. */
  children?: ReactNode;
  /** Optional retry / alternative action. */
  action?: { label: string; onClick: () => void };
  /**
   * "block" fills an empty feed area; "inline" is a compact strip that sits
   * above a control that has been disabled.
   */
  variant?: "block" | "inline";
  className?: string;
}

/**
 * The shared "this bit needs a connection" notice.
 *
 * Only a few things in the workspace genuinely need the network (news, online
 * translation, handwriting recognition, the speed test, public-IP lookup).
 * Every one of them uses this notice so the offline story reads the same
 * everywhere: name the feature, say what still works, offer a retry. Living
 * outside any single app's folder keeps it usable by all of them.
 */
export function OfflineNotice({
  title,
  children,
  action,
  variant = "block",
  className,
}: OfflineNoticeProps) {
  if (variant === "inline") {
    return (
      <div
        role="status"
        className={cx(
          "flex items-start gap-2.5 rounded-xl border border-border bg-panel px-3.5 py-2.5",
          className,
        )}
      >
        <WifiOffIcon size={15} className="mt-0.5 flex-none text-ink-soft" />
        <div className="min-w-0 text-[12.5px] leading-relaxed">
          <span className="font-semibold">{title}</span>
          {children && <span className="text-ink-soft"> — {children}</span>}
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ml-auto flex-none rounded-full border border-border px-3 py-1 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cx("flex flex-col items-center gap-3 px-5 py-16 text-center", className)}
    >
      <WifiOffIcon size={32} className="text-ink-soft" />
      <p className="text-[14px] font-semibold">{title}</p>
      {children && (
        <p className="max-w-[340px] text-[12.5px] leading-relaxed text-ink-soft">{children}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
