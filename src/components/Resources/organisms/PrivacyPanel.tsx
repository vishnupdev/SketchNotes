"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";
import {
  readHostContacts,
  readIdentitySurface,
  readPrivacySignals,
  type HostContact,
  type IdentityFact,
  type PrivacySignal,
} from "@/lib/Resources/privacy";
import { formatBytes } from "@/lib/Resources/format";
import { useStorageAudit } from "@/hooks/useStorageAudit";
import { Section } from "@/components/Resources/atoms/Section";
import { CookieIcon, DatabaseIcon, DriveIcon, GlobeIcon, LayersIcon } from "@/components/SketchNotes/atoms/icons";

const TONE_TEXT = {
  good: "text-accent",
  warn: "text-danger",
  neutral: "text-text",
} as const;

/**
 * The Privacy tab: the tracking side of "what is using this device".
 *
 * Permissions are only half the story, and the weaker half. The last section
 * here is the point — every one of those values is readable by any page with no
 * prompt, no indicator and no setting to turn it off, and together they usually
 * identify a browser uniquely. A monitor that listed only the permission
 * prompts would leave someone reassured for the wrong reason.
 *
 * Nothing on this tab writes or deletes. Clearing data stays with the tools
 * that own it — Settings → Offline, and the browser's own site settings — so a
 * glance at a figure can never cost someone their notes.
 */
export function PrivacyPanel() {
  const { data: audit } = useStorageAudit();
  const [signals, setSignals] = useState<PrivacySignal[]>([]);
  const [hosts, setHosts] = useState<HostContact[]>([]);
  const [identity, setIdentity] = useState<IdentityFact[]>([]);

  // Every probe touches `window`, so none of it can run until after mount.
  useEffect(() => {
    setSignals(readPrivacySignals());
    setHosts(readHostContacts());
    setIdentity(readIdentitySurface());
  }, []);

  const thirdParty = hosts.filter((h) => h.thirdParty);

  return (
    <div className="flex flex-col gap-6">
      <Section
        id="privacy-signals"
        title="Signals this browser sends"
        blurb="What your browser tells every site about how it wants to be treated."
      >
        <ul className="flex flex-col gap-2.5">
          {signals.map((s) => (
            <li
              key={s.label}
              className="flex flex-col gap-1 rounded-2xl border border-border bg-panel p-3.5 shadow-panel"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[13.5px] font-bold">{s.label}</span>
                <span className={cx("text-[13px] font-semibold", TONE_TEXT[s.tone])}>{s.value}</span>
              </div>
              <p className="text-[12px] leading-snug text-ink-soft">{s.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="privacy-hosts"
        title="Who this page has contacted"
        blurb="Counted from the browser's own network log — what actually happened, not what the code claims."
      >
        <div className="rounded-2xl border border-border bg-panel p-4 shadow-panel">
          <p className="text-[13.5px] font-semibold leading-snug">
            {hosts.length === 0
              ? "No network requests have been recorded for this page."
              : thirdParty.length === 0
                ? `${hosts.length} host contacted — this site only. Nothing third-party.`
                : `${thirdParty.length} third-party host${thirdParty.length === 1 ? "" : "s"} contacted.`}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {hosts.map((h) => (
              <li
                key={h.host}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border pt-1.5 text-[12.5px] first:border-t-0 first:pt-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="flex-none text-ink-soft">
                    <GlobeIcon size={13} />
                  </span>
                  <span className="truncate font-medium">{h.host}</span>
                  {h.thirdParty && (
                    <span className="flex-none rounded-full border border-border px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                      third-party
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {h.requests} request{h.requests === 1 ? "" : "s"} · {formatBytes(h.bytes)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-soft">
            A request served from the offline cache transfers zero bytes, which is why sizes here
            can read lower than the files themselves.
          </p>
        </div>
      </Section>

      <Section
        id="privacy-stored"
        title="Kept on this device"
        blurb="Everything this site is storing in your browser. Read-only — clear it from Settings → Offline, or your browser's site settings."
      >
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
          <StoreCard
            icon={<DriveIcon size={17} />}
            title="Saved data"
            value={audit ? `${formatBytes(audit.local.bytes)} · ${audit.local.keys} keys` : "…"}
            note={
              audit?.estimate
                ? `The browser puts this origin's total at ${formatBytes(audit.estimate.usage)} of a ${formatBytes(audit.estimate.quota)} allowance.`
                : "Notes, tasks, reminders and preferences — all of it local."
            }
          />
          <StoreCard
            icon={<LayersIcon size={17} />}
            title="Offline copies"
            value={
              audit
                ? `${audit.caches.length} cache${audit.caches.length === 1 ? "" : "s"} · ${audit.cacheEntries} files`
                : "…"
            }
            note={`Kept by the service worker so every app opens with no connection.${
              audit && audit.serviceWorkers > 0
                ? ` ${audit.serviceWorkers} worker registered.`
                : ""
            }`}
          />
          <StoreCard
            icon={<CookieIcon size={17} />}
            title="Cookies"
            value={audit ? `${audit.cookies} readable` : "…"}
            note="OneApp sets none of its own. Cookies marked HttpOnly are invisible to any script, including this one."
          />
          <StoreCard
            icon={<DatabaseIcon size={17} />}
            title="Databases"
            value={
              audit
                ? audit.databasesKnown
                  ? `${audit.databases.length} IndexedDB`
                  : "Not listable here"
                : "…"
            }
            note={
              audit?.databasesKnown && audit.databases.length > 0
                ? audit.databases.join(", ")
                : "Some browsers refuse to enumerate databases at all — a privacy measure in its own right."
            }
          />
        </div>
        {audit && audit.persisted != null && (
          <p className="mt-3 px-1 text-[12px] leading-snug text-ink-soft">
            {audit.persisted
              ? "This site's data is marked persistent: the browser will not evict it to reclaim space."
              : "This site's data is best-effort: the browser may evict it if the device runs short of space."}
          </p>
        )}
      </Section>

      <Section
        id="privacy-identity"
        title="Readable without asking"
        blurb="No prompt, no indicator, no way to switch it off. Together, these usually identify one browser."
      >
        <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel shadow-panel">
          {identity.map((f) => (
            <div key={f.label} className="flex flex-col gap-0.5 p-3.5 min-[520px]:flex-row min-[520px]:items-baseline min-[520px]:gap-4">
              <dt className="flex-none text-[12px] font-semibold uppercase tracking-[.1em] text-ink-soft min-[520px]:w-40">
                {f.label}
              </dt>
              <dd className="min-w-0 wrap-break-word text-[12.5px]">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 px-1 text-[12px] leading-snug text-ink-soft">
          OneApp reads these only to draw itself — the theme, the layout, your language — and sends
          none of them anywhere. Any other site can read exactly the same list.
        </p>
      </Section>
    </div>
  );
}

/** One store, summarised: what it is, how much of it, and why it exists. */
function StoreCard({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-panel p-3.5 shadow-panel">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-accent-soft text-accent">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-soft">
          {title}
        </span>
      </div>
      <div className="text-[16px] font-bold tabular-nums">{value}</div>
      <p className="text-[11.5px] leading-snug text-ink-soft">{note}</p>
    </div>
  );
}
