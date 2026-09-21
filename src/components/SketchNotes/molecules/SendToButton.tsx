"use client";

import { useEffect, useRef, useState } from "react";
import { useSendToStore } from "@/store/useSendToStore";
import { useWorkspaceStore, type AppId } from "@/store/useWorkspaceStore";
import { targetsFor, type SendKind } from "@/lib/sendto/types";
import { APP_MAP } from "@/components/AppCatalog";
import { Popover } from "@/components/SketchNotes/atoms/Popover";
import { SendIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

interface SendToButtonProps {
  /** What is being sent — decides which destinations are offered. */
  kind: SendKind;
  /** The payload. An empty one disables the button rather than sending nothing. */
  value: string;
  /** The app doing the sending. */
  from: AppId;
  /** What this payload is, for the line the destination shows on arrival. */
  label: string;
  /**
   * "pill" sits in a row of primary actions; "text" is the quiet lower-case
   * link that belongs beside an existing small control.
   */
  variant?: "pill" | "text";
  className?: string;
}

/**
 * "Send to…" — hand this result to another app in the workspace.
 *
 * Shared rather than per-app because the behaviour has to be identical
 * everywhere: the destinations come from one registry (`lib/sendto/types.ts`),
 * so a producer never names an app and cannot offer somewhere that no longer
 * accepts what it makes. Adding a destination is a line in that registry, and
 * every producer of that kind gains it at once.
 *
 * With a single destination there is no menu — the button says where it goes
 * and goes there. A one-item dropdown is two taps to reach a foregone
 * conclusion, and on a phone it is two taps and a repositioned overlay.
 */
export function SendToButton({
  kind,
  value,
  from,
  label,
  variant = "pill",
  className,
}: SendToButtonProps) {
  const targets = targetsFor(kind);
  const send = useSendToStore((s) => s.send);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const empty = value.trim().length === 0;

  // Escape closes the menu and puts focus back where it came from. The shared
  // Popover handles the outside-tap half; keyboard users need the other half,
  // and returning focus is what stops a keyboard tab order restarting at the
  // top of the page (rule #7).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const deliver = (to: AppId) => {
    if (empty) return;
    send({ kind, to, from, value, label });
    setOpen(false);
    setActiveApp(to, { intro: false });
  };

  const styles =
    variant === "pill"
      ? cx(
          "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5",
          "text-[13px] font-bold hover:border-accent hover:text-accent",
          "disabled:pointer-events-none disabled:opacity-40",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )
      : cx(
          "inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[.12em]",
          "text-ink-soft hover:text-accent disabled:pointer-events-none disabled:opacity-40",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        );

  const iconSize = variant === "pill" ? 15 : 12;

  // One destination: no menu, and the button names it.
  if (targets.length === 1) {
    const only = targets[0];
    const name = APP_MAP[only.app].name;
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => deliver(only.app)}
        disabled={empty}
        title={only.does}
        className={cx(styles, className)}
      >
        <SendIcon size={iconSize} />
        Send to {name}
      </button>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={empty}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(styles, className)}
      >
        <SendIcon size={iconSize} />
        Send to…
      </button>

      <Popover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        placement="bottom"
        align="end"
        className="w-60 p-1.5"
      >
        <div role="menu" aria-label={`Send ${label.toLowerCase()} to another app`} className="flex flex-col">
          {targets.map((target) => (
            <button
              key={target.app}
              type="button"
              role="menuitem"
              onClick={() => deliver(target.app)}
              className="tint flex w-full flex-col items-start gap-px rounded-[10px] px-2.5 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="text-[13px] font-semibold">{APP_MAP[target.app].name}</span>
              <small className="text-[11px] font-medium text-ink-soft">{target.does}</small>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
