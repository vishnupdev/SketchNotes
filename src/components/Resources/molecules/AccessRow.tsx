"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";
import { APP_MAP } from "@/components/AppCatalog";
import { useResourcesStore } from "@/store/useResourcesStore";
import { requestAccess } from "@/lib/Resources/permissions";
import type { AccessItem, AccessState } from "@/lib/Resources/catalog";
import { ResourceGlyph } from "@/components/Resources/atoms/ResourceGlyph";
import { StatePill } from "@/components/Resources/atoms/StatePill";

/**
 * One resource on the Access tab.
 *
 * The row answers three questions in the order people ask them: what can this
 * reach, is it open right now, and — the part only this workspace can answer —
 * which of its apps would ever use it. An empty `usedBy` is stated outright
 * rather than left blank, because "nothing here uses your location" is the most
 * reassuring line on the page and it should not be an absence.
 */
export function AccessRow({ item, state }: { item: AccessItem; state: AccessState }) {
  const setTab = useResourcesStore((s) => s.setTab);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [asking, setAsking] = useState(false);

  const users = item.usedBy === "all" ? null : item.usedBy;
  const unsupported = state === "unsupported";

  const ask = async () => {
    setAsking(true);
    setResult(await requestAccess(item.id));
    setAsking(false);
  };

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-border bg-panel p-3.5 shadow-panel">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "grid size-9 flex-none place-items-center rounded-[11px]",
            state === "granted" ? "bg-accent text-on-accent" : "bg-accent-soft text-accent",
            unsupported && "opacity-50",
          )}
        >
          <ResourceGlyph glyph={item.glyph} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h3 className="text-[14px] font-bold leading-tight">{item.name}</h3>
            <StatePill state={state} />
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{item.what}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-12 text-[11.5px]">
        {item.usedBy === "all" ? (
          <span className="text-ink-soft">Used by every app that saves anything.</span>
        ) : users && users.length > 0 ? (
          <>
            <span className="text-ink-soft">Used by</span>
            {users.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-2 py-0.5 font-semibold"
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: `var(${APP_MAP[id].hue})` }}
                />
                {APP_MAP[id].name}
              </span>
            ))}
          </>
        ) : (
          <span className="text-ink-soft">No app in this workspace uses it.</span>
        )}
      </div>

      {result && (
        <p
          role="status"
          className={cx("pl-12 text-[12px] leading-snug", result.ok ? "text-accent" : "text-ink-soft")}
        >
          {result.message}
        </p>
      )}

      {!unsupported && item.action !== "none" && (
        <div className="pl-12">
          {item.action === "live" ? (
            <button
              type="button"
              onClick={() => setTab("live")}
              className="rounded-full border border-border bg-paper px-3.5 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Watch it live
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void ask()}
              disabled={asking}
              className="rounded-full border border-border bg-paper px-3.5 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            >
              {asking ? "Asking…" : "Ask for it now"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
