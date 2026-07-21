"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";

/** Transient status message, auto-dismissed after a few seconds. */
export function Toast() {
  const toast = useEditorStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!toast) return;
    setMessage(toast.message);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div
      role="status"
      className={cx(
        "pointer-events-none fixed left-1/2 z-[80] max-w-[88vw] -translate-x-1/2 rounded-[10px]",
        "bg-ink px-[15px] py-[9px] text-center text-[13px] text-[#eef3f6] transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
      )}
      style={{ top: "calc(64px + env(safe-area-inset-top))" }}
    >
      {message}
    </div>
  );
}
