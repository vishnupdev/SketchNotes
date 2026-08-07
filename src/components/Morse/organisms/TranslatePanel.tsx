"use client";

import { useEffect, useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import { MORSE, decode, encode } from "@/lib/Morse/alphabet";
import { useMorseStore } from "@/store/useMorseStore";
import { SignalPattern } from "@/components/Morse/atoms/SignalPattern";
import { CheckIcon, CopyIcon, PlayIcon, SwapIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";

const EXAMPLES = ["SOS", "HELLO WORLD", "MORSE CODE"];

/**
 * Translate — text ⇄ Morse, with the result you can hear as well as copy.
 *
 * Below the boxes the message is laid out character by character with its
 * pattern, and the character currently being sent lights up as it plays: the
 * bridge between the text you know and the rhythm you're learning.
 */
export function TranslatePanel() {
  const input = useMorseStore((s) => s.input);
  const setInput = useMorseStore((s) => s.setInput);
  const toMorse = useMorseStore((s) => s.toMorse);
  const setToMorse = useMorseStore((s) => s.setToMorse);
  const play = useMorseStore((s) => s.play);
  const playing = useMorseStore((s) => s.playing);
  const playingId = useMorseStore((s) => s.playingId);
  const playingIndex = useMorseStore((s) => s.playingIndex);
  const stop = useMorseStore((s) => s.stop);

  const [copied, setCopied] = useState(false);

  /** The plain-text form of the message — what gets sent and charted. */
  const message = useMemo(() => (toMorse ? input : decode(input)), [input, toMorse]);
  const output = useMemo(() => (toMorse ? encode(input) : decode(input)), [input, toMorse]);

  /** Characters the code has no signal for, so the gap is explained not hidden. */
  const skipped = useMemo(() => {
    if (!toMorse) return [];
    const seen = new Set<string>();
    for (const char of input.toUpperCase()) {
      if (!/\s/.test(char) && !MORSE[char]) seen.add(char);
    }
    return [...seen];
  }, [input, toMorse]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  /** Flip direction, carrying the result across so the round trip is one tap. */
  const swap = () => {
    stop();
    setInput(output);
    setToMorse(!toMorse);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      /* clipboard blocked — the text is selectable in the box either way */
    }
  };

  // split("") rather than spreading, so these indices line up exactly with the
  // ones the playback plan reports back as `playingIndex`.
  const chars = message.toUpperCase().split("");

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- direction ---------------- */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel p-2 shadow-panel">
        <span className="flex-1 text-center text-[13px] font-bold">{toMorse ? "Text" : "Morse"}</span>
        <button
          type="button"
          onClick={swap}
          aria-label={toMorse ? "Switch to Morse to text" : "Switch to text to Morse"}
          className="hover-pop grid size-10 flex-none place-items-center rounded-xl border border-border bg-paper text-accent hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <SwapIcon size={18} />
        </button>
        <span className="flex-1 text-center text-[13px] font-bold">{toMorse ? "Morse" : "Text"}</span>
      </div>

      {/* ---------------- input ---------------- */}
      <div className="rounded-2xl border border-border bg-panel shadow-panel">
        <div className="flex items-center justify-between px-4 pt-3">
          <label htmlFor="morse-input" className="text-[12px] font-semibold text-ink-soft">
            {toMorse ? "Your text" : "Morse code"}
          </label>
          {input && (
            <button
              type="button"
              onClick={() => setInput("")}
              aria-label="Clear input"
              className="tint hover-pop grid size-8 place-items-center rounded-lg text-ink-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <TrashSmallIcon size={16} />
            </button>
          )}
        </div>
        <textarea
          id="morse-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={toMorse ? "Type anything…" : "... --- ...  (use / between words)"}
          className={cx(
            "w-full resize-y bg-transparent px-4 pb-3 pt-2 text-[15px] outline-none placeholder:text-ink-soft",
            !toMorse && "font-mono tracking-[.08em]",
          )}
        />
      </div>

      {/* ---------------- output ---------------- */}
      <div className="rounded-2xl border border-border bg-panel shadow-panel">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <span className="text-[12px] font-semibold text-ink-soft">
            {toMorse ? "Morse code" : "Decoded text"}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!output}
            className="tint inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-ink-soft hover:text-accent disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p
          className={cx(
            "min-h-[68px] select-text break-words px-4 pb-3.5 pt-2 text-[15px] leading-relaxed",
            toMorse && "font-mono tracking-[.08em]",
            !output && "text-ink-soft",
          )}
        >
          {output || "Nothing to convert yet."}
        </p>
      </div>

      {skipped.length > 0 && (
        <p className="text-[11.5px] text-ink-soft">
          Morse has no signal for {skipped.map((c) => `"${c}"`).join(", ")} — skipped.
        </p>
      )}

      {/* ---------------- send ---------------- */}
      <button
        type="button"
        onClick={() => (playing && playingId === "translate" ? stop() : play(message, "translate"))}
        disabled={!message.trim()}
        className="hover-glow inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-[14.5px] font-bold text-on-accent disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PlayIcon size={18} />
        {playing && playingId === "translate" ? "Stop sending" : "Send this message"}
      </button>

      {/* ---------------- character by character ---------------- */}
      {chars.length > 0 && (
        <section aria-label="Message character by character" className="flex flex-wrap gap-1.5">
          {chars.map((char, i) => {
            if (/\s/.test(char)) {
              return (
                <span key={i} aria-hidden className="grid w-5 place-items-center font-mono text-[13px] text-ink-soft">
                  /
                </span>
              );
            }
            const code = MORSE[char];
            const live = playingIndex === i;
            return (
              <span
                key={i}
                className={cx(
                  "flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors",
                  live
                    ? "border-accent bg-accent-soft text-accent"
                    : code
                      ? "border-border bg-panel"
                      : "border-border bg-panel text-ink-soft opacity-50",
                )}
              >
                <span className="font-mono text-[13px] font-bold leading-none">{char}</span>
                {code ? (
                  <SignalPattern code={code} size="sm" />
                ) : (
                  <span className="text-[9px] uppercase tracking-wider">n/a</span>
                )}
              </span>
            );
          })}
        </section>
      )}

      {/* ---------------- examples ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-soft">Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setToMorse(true);
              setInput(example);
            }}
            className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
