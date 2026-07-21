"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { clamp } from "@/engine/geometry";
import { cx } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** "top" floats above the anchor (dock); "bottom" drops below (header). */
  placement?: "top" | "bottom";
  /** Horizontal alignment relative to the anchor. */
  align?: "center" | "end";
  className?: string;
  children: ReactNode;
}

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * A floating panel positioned relative to its anchor, matching the original
 * dock/header popover behaviour. Closes on outside pointerdown and Escape.
 */
export function Popover({
  open,
  anchorRef,
  onClose,
  placement = "top",
  align = "center",
  className,
  children,
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const reposition = useCallbackSafe(() => {
    const anchor = anchorRef.current;
    const pop = ref.current;
    if (!anchor || !pop) return;
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const left =
      align === "end"
        ? clamp(r.right - pw, 8, window.innerWidth - pw - 8)
        : clamp(r.left + r.width / 2 - pw / 2, 8, window.innerWidth - pw - 8);
    if (placement === "bottom") setPos({ left, top: r.bottom + 8 });
    else setPos({ left, bottom: window.innerHeight - r.top + 10 });
  });

  useLayoutEffect(() => {
    if (open) reposition();
    else setPos(null);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => reposition();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      className={cx(
        "fixed z-[45] rounded-2xl border border-border bg-panel p-2 shadow-panel",
        className,
      )}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top,
        bottom: pos?.bottom,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}

/** Small helper: a stable callback without listing deps every render. */
function useCallbackSafe<T extends (...args: never[]) => void>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useRef(((...args: never[]) => ref.current(...args)) as T).current;
}
