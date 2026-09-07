"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVaultStore, type Account } from "@/store/useVaultStore";
import {
  DEFAULT_DIGITS,
  DEFAULT_PERIOD,
  groupCode,
  isBase32,
  parseOtpauth,
  toOtpauth,
  totp,
  type TotpCode,
} from "@/lib/Vault/totp";
import { AccountQr } from "@/components/Vault/molecules/AccountQr";
import {
  CheckIcon,
  CopyIcon,
  PlusIcon,
  QrIcon,
  TrashSmallIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * The authenticator: the codes, counting down.
 *
 * Three details make this usable rather than merely correct.
 *
 * **The ring is the code's life, not a clock.** A six-digit number tells you
 * nothing about whether you have time to type it; the ring emptying does. It is
 * drawn as an SVG arc driven by `progress` from the same `totp()` call that
 * produced the code, so the two can never disagree.
 *
 * **Codes are recomputed on a one-second tick, not on a timer per account.**
 * One interval for the whole list keeps every ring in step and means a list of
 * twenty accounts costs one wake-up a second rather than twenty.
 *
 * **An account can leave again.** Every row can produce the `otpauth://` QR it
 * arrived as (see {@link AccountQr}), so nothing here is a one-way trip into a
 * browser you might lose.
 */
export function CodesPanel() {
  const accounts = useVaultStore((s) => s.accounts);
  const addAccount = useVaultStore((s) => s.addAccount);
  const removeAccount = useVaultStore((s) => s.removeAccount);

  const [codes, setCodes] = useState<Record<string, TotpCode>>({});
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    const now = Date.now();
    const next: Record<string, TotpCode> = {};
    await Promise.all(
      accounts.map(async (account) => {
        try {
          next[account.id] = await totp(account, now);
        } catch {
          // A secret that no longer decodes is shown as unreadable rather than
          // silently omitted, or the account would appear to have vanished.
        }
      }),
    );
    setCodes(next);
  }, [accounts]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-3">
      {accounts.length === 0 && !adding && (
        <div className="rounded-[14px] border border-border bg-panel p-5 text-center">
          <p className="text-[14px] font-bold">No accounts yet</p>
          <p className="mx-auto mt-1.5 max-w-[38ch] text-[12.5px] leading-relaxed text-ink-soft">
            Add the <code className="font-mono">otpauth://</code> address from a site&apos;s two-factor
            setup page. If it only shows a QR code, read it in the QR Codes app and paste the result
            here.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {accounts.map((account) => (
          <CodeRow
            key={account.id}
            account={account}
            code={codes[account.id]}
            onRemove={() => void removeAccount(account.id)}
          />
        ))}
      </ul>

      {adding ? (
        <AddAccount
          onCancel={() => setAdding(false)}
          onAdd={async (config) => {
            await addAccount(config);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="tint inline-flex items-center justify-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
        >
          <PlusIcon size={15} />
          Add an account
        </button>
      )}
    </div>
  );
}

/** One account: its name, its code, and how long the code has left. */
function CodeRow({
  account,
  code,
  onRemove,
}: {
  account: Account;
  code: TotpCode | undefined;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* a refused clipboard is not worth an error — the code is on screen */
    }
  };

  const remaining = code?.secondsLeft ?? 0;
  // Under five seconds the code is about to change; saying so prevents the
  // classic "typed it and it was rejected".
  const expiring = remaining <= 5;

  return (
    <li className="rounded-[14px] border border-border bg-panel p-3">
      <div className="flex items-center gap-3">
        <Ring progress={code?.progress ?? 0} seconds={remaining} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold">
            {account.issuer || account.label || "Account"}
          </div>
          {account.issuer && account.label && (
            <div className="truncate text-[12px] text-ink-soft">{account.label}</div>
          )}
          <div
            className={`mt-0.5 font-mono text-[22px] font-bold leading-none tabular-nums ${
              expiring ? "text-ink-soft" : ""
            }`}
          >
            {code ? groupCode(code.code) : "······"}
          </div>
          {expiring && code && (
            <div className="text-[11px] font-semibold text-ink-soft">
              changing — wait for the next
            </div>
          )}
        </div>

        <div className="flex flex-none flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={`Copy the code for ${account.issuer || account.label}`}
            className="tint grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-accent hover:text-accent"
          >
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          </button>

          <button
            type="button"
            onClick={() => setSharing((value) => !value)}
            aria-expanded={sharing}
            aria-label={`Move ${account.issuer || account.label} to another device`}
            title="Move this account to another device"
            className="tint grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-accent hover:text-accent"
          >
            <QrIcon size={15} />
          </button>

          {confirming ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-on-accent"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${account.issuer || account.label}`}
              className="grid size-9 place-items-center rounded-full border border-border text-ink-soft hover:border-danger hover:text-danger"
            >
              <TrashSmallIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {sharing && <AccountQr account={account} onClose={() => setSharing(false)} />}
    </li>
  );
}

/**
 * The countdown ring.
 *
 * `strokeDasharray` on a circle, with the offset driven by progress — no
 * animation frame and no JS per tick beyond the one-second state update, so it
 * costs nothing while it sits on screen.
 */
function Ring({ progress, seconds }: { progress: number; seconds: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid size-[42px] flex-none place-items-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * progress}
        />
      </svg>
      <span className="font-mono text-[11px] font-bold tabular-nums">{seconds}</span>
    </div>
  );
}

/** Add an account, from a pasted address or by typing the secret out. */
function AddAccount({
  onAdd,
  onCancel,
}: {
  onAdd: (config: ReturnType<typeof parseOtpauth>) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"link" | "manual">("link");
  const [link, setLink] = useState("");
  const [issuer, setIssuer] = useState("");
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  const manualValid = secret.trim() !== "" && isBase32(secret);

  const parsed = useMemo(() => {
    if (mode !== "link" || link.trim() === "") return null;
    try {
      return parseOtpauth(link);
    } catch {
      return null;
    }
  }, [link, mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "link") {
      try {
        await onAdd(parseOtpauth(link));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That address could not be read.");
      }
      return;
    }

    if (!manualValid) {
      setError("A secret is a run of letters A–Z and digits 2–7.");
      return;
    }
    // Routed through the same parser as a pasted link, so a typed account and a
    // scanned one can never end up shaped differently.
    await onAdd(
      parseOtpauth(
        toOtpauth({
          issuer: issuer.trim(),
          label: label.trim() || "Account",
          secret: secret.replace(/\s/g, "").toUpperCase(),
          digits: DEFAULT_DIGITS,
          period: DEFAULT_PERIOD,
          algorithm: "SHA-1",
        }),
      ),
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-[14px] border border-accent/45 bg-panel p-4"
    >
      <div className="flex gap-2" role="tablist" aria-label="How to add the account">
        {(["link", "manual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => setMode(option)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
              mode === option ? "bg-accent text-on-accent" : "border border-border text-ink-soft"
            }`}
          >
            {option === "link" ? "Paste the address" : "Type the secret"}
          </button>
        ))}
      </div>

      {mode === "link" ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            otpauth:// address
          </span>
          <textarea
            value={link}
            onChange={(event) => setLink(event.target.value)}
            rows={3}
            placeholder="otpauth://totp/GitHub:you@example.com?secret=…&issuer=GitHub"
            className="scroll-slim w-full resize-y break-all rounded-xl border border-border bg-paper px-3 py-2.5 font-mono text-[12px] outline-none focus-visible:border-accent"
          />
          {parsed && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
              <QrIcon size={14} />
              {parsed.issuer || "No issuer"} · {parsed.label} · {parsed.digits} digits every{" "}
              {parsed.period}s · {parsed.algorithm}
            </span>
          )}
        </label>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2.5">
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
                Issuer
              </span>
              <input
                value={issuer}
                onChange={(event) => setIssuer(event.target.value)}
                placeholder="GitHub"
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] outline-none focus-visible:border-accent"
              />
            </label>
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
                Account
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] outline-none focus-visible:border-accent"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
              Secret
            </span>
            <input
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="JBSW Y3DP EHPK 3PXP"
              aria-invalid={secret !== "" && !manualValid}
              className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 font-mono text-[13px] outline-none focus-visible:border-accent"
            />
            <span className="text-[11.5px] text-ink-soft">
              Spaces and case don&apos;t matter. Anything outside A–Z and 2–7 is not a base32 secret.
            </span>
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mode === "link" ? !parsed : !manualValid}
          className="tint rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-on-accent disabled:opacity-45"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
