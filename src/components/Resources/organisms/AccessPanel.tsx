"use client";

import { ACCESS_GROUPS, ACCESS_ITEMS } from "@/lib/Resources/catalog";
import type { AccessStates } from "@/lib/Resources/permissions";
import { Section } from "@/components/Resources/atoms/Section";
import { AccessRow } from "@/components/Resources/molecules/AccessRow";
import { RefreshIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The Access tab: every system resource this site could ask for, what its
 * answer is today, and which apps here would ever use it.
 *
 * The counter at the top is the summary people actually want — "three things
 * are allowed" — and it is derived from the same live states the rows render,
 * so it can never drift from the list beneath it.
 */
export function AccessPanel({
  states,
  loading,
  onRefresh,
}: {
  states: AccessStates;
  loading: boolean;
  onRefresh: () => void;
}) {
  const granted = ACCESS_ITEMS.filter((i) => states[i.id] === "granted");
  const blocked = ACCESS_ITEMS.filter((i) => states[i.id] === "denied");
  const available = ACCESS_ITEMS.filter((i) => states[i.id] !== "unsupported");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-panel p-4 shadow-panel">
        <p role="status" className="text-[14.5px] font-bold leading-snug">
          {loading
            ? "Reading permissions…"
            : granted.length === 0
              ? `Nothing is allowed. ${available.length} resources could be asked for.`
              : `${granted.length} allowed: ${granted.map((i) => i.name.toLowerCase()).join(", ")}.`}
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
          {blocked.length > 0 && `${blocked.length} blocked. `}
          These are this browser&apos;s answers for this site. Changing them is the browser&apos;s
          job — use the padlock or the site settings in the address bar — and any change made there
          appears here straight away.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3.5 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RefreshIcon size={14} />
          Re-read permissions
        </button>
      </div>

      {ACCESS_GROUPS.map((group) => {
        const items = ACCESS_ITEMS.filter((i) => i.group === group.id);
        if (items.length === 0) return null;
        return (
          <Section key={group.id} id={`access-${group.id}`} title={group.title} blurb={group.blurb}>
            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <AccessRow key={item.id} item={item} state={states[item.id]} />
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
