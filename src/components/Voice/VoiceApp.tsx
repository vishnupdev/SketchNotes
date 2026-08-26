"use client";

import { useEffect, useMemo } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { audioUsage, searchMemos, useVoiceStore } from "@/store/useVoiceStore";
import { Recorder } from "@/components/Voice/organisms/Recorder";
import { MemoCard } from "@/components/Voice/molecules/MemoCard";
import { AppBrand } from "@/components/SketchNotes/molecules/AppBrand";
import { AppFooter } from "@/components/SketchNotes/molecules/AppFooter";
import { AppsIcon, SearchIcon, VoiceMemoIcon } from "@/components/SketchNotes/atoms/icons";
import { formatBytes } from "@/lib/utils";

/**
 * Voice Memos — say it now, find it later.
 *
 * The transcript is the feature, not the decoration. Audio is unsearchable, which
 * is why voice memos pile up unlistened in every phone's recorder app; a memo with
 * a transcript is a note you happened to speak instead of type. So the search box
 * spans transcripts, and when space runs short it is the *audio* that is dropped
 * and the transcript that is kept (see `useVoiceStore`).
 *
 * Recording is entirely local. Transcription is not — it uses the browser's speech
 * service — so it is off until switched on, and the recorder says so plainly rather
 * than burying it. That is the one honest caveat in this app and it belongs on the
 * surface.
 */
export function VoiceApp() {
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const memos = useVoiceStore((s) => s.memos);
  const query = useVoiceStore((s) => s.query);
  const setQuery = useVoiceStore((s) => s.setQuery);
  const ready = useVoiceStore((s) => s.ready);
  const hydrate = useVoiceStore((s) => s.hydrate);

  // Adopt the saved library once, after mount (avoids an SSR mismatch).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const visible = useMemo(() => searchMemos(memos, query), [memos, query]);
  const usage = useMemo(() => audioUsage(memos), [memos]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-paper px-[22px] pb-[18px] pt-[22px]">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-end justify-between gap-4">
          <AppBrand
            icon={<VoiceMemoIcon size={24} />}
            name="Voice Memos"
            tagline="say it now, find it later"
          />

          <button
            type="button"
            onClick={openLauncher}
            title="Switch app"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.1em] hover:border-accent hover:text-accent"
          >
            <AppsIcon size={15} />
            Apps
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-6 pt-[22px]">
        <div className="flex flex-col gap-4">
          <Recorder />

          {memos.length > 0 && (
            <>
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                >
                  <SearchIcon size={16} />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles and transcripts"
                  aria-label="Search memos"
                  className="w-full rounded-full border-[1.5px] border-border bg-panel py-2.5 pl-9 pr-3 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft">
                  {visible.length} of {memos.length}{" "}
                  {memos.length === 1 ? "memo" : "memos"}
                </p>
                <p
                  className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-soft"
                  title="Audio is stored on this device. Past the cap, the oldest audio is cleared and its transcript kept."
                >
                  {formatBytes(usage.bytes)} of audio kept ·{" "}
                  {Math.round(usage.share * 100)}% of the limit
                </p>
              </div>
            </>
          )}

          {visible.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-panel px-4 py-8 text-center text-[13.5px] leading-relaxed text-ink-soft">
              {!ready
                ? "Opening your memos…"
                : memos.length === 0
                  ? "No memos yet. Press the microphone and start talking — turn on transcription first if you want to be able to search them later."
                  : "No memo matches that search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visible.map((memo) => (
                <MemoCard key={memo.id} memo={memo} />
              ))}
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
