"use client";

import { useState } from "react";
import { useVaultStore } from "@/store/useVaultStore";
import { estimateTyped } from "@/lib/Vault/generate";
import { ITERATIONS } from "@/lib/Vault/crypto";
import { StrengthMeter } from "@/components/Vault/molecules/StrengthMeter";
import { KeyIcon, LockIcon, ShieldCheckIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * The door: create a vault, or open the one that is here.
 *
 * Everything on this screen is written to be read *before* the passphrase is
 * chosen, because afterwards it is too late. There is no reset link, no
 * security question and nobody to ask — that is the same property that makes
 * the stored blob safe, and hiding it behind a cheerful "Get started" would be
 * a lie the user only discovers when it costs them their codes.
 *
 * The strength meter on the create form is the honest kind: it scores what was
 * typed and reads low by design (see `estimateTyped`), so it under-praises
 * rather than over-praises.
 */
export function LockPanel() {
  const status = useVaultStore((s) => s.status);
  const working = useVaultStore((s) => s.working);
  const error = useVaultStore((s) => s.error);
  const create = useVaultStore((s) => s.create);
  const unlock = useVaultStore((s) => s.unlock);
  const destroy = useVaultStore((s) => s.destroy);

  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const creating = status === "empty";
  const strength = estimateTyped(passphrase);
  const mismatch = creating && confirm !== "" && confirm !== passphrase;
  const ready = creating
    ? passphrase.length >= 8 && confirm === passphrase
    : passphrase.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || working) return;
    const opened = creating ? await create(passphrase) : await unlock(passphrase);
    if (opened) {
      setPassphrase("");
      setConfirm("");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 pt-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          {creating ? <KeyIcon size={26} /> : <LockIcon size={26} />}
        </span>
        <h2 className="text-[21px] font-extrabold leading-tight">
          {creating ? "Choose a passphrase" : "The vault is locked"}
        </h2>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          {creating
            ? "It encrypts everything you keep here, and it is the only thing that can open it again."
            : "Enter the passphrase to decrypt your codes and notes for this session."}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Passphrase
          </span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            autoComplete={creating ? "new-password" : "current-password"}
            autoFocus
            className="w-full rounded-xl border border-border bg-panel px-3.5 py-3 text-[15px] outline-none focus-visible:border-accent"
          />
        </label>

        {creating && (
          <>
            <StrengthMeter strength={strength} caption="as typed — a guess, and a low one" />
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
                Again
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                aria-invalid={mismatch}
                className="w-full rounded-xl border border-border bg-panel px-3.5 py-3 text-[15px] outline-none focus-visible:border-accent"
              />
            </label>
            {mismatch && (
              <p role="alert" className="text-[12.5px] font-semibold text-danger">
                The two don&apos;t match yet.
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] font-semibold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready || working}
          className="tint mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-bold text-on-accent disabled:opacity-45"
        >
          {working ? "Deriving the key…" : creating ? "Create the vault" : "Unlock"}
        </button>

        {working && (
          <p className="text-center text-[12px] text-ink-soft">
            {ITERATIONS.toLocaleString()} rounds of PBKDF2 — slow on purpose, and slower still for
            anyone guessing.
          </p>
        )}
      </form>

      <div className="rounded-[14px] border border-border bg-panel p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold">
          <ShieldCheckIcon size={16} />
          What this does and doesn&apos;t protect
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[12.5px] leading-relaxed text-ink-soft">
          <li>
            Everything is encrypted with AES-GCM under a key derived from your passphrase. What sits
            in this browser&apos;s storage is one blob, and nothing else.
          </li>
          <li>
            <strong className="font-semibold text-text">A forgotten passphrase is the end of it.</strong>{" "}
            There is no account, no reset and nobody holding a copy.
          </li>
          <li>
            It is not a hardware key. While the vault is open, anything already running on this
            machine can read what is on screen.
          </li>
        </ul>
      </div>

      {!creating && (
        <div className="text-center">
          {confirmReset ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[12.5px] font-semibold text-danger">
                This deletes the vault and everything in it, permanently.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void destroy();
                    setConfirmReset(false);
                  }}
                  className="rounded-full bg-danger px-4 py-2 text-[13px] font-bold text-on-accent"
                >
                  Delete it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-[12.5px] font-semibold text-ink-soft underline decoration-dotted hover:text-danger"
            >
              I&apos;ve forgotten the passphrase
            </button>
          )}
        </div>
      )}
    </div>
  );
}
