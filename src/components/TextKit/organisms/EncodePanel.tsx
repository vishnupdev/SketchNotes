"use client";

import { useMemo, useState } from "react";
import { useTextKitStore } from "@/store/useTextKitStore";
import { CODECS, DECODE_ONLY, decode, encode, type Codec } from "@/lib/TextKit/encode";
import { TextField } from "@/components/TextKit/molecules/TextField";
import { JwtView } from "@/components/TextKit/molecules/JwtView";
import { cx } from "@/lib/utils";
import { SwapIcon } from "@/components/SketchNotes/atoms/icons";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Encoding and decoding, both directions, live.
 *
 * Direction is a toggle rather than two buttons because the answer updates as you
 * type either side — and the failure case is a *message*, not an empty box: "that
 * isn't valid base64" is the thing you need to hear when a paste got truncated.
 */
export function EncodePanel() {
  const text = useTextKitStore((s) => s.text);
  const setText = useTextKitStore((s) => s.setText);
  const [codec, setCodec] = useState<Codec>("base64");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");

  // A decode-only codec has no direction to be in, so the toggle is hidden and
  // the effective direction is forced — otherwise switching to JWT while
  // "encode" was selected would show a refusal rather than the token.
  const oneWay = DECODE_ONLY.has(codec);
  const effective = oneWay ? "decode" : direction;

  const result = useMemo(
    () => (effective === "encode" ? encode(text, codec) : decode(text, codec)),
    [codec, effective, text],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CODECS.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.hint}
            onClick={() => setCodec(option.id)}
            aria-current={option.id === codec}
            className={cx(
              "flex-none rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              option.id === codec
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-panel text-ink-soft hover:text-text",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!oneWay && (
          <div className="inline-flex gap-1 rounded-xl border border-border bg-panel p-1">
            {(["encode", "decode"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                aria-current={direction === d}
                className={cx(
                  "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors",
                  direction === d ? "bg-accent-soft text-accent" : "text-ink-soft hover:text-text",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        <span className="text-[12px] text-ink-soft">
          {CODECS.find((c) => c.id === codec)?.hint}
        </span>
      </div>

      <TextField
        label={codec === "jwt" ? "Token" : effective === "encode" ? "Plain text" : "Encoded text"}
        value={text}
        onChange={setText}
        rows={7}
        placeholder={
          codec === "jwt"
            ? "Paste a JWT — eyJhbGciOi…"
            : effective === "encode"
              ? "Text to encode"
              : "Encoded text to decode"
        }
      />

      {/* A JWT is three structured parts and a verdict, not one output string, so
          it gets its own view rather than the generic result field. */}
      {codec === "jwt" ? (
        <JwtView token={text} />
      ) : (
        <>
          {/* Feeding the result back is the operation people actually want next —
              decode, edit, re-encode — so it is one button rather than a copy-paste. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => result.ok && setText(result.text)}
              disabled={!result.ok || !text}
              className={cx(BTN, "disabled:opacity-40")}
            >
              <SwapIcon size={15} />
              Use the result as the input
            </button>
          </div>

          {result.ok ? (
            <TextField label="Result" value={result.text} rows={7} />
          ) : (
            <p role="alert" className="text-[12.5px] leading-relaxed text-danger">
              {result.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
