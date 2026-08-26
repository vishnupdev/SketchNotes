"use client";

import { useMemo, useState } from "react";
import type { ApiResult } from "@/lib/Api/request";
import { bodyLanguage, prettyJson, statusTone } from "@/lib/Api/request";
import { CodeBlock } from "@/components/SketchNotes/molecules/CodeBlock";
import { copyText } from "@/lib/export-text";
import { CheckIcon, CopyIcon } from "@/components/SketchNotes/atoms/icons";
import { cx, formatBytes } from "@/lib/utils";

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  ok: "bg-accent text-on-accent",
  redirect: "border border-border text-text",
  client: "bg-danger text-on-accent",
  server: "bg-danger text-on-accent",
};

/**
 * What came back: the status line, the body, and the headers.
 *
 * The body is pretty-printed when it parses as JSON, and the *raw* text is kept one
 * tab away rather than discarded — because when you are debugging an API the
 * difference between the two is sometimes the bug (a stray byte-order mark, a
 * double-encoded string, whitespace that matters).
 */
export function ResponseView({ result }: { result: ApiResult }) {
  const [tab, setTab] = useState<"body" | "raw" | "headers">("body");
  const [copied, setCopied] = useState(false);

  const response = result.response;
  const pretty = useMemo(() => (response ? prettyJson(response.body) : null), [response]);
  const language = useMemo(
    () => (response ? bodyLanguage(response.headers) : "plain"),
    [response],
  );

  if (result.error || !response) {
    return (
      <div className="rounded-[14px] border border-danger/50 bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-[.12em] text-danger">Not sent</p>
        <p className="mt-1 text-[13px] leading-relaxed">{result.error}</p>
      </div>
    );
  }

  const tone = statusTone(response.status);
  const shown = tab === "body" ? (pretty ?? response.body) : response.body;

  const copy = async () => {
    if (!(await copyText(tab === "headers" ? headerText(response.headers) : shown))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums",
            TONE_CLASS[tone],
          )}
        >
          {response.status} {response.statusText}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft">
          {response.timeMs} ms · {formatBytes(response.bytes)}
          {response.truncated && " · truncated"}
        </span>
      </div>

      {response.redirectedTo && (
        <p className="rounded-[10px] border border-border bg-panel px-3 py-2 text-[12.5px] leading-relaxed">
          This was a redirect, and the relay does not follow them — a redirect target has not been
          through the address checks. It points at{" "}
          <b className="break-all font-mono text-[11.5px]">{response.redirectedTo}</b>. Paste that in
          above to send it deliberately.
        </p>
      )}

      <div className="flex items-center gap-1.5">
        <div
          role="tablist"
          aria-label="Response view"
          className="inline-flex gap-1 rounded-xl border border-border bg-panel p-1"
        >
          {(
            [
              ["body", pretty ? "Pretty" : "Body"],
              ["raw", "Raw"],
              ["headers", `Headers · ${Object.keys(response.headers).length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cx(
                "rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                tab === id ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void copy()}
          className="tint ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {tab === "headers" ? (
        <dl className="rounded-[10px] border border-border bg-panel px-3 py-1">
          {Object.entries(response.headers).map(([name, value]) => (
            <div key={name} className="border-b border-border py-1.5 last:border-b-0">
              <dt className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-soft">
                {name}
              </dt>
              <dd className="mt-0.5 break-all font-mono text-[12px]">{value}</dd>
            </div>
          ))}
          {Object.keys(response.headers).length === 0 && (
            <p className="py-2 text-[12.5px] text-ink-soft">No headers came back.</p>
          )}
        </dl>
      ) : shown.trim() === "" ? (
        <p className="rounded-[10px] border border-border bg-panel px-3 py-6 text-center text-[12.5px] text-ink-soft">
          The response had an empty body.
        </p>
      ) : (
        <CodeBlock
          code={shown}
          language={tab === "body" && pretty ? "json" : language}
          lineNumbers
        />
      )}

      {response.truncated && (
        <p className="text-[11.5px] leading-snug text-ink-soft">
          The body was longer than 2 MB and has been cut short. The size above is the real one.
        </p>
      )}
    </div>
  );
}

const headerText = (headers: Record<string, string>): string =>
  Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
