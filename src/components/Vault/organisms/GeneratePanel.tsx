"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVaultStore } from "@/store/useVaultStore";
import {
  estimatePassphrase,
  estimatePassword,
  generatePassphrase,
  generatePassword,
  MAX_LENGTH,
  MAX_WORDS,
  MIN_LENGTH,
  MIN_WORDS,
} from "@/lib/Vault/generate";
import { BITS_PER_WORD, WORDS } from "@/lib/Vault/wordlist";
import { StrengthMeter } from "@/components/Vault/molecules/StrengthMeter";
import { CheckIcon, CopyIcon, DiceIcon, RotateIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

const SEPARATORS = ["-", ".", "_", " "] as const;

/**
 * The generator: a password or a passphrase, with the strength computed rather
 * than guessed.
 *
 * The two tabs are not a preference. A password is for a field you will never
 * type by hand — it goes to a password manager. A passphrase is for the handful
 * you *do* type, or say down a phone, and the panel says which is which instead
 * of leaving it as a style choice.
 *
 * Nothing generated here is stored. It exists in this component's state until
 * it is copied or replaced, which is the honest behaviour for a value the app
 * has no business keeping a history of.
 */
export function GeneratePanel() {
  const options = useVaultStore((s) => s.password);
  const phraseOptions = useVaultStore((s) => s.passphrase);
  const setPassword = useVaultStore((s) => s.setPassword);
  const setPassphrase = useVaultStore((s) => s.setPassphrase);

  const [kind, setKind] = useState<"password" | "phrase">("password");
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const regenerate = useCallback(() => {
    try {
      setValue(kind === "password" ? generatePassword(options) : generatePassphrase(phraseOptions));
      setError(null);
    } catch (cause) {
      setValue("");
      setError(cause instanceof Error ? cause.message : "Nothing to generate from.");
    }
  }, [kind, options, phraseOptions]);

  // Regenerate whenever the shape changes: a password that doesn't match the
  // settings above it is a trap, since the strength shown is the settings'.
  useEffect(() => regenerate(), [regenerate]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const strength = kind === "password" ? estimatePassword(options) : estimatePassphrase(phraseOptions);

  const copy = async () => {
    if (value === "") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* a refused clipboard is not worth an error — it is selectable on screen */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="What to generate">
        {(
          [
            ["password", "Password", "for a manager"],
            ["phrase", "Passphrase", "for typing"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            onClick={() => setKind(id)}
            className={cx(
              "flex-1 rounded-xl border px-3 py-2 text-left",
              kind === id ? "border-accent bg-accent-soft" : "border-border bg-panel",
            )}
          >
            <span className="block text-[13px] font-bold">{label}</span>
            <span className="block text-[11.5px] text-ink-soft">{hint}</span>
          </button>
        ))}
      </div>

      {/* The value. Selectable, wrapping, monospaced — it has to be readable
          character by character, since a mistyped password is indistinguishable
          from a wrong one. */}
      <div className="rounded-[14px] border border-border bg-panel p-4">
        <output
          className="block min-h-[3.5rem] break-all font-mono text-[17px] font-semibold leading-snug"
          aria-live="polite"
        >
          {value || "—"}
        </output>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            disabled={value === ""}
            className="tint inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent disabled:opacity-45"
          >
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            aria-label="Generate another"
            className="tint inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-[13px] font-bold hover:border-accent hover:text-accent"
          >
            <RotateIcon size={15} />
            Again
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}

      <StrengthMeter
        strength={strength}
        caption={
          kind === "password"
            ? "computed from the alphabet and the length, not read off the characters"
            : `${WORDS.length} words in the list, so ${BITS_PER_WORD} bits each`
        }
      />

      {kind === "password" ? (
        <fieldset className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-4">
          <legend className="px-1 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Shape
          </legend>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between text-[13px] font-semibold">
              Length
              <span className="font-mono tabular-nums text-ink-soft">{options.length}</span>
            </span>
            <input
              type="range"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              value={options.length}
              onChange={(event) => setPassword({ length: Number(event.target.value) })}
              className="accent-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["lower", "a–z"],
                ["upper", "A–Z"],
                ["digits", "0–9"],
                ["symbols", "!#$%"],
                ["avoidAmbiguous", "No lookalikes"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={cx(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                  options[key] ? "border-accent bg-accent-soft text-accent" : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(event) => setPassword({ [key]: event.target.checked })}
                  className="size-3.5 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>

          <p className="text-[11.5px] leading-snug text-ink-soft">
            <strong className="font-semibold text-text">No lookalikes</strong> drops 0 O o 1 l I | 5 S
            2 Z. It costs a little strength and is worth it for anything you have to read off a
            printout.
          </p>
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-3 rounded-[14px] border border-border bg-panel p-4">
          <legend className="px-1 font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
            Shape
          </legend>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between text-[13px] font-semibold">
              Words
              <span className="font-mono tabular-nums text-ink-soft">{phraseOptions.words}</span>
            </span>
            <input
              type="range"
              min={MIN_WORDS}
              max={MAX_WORDS}
              value={phraseOptions.words}
              onChange={(event) => setPassphrase({ words: Number(event.target.value) })}
              className="accent-[var(--accent)]"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Joined by</span>
            <div className="flex gap-2">
              {SEPARATORS.map((separator) => (
                <button
                  key={separator}
                  type="button"
                  onClick={() => setPassphrase({ separator })}
                  aria-pressed={phraseOptions.separator === separator}
                  className={cx(
                    "grid size-9 place-items-center rounded-xl border font-mono text-[14px]",
                    phraseOptions.separator === separator
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border",
                  )}
                >
                  {separator === " " ? "␣" : separator}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["capitalize", "Capitalise"],
                ["number", "Add a digit"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={cx(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                  phraseOptions[key] ? "border-accent bg-accent-soft text-accent" : "border-border",
                )}
              >
                <input
                  type="checkbox"
                  checked={phraseOptions[key]}
                  onChange={(event) => setPassphrase({ [key]: event.target.checked })}
                  className="size-3.5 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>

          <p className="inline-flex items-start gap-2 text-[11.5px] leading-snug text-ink-soft">
            <DiceIcon size={14} />
            <span>
              Adding a word is worth {BITS_PER_WORD} bits; capitalising the first letter of each is
              worth none at all, since an attacker knows the pattern. It is there for the sites that
              demand a capital.
            </span>
          </p>
        </fieldset>
      )}
    </div>
  );
}
