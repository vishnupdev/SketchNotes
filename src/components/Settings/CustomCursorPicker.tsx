"use client";

import { useRef, useState } from "react";
import {
  CUSTOM_CURSOR_ID,
  customCursorPx,
  type CursorSettings,
  type CustomCursor,
} from "@/lib/cursors";
import { CursorImageError, cursorFromEmoji, cursorFromFile } from "@/lib/cursor-image";
import { cx } from "@/lib/utils";
import { EmojiGrid } from "@/components/SketchNotes/molecules/EmojiGrid";
import { EmojiIcon, ImportIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

const btn =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Settings → Pointer → your own. Turns an image file or an emoji into the
 * workspace pointer: both are drawn to a bitmap on this device (a cursor has
 * to be a real image, and nothing is uploaded anywhere), then stored with the
 * rest of the pointer settings.
 */
export function CustomCursorPicker({
  settings,
  update,
}: {
  settings: CursorSettings;
  update: (patch: Partial<CursorSettings>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const custom = settings.custom;

  /** Store a freshly-made pointer and switch to it. */
  const apply = (next: CustomCursor) => {
    setError(null);
    setEmojiOpen(false);
    update({ custom: next, id: CUSTOM_CURSOR_ID });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      apply({ src: await cursorFromFile(file), hot: "tip", name: file.name });
    } catch (e) {
      setError(
        e instanceof CursorImageError ? e.message : "That image couldn't be used as a pointer.",
      );
    } finally {
      setBusy(false);
      // Let the same file be chosen again after a failure.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const previewPx = Math.min(34, customCursorPx(settings.scale));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Pointer image file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
          <ImportIcon size={15} />
          {busy ? "Reading…" : custom ? "Replace image" : "Upload an image"}
        </button>
        <button
          type="button"
          className={cx(btn, emojiOpen && "border-accent text-accent")}
          aria-expanded={emojiOpen}
          onClick={() => {
            setError(null);
            setEmojiOpen((v) => !v);
          }}
        >
          <EmojiIcon size={15} />
          Use an emoji
        </button>
        {custom && (
          <button
            type="button"
            className={btn}
            onClick={() => {
              setError(null);
              // Dropping the image must drop the selection with it, or the
              // workspace would ask for a pointer that no longer exists.
              update({
                custom: null,
                id: settings.id === CUSTOM_CURSOR_ID ? "system" : settings.id,
              });
            }}
          >
            <TrashSmallIcon size={15} />
            Remove
          </button>
        )}
      </div>

      {emojiOpen && (
        <div className="rounded-xl border border-border bg-paper p-2.5">
          <EmojiGrid
            label="Pointer emoji"
            onPick={(e) => apply({ src: cursorFromEmoji(e), hot: "center", name: e })}
          />
        </div>
      )}

      {custom && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-paper p-3">
          <span
            aria-hidden="true"
            className="grid size-11 flex-none place-items-center rounded-lg bg-grid/40"
            style={{
              backgroundImage: `url("${custom.src}")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: `${previewPx}px`,
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold">{custom.name}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-soft">
              Points from its {custom.hot === "center" ? "middle" : "top-left corner"}.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Which part of the image points"
            className="flex flex-none gap-1 rounded-full border border-border p-0.5"
          >
            {(
              [
                ["tip", "Tip"],
                ["center", "Centre"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={custom.hot === value}
                onClick={() => update({ custom: { ...custom, hot: value } })}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  custom.hot === value ? "bg-accent text-on-accent" : "text-ink-soft hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : (
        <p className="text-[12px] leading-relaxed text-ink-soft">
          Square images work best. Anything larger is scaled down to pointer size, and the file
          never leaves this device.
        </p>
      )}
    </div>
  );
}
