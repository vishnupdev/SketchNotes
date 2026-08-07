"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import { FROM_CODE, unitMs } from "@/lib/Morse/alphabet";
import { startTone, stopTone } from "@/lib/Morse/audio";
import { useMorseStore } from "@/store/useMorseStore";
import { SignalPattern } from "@/components/Morse/atoms/SignalPattern";
import { PlayIcon, TrashSmallIcon, UndoIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Key — a straight key you hold to send.
 *
 * The timing is the real thing, scaled to the speed you set: a press shorter
 * than two units is a dit and anything longer is a dah, three units of silence
 * ends a character and seven ends a word. Sending is the half of Morse that
 * reading a chart can't teach, so the pad shows the length of the press as you
 * hold it and decodes each character the moment the gap closes.
 */
export function KeyPanel() {
  const settings = useMorseStore((s) => s.settings);
  const play = useMorseStore((s) => s.play);
  const playing = useMorseStore((s) => s.playing);

  const [down, setDown] = useState(false);
  const [held, setHeld] = useState(0);
  const [buffer, setBuffer] = useState("");
  const [text, setText] = useState("");

  const downRef = useRef(false);
  const downAt = useRef(0);
  const bufferRef = useRef("");
  const charTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  const unit = unitMs(settings.wpm);
  const dahAt = unit * 2; // press length at which a dit becomes a dah

  const clearTimers = useCallback(() => {
    if (charTimer.current) clearTimeout(charTimer.current);
    if (wordTimer.current) clearTimeout(wordTimer.current);
    charTimer.current = null;
    wordTimer.current = null;
  }, []);

  /** Turn the collected signals into a character and append it. */
  const commitChar = useCallback(() => {
    const code = bufferRef.current;
    if (!code) return;
    bufferRef.current = "";
    setBuffer("");
    setText((t) => t + (FROM_CODE[code] ?? "?"));
  }, []);

  const press = useCallback(() => {
    if (downRef.current) return;
    downRef.current = true;
    clearTimers();
    downAt.current = performance.now();
    setDown(true);
    setHeld(0);
    if (settings.sound) startTone(settings.tone);

    const tick = () => {
      if (!downRef.current) return;
      setHeld(performance.now() - downAt.current);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  }, [clearTimers, settings.sound, settings.tone]);

  const release = useCallback(() => {
    if (!downRef.current) return;
    downRef.current = false;
    setDown(false);
    stopTone();
    if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    rafId.current = null;

    const duration = performance.now() - downAt.current;
    setHeld(0);
    const symbol = duration < dahAt ? "." : "-";
    bufferRef.current += symbol;
    setBuffer(bufferRef.current);

    // Silence decides where characters and words end.
    charTimer.current = setTimeout(commitChar, unit * 3);
    wordTimer.current = setTimeout(() => {
      setText((t) => (t && !t.endsWith(" ") ? `${t} ` : t));
    }, unit * 7);
  }, [commitChar, dahAt, unit]);

  // Release the key and silence the tone if the panel goes away mid-press.
  useEffect(
    () => () => {
      downRef.current = false;
      stopTone();
      clearTimers();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    },
    [clearTimers],
  );

  const backspace = () => {
    clearTimers();
    if (bufferRef.current) {
      bufferRef.current = bufferRef.current.slice(0, -1);
      setBuffer(bufferRef.current);
      return;
    }
    setText((t) => t.slice(0, -1));
  };

  const clearAll = () => {
    clearTimers();
    bufferRef.current = "";
    setBuffer("");
    setText("");
  };

  const holdRatio = Math.min(1, held / (dahAt * 1.6));

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------- what you've sent ---------------- */}
      <section
        aria-label="Decoded message"
        className="rounded-2xl border border-border bg-panel p-4 shadow-panel"
      >
        <span className="text-[12px] font-semibold text-ink-soft">You sent</span>
        <p
          aria-live="polite"
          className="mt-1 min-h-[46px] select-text break-words font-mono text-[24px] font-bold leading-tight tracking-[.08em]"
        >
          {text || <span className="text-[15px] font-normal tracking-normal text-ink-soft">Nothing yet — hold the key below.</span>}
        </p>

        <div className="mt-3 flex min-h-8 items-center gap-2 border-t border-border pt-3">
          <span className="text-[12px] text-ink-soft">In progress</span>
          {buffer ? (
            <SignalPattern code={buffer} size="md" className="text-accent" />
          ) : (
            <span className="text-[12px] text-ink-soft">—</span>
          )}
        </div>
      </section>

      {/* ---------------- the key ---------------- */}
      <button
        type="button"
        aria-label="Morse key — hold to send a signal"
        onPointerDown={(e) => {
          // Suppress the browser's own press behaviour (selection, callouts,
          // scroll) but keep focus, so the key stays usable from the keyboard.
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          press();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          if (!e.repeat) press();
        }}
        onKeyUp={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          release();
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={cx(
          "relative grid h-[168px] w-full touch-none select-none place-items-center overflow-hidden rounded-2xl border-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          down ? "border-accent bg-accent text-on-accent" : "border-border bg-panel shadow-panel hover:border-accent",
        )}
      >
        {/* Fills as the press lengthens, flipping from dit to dah at 2 units. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-accent-soft"
          style={{ height: down ? `${holdRatio * 100}%` : 0 }}
        />
        <span className="relative flex flex-col items-center gap-2">
          <span className="font-mono text-[30px] font-extrabold leading-none">
            {down ? (held < dahAt ? "dit" : "dah") : "Hold"}
          </span>
          <span className={cx("text-[12.5px]", down ? "opacity-90" : "text-ink-soft")}>
            {down
              ? `${Math.round(held)} ms`
              : "Press and hold — short for a dit, long for a dah"}
          </span>
        </span>
      </button>

      <p className="text-center text-[11.5px] text-ink-soft">
        At {settings.wpm} WPM: dah from {Math.round(dahAt)} ms · character ends after{" "}
        {Math.round(unit * 3)} ms of silence · word after {Math.round(unit * 7)} ms. The space bar
        works as a key too.
      </p>

      {/* ---------------- controls ---------------- */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={backspace}
          disabled={!text && !buffer}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <UndoIcon size={16} />
          Undo
        </button>
        <button
          type="button"
          onClick={() => play(text, "key")}
          disabled={!text.trim() || playing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] font-semibold hover:border-accent hover:text-accent disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <PlayIcon size={16} />
          Hear it
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={!text && !buffer}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] font-semibold hover:border-danger hover:text-danger disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <TrashSmallIcon size={16} />
          Clear
        </button>
      </div>
    </div>
  );
}
