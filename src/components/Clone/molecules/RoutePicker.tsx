"use client";

import { useState } from "react";
import { ROUTES } from "@/lib/Clone/routes";
import type { CloneRoute } from "@/lib/Clone/types";
import { cx } from "@/lib/utils";
import { ChevronDownIcon, GlobeIcon, UsbIcon, WifiIcon, WifiOffIcon } from "@/components/SketchNotes/atoms/icons";

const GLYPH: Record<CloneRoute, React.ReactNode> = {
  cable: <UsbIcon size={17} />,
  network: <WifiIcon size={17} />,
  offline: <WifiOffIcon size={17} />,
};

/**
 * How the two devices are joined — the first thing this app asks, and the only
 * question whose answer the user can't get wrong by guessing, because each
 * option says exactly what it needs and what it touches.
 *
 * Presented as radio cards rather than a select: the differences between them
 * are two lines of prose each, and a dropdown would hide precisely the part
 * worth reading. The "what gets contacted" line is not marketing — it is the
 * behaviour of `reachFor` in `lib/Clone/routes.ts`, written out.
 */
export function RoutePicker({
  route,
  onRoute,
  wide,
  onWide,
}: {
  route: CloneRoute;
  onRoute: (route: CloneRoute) => void;
  /** Network route only: may the connection reach past the local network? */
  wide: boolean;
  onWide: (wide: boolean) => void;
}) {
  const [openSteps, setOpenSteps] = useState(false);
  const chosen = ROUTES.find((r) => r.id === route);

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          How are the two devices joined?
        </legend>

        {ROUTES.map((option) => (
          <label
            key={option.id}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              route === option.id
                ? "border-accent bg-accent-soft"
                : "border-border bg-panel hover:border-accent",
            )}
          >
            <input
              type="radio"
              name="clone-route"
              value={option.id}
              checked={route === option.id}
              onChange={() => onRoute(option.id)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span aria-hidden className="text-ink-soft">
                  {GLYPH[option.id]}
                </span>
                {option.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
                {option.blurb}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* The network route is the only one that can involve anyone else, so the
          decision is made here, explicitly, and never remembered. */}
      {route === "network" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-paper p-3">
          <input
            type="checkbox"
            checked={wide}
            onChange={(e) => onWide(e.target.checked)}
            className="mt-0.5 size-4 flex-none accent-accent"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <span aria-hidden className="text-ink-soft">
                <GlobeIcon size={16} />
              </span>
              The devices are on different networks
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
              Asks a public STUN server what address this device looks like from outside — one
              question, and it never sees the clone. Leave this off and nothing outside your own
              network is contacted at all.
            </span>
          </span>
        </label>
      )}

      {chosen && (
        <div className="rounded-xl border border-border bg-paper p-3">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-text">Needs:</span> {chosen.needs.join(" · ")}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-text">Contacts:</span>{" "}
            {chosen.contacts.length === 0
              ? "nothing outside the two devices."
              : chosen.contacts.join(" ")}
          </p>

          {chosen.steps && (
            <>
              <button
                type="button"
                onClick={() => setOpenSteps((v) => !v)}
                aria-expanded={openSteps}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  aria-hidden
                  className={cx(
                    "transition-transform motion-reduce:transition-none",
                    openSteps && "rotate-180",
                  )}
                >
                  <ChevronDownIcon size={14} />
                </span>
                {openSteps ? "Hide how to set this up" : "How do I set this up?"}
              </button>
              {openSteps && (
                <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[12px] leading-relaxed text-ink-soft">
                  {chosen.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
