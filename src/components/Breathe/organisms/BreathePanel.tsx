"use client";

import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";
import { BreathStage } from "@/components/Breathe/organisms/BreathStage";
import { SessionControls } from "@/components/Breathe/molecules/SessionControls";
import { CueToggles } from "@/components/Breathe/molecules/CueToggles";
import { useBreatheStore } from "@/store/useBreatheStore";
import { CUSTOM_ID, LENGTHS, PATTERNS, type Length } from "@/lib/Breathe/patterns";

const PATTERN_CHIPS = [
  ...PATTERNS.map((p) => ({ id: p.id, label: p.name, hint: p.rhythm })),
  { id: CUSTOM_ID, label: "Your own", hint: "The pattern you set on the Patterns tab" },
];

const LENGTH_CHIPS = LENGTHS.map((m) => ({
  id: String(m) as `${Length}`,
  label: m === 0 ? "Open" : `${m} min`,
  hint: m === 0 ? "Keep going until you stop" : `About ${m} minute${m === 1 ? "" : "s"}, ending on an exhale`,
}));

/** The exercise itself: the orb, and the few choices worth making before it. */
export function BreathePanel() {
  const status = useBreatheStore((s) => s.status);
  const patternId = useBreatheStore((s) => s.patternId);
  const length = useBreatheStore((s) => s.length);
  const choose = useBreatheStore((s) => s.choose);
  const setPrefs = useBreatheStore((s) => s.setPrefs);
  const busy = status === "running" || status === "paused";

  return (
    <div className="flex flex-col gap-5">
      <ChipBar label="Pattern" items={PATTERN_CHIPS} value={patternId} onChange={choose} />

      <BreathStage />

      <SessionControls />

      {/* Choices that would change a session under you are set between sessions.
          `min-w-0`: a fieldset defaults to min-content width, so without it the
          sideways-scrolling chip row would stretch it past a phone's edge. */}
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-border bg-panel p-4 disabled:opacity-60">
        <legend className="sr-only">Session settings</legend>
        <div>
          <p className="mb-2 text-[13px] font-bold">Length</p>
          <ChipBar
            label="Session length"
            items={LENGTH_CHIPS}
            value={String(length) as `${Length}`}
            onChange={(id) => setPrefs({ length: Number(id) as Length })}
            className="-mx-4 px-4"
          />
        </div>
        <CueToggles />
      </fieldset>
    </div>
  );
}
