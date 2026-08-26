"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useApiStore } from "@/store/useApiStore";
import { METHODS, type Method } from "@/lib/Api/guard";
import { BODY_KINDS, sendRequest, toCurl } from "@/lib/Api/request";
import { ResponseView } from "@/components/Api/organisms/ResponseView";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { copyText } from "@/lib/export-text";
import {
  ApiIcon,
  AppsIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SendIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";
import { cx, timeAgo } from "@/lib/utils";

/**
 * API Client — build a request, send it, read what came back.
 *
 * The one part worth understanding before using it: **the request is made by this
 * site's server, not by your browser.** It has to be — a page cannot call an API
 * that has not opted into CORS, which is most of them. Two consequences that the
 * app states rather than hides:
 *
 *  - It cannot reach anything private. `localhost`, your office network, a
 *    container on your machine — none of those are reachable from a server
 *    somewhere else, and the relay refuses them explicitly rather than timing out
 *    mysteriously. For local development, curl is the right tool.
 *  - Anything you send passes through that server. So history is never written to
 *    disk (see `useApiStore`) and the note below the send button says so.
 *
 * Everything else — the collection, the draft, the curl line — is local.
 */
export function ApiApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const draft = useApiStore((s) => s.draft);
  const setDraft = useApiStore((s) => s.setDraft);
  const setHeader = useApiStore((s) => s.setHeader);
  const addHeader = useApiStore((s) => s.addHeader);
  const removeHeader = useApiStore((s) => s.removeHeader);
  const setBodyKind = useApiStore((s) => s.setBodyKind);
  const reset = useApiStore((s) => s.reset);
  const saved = useApiStore((s) => s.saved);
  const save = useApiStore((s) => s.save);
  const load = useApiStore((s) => s.load);
  const removeSaved = useApiStore((s) => s.removeSaved);
  const history = useApiStore((s) => s.history);
  const result = useApiStore((s) => s.result);
  const setResult = useApiStore((s) => s.setResult);
  const sending = useApiStore((s) => s.sending);
  const setSending = useApiStore((s) => s.setSending);
  const noteHistory = useApiStore((s) => s.noteHistory);
  const hydrate = useApiStore((s) => s.hydrate);

  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showCurl, setShowCurl] = useState(false);

  // Adopt the saved collection and draft once, after mount.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const curl = useMemo(() => toCurl(draft), [draft]);
  const canSend = draft.url.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const outcome = await sendRequest(draft);
      setResult(outcome);
      noteHistory({
        method: draft.method,
        url: draft.url,
        status: outcome.response?.status ?? null,
        timeMs: outcome.response?.timeMs ?? null,
        at: outcome.at,
      });
    } finally {
      setSending(false);
    }
  };

  const bodyAllowed = draft.method !== "GET" && draft.method !== "HEAD";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<ApiIcon size={24} />}
            name="API Client"
            tagline="build it, send it, read it"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 pb-6 pt-[22px]">
        <div className="flex flex-col gap-4">
          {/* Method, URL, send — one line on desktop, wrapping on a phone. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <label htmlFor="api-method" className="sr-only">
              Method
            </label>
            <select
              id="api-method"
              value={draft.method}
              onChange={(e) => setDraft({ method: e.target.value as Method })}
              className="flex-none rounded-[10px] border-[1.5px] border-border bg-panel px-2.5 py-2.5 font-mono text-[12.5px] font-bold hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <label htmlFor="api-url" className="sr-only">
              URL
            </label>
            <input
              id="api-url"
              type="url"
              value={draft.url}
              onChange={(e) => setDraft({ url: e.target.value })}
              placeholder="https://api.example.com/v1/things"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="min-w-[200px] flex-1 rounded-[10px] border-[1.5px] border-border bg-paper px-3 py-2.5 font-mono text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />

            <button
              type="submit"
              disabled={!canSend}
              className="tint inline-flex flex-none items-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent hover:opacity-90 disabled:opacity-40"
            >
              <SendIcon size={16} />
              {sending ? "Sending…" : "Send"}
            </button>
          </form>

          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            Requests are sent by this site&rsquo;s server, because a browser cannot call an API that
            has not allowed it. Private addresses — <code className="font-mono">localhost</code>, your
            own network — are refused, since the server could not reach them anyway. Nothing you send
            is written to disk: the history below is kept only until you close the tab.
          </p>

          <div className="grid gap-4 min-[860px]:grid-cols-[1fr_260px]">
            <div className="flex min-w-0 flex-col gap-4">
              <section aria-labelledby="api-headers" className="flex flex-col gap-2">
                <h2
                  id="api-headers"
                  className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                >
                  Headers
                </h2>
                {draft.headers.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={row.on}
                      onChange={(e) => setHeader(row.id, { on: e.target.checked })}
                      aria-label={`Send the ${row.name || `header on row ${i + 1}`}`}
                      className="size-4 flex-none accent-[var(--accent)]"
                    />
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => setHeader(row.id, { name: e.target.value })}
                      placeholder="Header"
                      aria-label={`Header name, row ${i + 1}`}
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-[8px] border-[1.5px] border-border bg-paper px-2 py-1.5 font-mono text-[12px] outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => setHeader(row.id, { value: e.target.value })}
                      placeholder="Value"
                      aria-label={`Header value, row ${i + 1}`}
                      spellCheck={false}
                      className="min-w-0 flex-[1.4] rounded-[8px] border-[1.5px] border-border bg-paper px-2 py-1.5 font-mono text-[12px] outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(row.id)}
                      aria-label={`Remove header row ${i + 1}`}
                      className="tint grid size-7 flex-none place-items-center rounded text-ink-soft hover:text-danger"
                    >
                      <TrashSmallIcon size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeader}
                  className="tint inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
                >
                  <PlusIcon size={13} />
                  Add a header
                </button>
              </section>

              <section aria-labelledby="api-body" className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="api-body"
                    className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                  >
                    Body
                  </h2>
                  <div className="inline-flex gap-1 rounded-lg border border-border bg-panel p-0.5">
                    {BODY_KINDS.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setBodyKind(k.id)}
                        disabled={!bodyAllowed && k.id !== "none"}
                        aria-current={draft.bodyKind === k.id}
                        className={cx(
                          "rounded-md px-2 py-1 text-[11.5px] font-semibold disabled:opacity-35",
                          draft.bodyKind === k.id
                            ? "bg-accent-soft text-accent"
                            : "text-ink-soft hover:text-text",
                        )}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                  {!bodyAllowed && (
                    <span className="text-[11px] text-ink-soft">
                      {draft.method} requests carry no body.
                    </span>
                  )}
                </div>

                {draft.bodyKind !== "none" && bodyAllowed && (
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft({ body: e.target.value })}
                    rows={8}
                    spellCheck={false}
                    placeholder={draft.bodyKind === "json" ? '{\n  "key": "value"\n}' : ""}
                    aria-label="Request body"
                    className="w-full resize-y rounded-[10px] border-[1.5px] border-border bg-paper px-2.5 py-2 font-mono text-[12.5px] leading-[1.6] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                )}
              </section>

              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ name: e.target.value })}
                  placeholder="Name this request"
                  aria-label="Name for the saved request"
                  className="min-w-[140px] flex-1 rounded-full border-[1.5px] border-border bg-panel px-3 py-2 text-[12.5px] outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={save}
                  disabled={!draft.url.trim()}
                  className="tint flex-none rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowCurl((v) => !v)}
                  aria-pressed={showCurl}
                  className="tint flex-none rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11.5px] font-semibold hover:border-accent hover:text-accent"
                >
                  curl
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="tint flex-none rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold hover:border-danger hover:text-danger"
                >
                  Clear
                </button>
              </div>

              {showCurl && (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await copyText(curl))) return;
                      setCopiedCurl(true);
                      window.setTimeout(() => setCopiedCurl(false), 1500);
                    }}
                    className="tint inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
                  >
                    {copiedCurl ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                    {copiedCurl ? "Copied" : "Copy the curl command"}
                  </button>
                  <pre className="overflow-x-auto rounded-[10px] border border-border bg-panel p-2.5 font-mono text-[11.5px] leading-relaxed">
                    <code>{curl}</code>
                  </pre>
                  <p className="text-[11px] leading-snug text-ink-soft">
                    Run this in a terminal to send the same request from your own machine — which is
                    also how to reach something on <code className="font-mono">localhost</code>.
                  </p>
                </div>
              )}

              {(result || sending) && (
                <section aria-labelledby="api-response" className="flex flex-col gap-2">
                  <h2
                    id="api-response"
                    className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                  >
                    Response
                  </h2>
                  {sending ? (
                    <p className="rounded-[10px] border border-border bg-panel px-3 py-6 text-center text-[12.5px] text-ink-soft">
                      Waiting for {new URL(draft.url || "https://x", "https://x").hostname}…
                    </p>
                  ) : (
                    result && <ResponseView result={result} />
                  )}
                </section>
              )}
            </div>

            <aside className="flex min-w-0 flex-col gap-4">
              <section aria-labelledby="api-saved">
                <h2
                  id="api-saved"
                  className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                >
                  Saved
                </h2>
                {saved.length === 0 ? (
                  <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
                    Nothing saved. Name a request and press Save to keep it.
                  </p>
                ) : (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {saved.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => load(entry.id)}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-panel px-2 py-1.5 text-left hover:border-accent"
                        >
                          <span className="block truncate text-[12px] font-semibold">
                            {entry.name}
                          </span>
                          <span className="block truncate font-mono text-[10px] uppercase tracking-[.08em] text-ink-soft">
                            {entry.method}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSaved(entry.id)}
                          aria-label={`Delete ${entry.name}`}
                          className="tint grid size-7 flex-none place-items-center rounded text-ink-soft hover:text-danger"
                        >
                          <TrashSmallIcon size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {history.length > 0 && (
                <section aria-labelledby="api-history">
                  <h2
                    id="api-history"
                    className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
                  >
                    This session
                  </h2>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {history.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-border bg-panel px-2 py-1.5"
                      >
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-mono text-[10px] font-bold uppercase text-ink-soft">
                            {entry.method}
                          </span>
                          <span
                            className={cx(
                              "font-mono text-[10px] font-bold tabular-nums",
                              entry.status === null
                                ? "text-danger"
                                : entry.status >= 400
                                  ? "text-danger"
                                  : "text-accent",
                            )}
                          >
                            {entry.status ?? "—"}
                          </span>
                          <span className="ml-auto font-mono text-[9.5px] text-ink-soft">
                            {timeAgo(entry.at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-soft">
                          {entry.url}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
