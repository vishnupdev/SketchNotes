"use client";

import { useEffect, useId, useState } from "react";
import { hexContrast } from "@/lib/color";
import { cx } from "@/lib/utils";
import {
  NEW_CUSTOM_THEME,
  normalizeHex,
  resolveCustomTheme,
  type CustomTheme,
} from "@/lib/themes";
import { ThemeTile } from "@/components/Settings/ThemeTile";

/** The two colours plus the base — everything a custom palette is made of. */
export type ThemeDraft = Omit<CustomTheme, "id">;

/** WCAG AA for normal text. The accent is used as text, not only as a fill. */
const AA_CONTRAST = 4.5;

/**
 * A colour field: the native picker for choosing, a hex box for typing or
 * pasting an exact value.
 *
 * The hex box keeps its own draft string so a half-typed value ("#1b") isn't
 * rejected mid-keystroke; the palette only updates once the text parses as a
 * colour, and the box resets to the live value on blur if it never did.
 */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value);

  // Follow the value when it changes elsewhere (base switch, editing a theme).
  useEffect(() => setText(value), [value]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 flex-none cursor-pointer rounded-lg border border-border bg-paper p-0.5"
        />
        <input
          type="text"
          inputMode="text"
          spellCheck={false}
          aria-label={`${label} hex value`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex) onChange(hex);
          }}
          onBlur={() => setText(value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-paper px-2.5 py-2 font-mono text-[12px] text-text focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Build or edit one custom palette.
 *
 * The user supplies only a base (light or dark), an accent and a paper colour —
 * the rest of the palette is derived in CSS from those two values (see the
 * `custom-light`/`custom-dark` blocks in globals.css), so a hand-made theme is
 * complete and internally consistent without asking anyone to pick twenty
 * colours. The live tile is the real thing, painted by the same tokens the
 * workspace will use.
 *
 * The contrast readout is not decoration: `--accent` is used for text and icon
 * glyphs on `--paper`, so a pretty-but-pale accent would fail WCAG AA. It is a
 * warning rather than a block — it is the user's workspace, and they may be
 * choosing an accent they only ever see as a fill.
 */
export function CustomThemeEditor({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial?: ThemeDraft;
  saveLabel: string;
  onSave: (draft: ThemeDraft) => void;
  onCancel: () => void;
}) {
  const nameId = useId();
  const [draft, setDraft] = useState<ThemeDraft>(
    initial ?? { label: "", ...NEW_CUSTOM_THEME },
  );

  const patch = (next: Partial<ThemeDraft>) => setDraft((d) => ({ ...d, ...next }));

  const contrast = hexContrast(draft.accent, draft.paper);
  const lowContrast = contrast < AA_CONTRAST;
  const name = draft.label.trim();

  /*
   * Switching base moves the paper across to the other end of the range. Keeping
   * the old value would leave a "dark" theme on white paper, which reads as the
   * control being broken — the accent is kept, since that is the choice the user
   * cares about.
   */
  const setBase = (dark: boolean) => {
    if (dark === draft.dark) return;
    patch({ dark, paper: dark ? NEW_CUSTOM_THEME.paper : "#f7f8f6" });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-paper p-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-[12px] font-semibold">
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={draft.label}
          maxLength={24}
          placeholder="My theme"
          onChange={(e) => patch({ label: e.target.value })}
          className="rounded-lg border border-border bg-paper px-2.5 py-2 text-[13px] text-text focus:border-accent focus:outline-none"
        />
      </div>

      <div role="radiogroup" aria-label="Base" className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold">Base</span>
        <div className="flex gap-1.5">
          {[
            { dark: false, label: "Light" },
            { dark: true, label: "Dark" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={draft.dark === option.dark}
              onClick={() => setBase(option.dark)}
              className={cx(
                "rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                draft.dark === option.dark
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-ink-soft hover:border-accent hover:text-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <ColorField label="Accent" value={draft.accent} onChange={(accent) => patch({ accent })} />
        <ColorField label="Background" value={draft.paper} onChange={(paper) => patch({ paper })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[132px] flex-none">
          <ThemeTile
            theme={{ ...resolveCustomTheme({ ...draft, id: "custom:preview" }), label: name || "Preview" }}
            active={false}
            onSelect={() => {}}
          />
        </div>
        <p
          className={cx(
            "min-w-0 flex-1 text-[11.5px] leading-relaxed",
            lowContrast ? "text-prio-med" : "text-ink-soft",
          )}
        >
          Accent on background: {contrast.toFixed(1)}:1.{" "}
          {lowContrast
            ? "Below the 4.5:1 needed for small text — pick a darker or lighter accent to keep labels readable."
            : "Clears WCAG AA for text."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={name === ""}
          onClick={() => onSave({ ...draft, label: name })}
          className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
