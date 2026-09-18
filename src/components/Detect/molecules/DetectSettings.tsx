"use client";

import { MIN_SCORE_CEILING, MIN_SCORE_FLOOR, MODELS, useDetectStore } from "@/store/useDetectStore";
import { isWarm, modelSize } from "@/lib/Detect/engine";
import { cx } from "@/lib/utils";

interface DetectSettingsProps {
  /** Ids are shared with the labels, so two panels on one page would collide. */
  idPrefix: string;
  /** Settings that cannot change mid-run are locked while one is going. */
  locked?: boolean;
}

/**
 * The three settings that change what you get: which model, how sure it has to
 * be, and whether the percentage is drawn.
 *
 * All three sit in the open rather than behind a gear, because each one is the
 * answer to a complaint someone is about to have. "It misses small things" is
 * the model; "it keeps calling my bag a person" is the threshold; "the labels
 * cover the thing" is the percentage. A settings screen would hide the fix
 * behind the assumption that the app is working properly.
 */
export function DetectSettings({ idPrefix, locked = false }: DetectSettingsProps) {
  const model = useDetectStore((s) => s.model);
  const setModel = useDetectStore((s) => s.setModel);
  const minScore = useDetectStore((s) => s.minScore);
  const setMinScore = useDetectStore((s) => s.setMinScore);
  const showScores = useDetectStore((s) => s.showScores);
  const setShowScores = useDetectStore((s) => s.setShowScores);

  return (
    <div className="flex flex-col gap-3.5 rounded-[16px] border border-border bg-panel p-3.5">
      <fieldset disabled={locked} className="flex flex-col gap-2">
        <legend className="mb-1.5 font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft">
          Detector
        </legend>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((option) => {
            const current = option.id === model;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setModel(option.id)}
                aria-pressed={current}
                title={option.hint}
                className={cx(
                  "flex-1 rounded-[12px] border px-3 py-2 text-left disabled:opacity-45",
                  current
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-paper hover:border-accent",
                )}
              >
                <span className="block text-[13px] font-bold">{option.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
        {/* The download is the surprise in this app, so the size is stated
            before the choice is made rather than during the wait it causes. */}
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          {isWarm(model)
            ? "Ready on this device — no connection needed."
            : `${modelSize(model)}, fetched once and kept for offline use.`}
        </p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={`${idPrefix}-score`}
            className="font-mono text-[11px] uppercase tracking-[.12em] text-ink-soft"
          >
            Only show at least
          </label>
          <span className="font-mono text-[12px] tabular-nums font-bold">
            {Math.round(minScore * 100)}%
          </span>
        </div>
        <input
          id={`${idPrefix}-score`}
          type="range"
          min={MIN_SCORE_FLOOR}
          max={MIN_SCORE_CEILING}
          step={0.05}
          value={minScore}
          onChange={(event) => setMinScore(Number(event.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Lower finds more and invents more — a blank wall starts sprouting furniture below about
          40%. Raise it when something is being named wrongly and confidently.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={showScores}
          onChange={(event) => setShowScores(event.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        Show the percentage on each box
      </label>
    </div>
  );
}
