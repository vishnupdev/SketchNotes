"use client";

import { useEffect, useId, useState } from "react";
import { isHex } from "@/lib/color";
import { cx } from "@/lib/utils";

/**
 * A colour input: a native swatch picker beside a typed hex value.
 *
 * Both halves are needed, and for different reasons. The native
 * `<input type="color">` is the only way to get the operating system's own
 * picker — with its eyedropper and its recent colours — and it is the fastest
 * route when you are choosing. The text field is the only way to *paste* the hex
 * you already have, which is what actually happens most of the time.
 *
 * The typed value is held locally while it is being edited and only committed
 * when it parses, so backspacing through `#1f74e0` does not fire six invalid
 * updates and does not fight the cursor by rewriting the box mid-word.
 */
export function ColorField({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Shown as a small × when given — used by the palette grid. */
  onRemove?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);

  // Adopt an outside change (a swap, a suggestion applied, the picker) — but not
  // while the field holds an in-progress edit that happens to be invalid.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const valid = isHex(draft);

  const commit = (raw: string) => {
    setDraft(raw);
    if (isHex(raw)) onChange(raw);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* The swatch is the picker. Sized as a real touch target (rule #3), and
          labelled, because a bare colour input is unlabelled to a screen reader. */}
      <input
        id={`${id}-swatch`}
        type="color"
        value={valid ? (draft.startsWith("#") ? draft : `#${draft}`) : value}
        onChange={(e) => commit(e.target.value)}
        aria-label={`${label} colour picker`}
        className="size-11 flex-none cursor-pointer rounded-[10px] border border-border bg-paper p-0.5"
      />

      <div className="min-w-0 flex-1">
        <label
          htmlFor={`${id}-hex`}
          className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft"
        >
          {label}
        </label>
        <input
          id={`${id}-hex`}
          type="text"
          value={draft}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setDraft(value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          inputMode="text"
          aria-invalid={!valid || undefined}
          className={cx(
            "mt-0.5 w-full rounded-[10px] border-[1.5px] bg-paper px-2.5 py-1.5 font-mono text-[13px] uppercase outline-none",
            valid
              ? "border-border focus:border-accent focus:ring-2 focus:ring-accent/25"
              : "border-danger text-danger",
          )}
        />
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="tint grid size-8 flex-none place-items-center rounded-lg text-ink-soft hover:text-danger"
        >
          <span aria-hidden className="text-[15px] leading-none">
            &times;
          </span>
        </button>
      )}
    </div>
  );
}
