"use client";

import { useState } from "react";
import { useStreamsStore } from "@/store/useStreamsStore";
import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";
import { StreamGrid } from "@/components/Streams/organisms/StreamGrid";
import { SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { MAX_QUERY_LENGTH } from "@/lib/Streams/catalog";

const FILTERS = [
  { id: "video", label: "Everything", hint: "Any video on YouTube" },
  { id: "music", label: "Music", hint: "Narrowed to music videos and mixes" },
  { id: "live", label: "Live now", hint: "Only channels broadcasting right now" },
] as const;

/**
 * Free search over YouTube, with the same three filters the curated tabs use.
 *
 * Submitted rather than typed-through: a request per keystroke would be a search
 * of YouTube per keystroke, which is slow on a phone and rude to the service.
 * Pressing Enter (or the button) is what runs it, and the term is kept in the
 * store so leaving the tab and coming back shows the results still cached for it.
 */
export function SearchPanel() {
  const query = useStreamsStore((s) => s.query);
  const setQuery = useStreamsStore((s) => s.setQuery);
  const kind = useStreamsStore((s) => s.searchKind);
  const setKind = useStreamsStore((s) => s.setSearchKind);

  // The field is local; only a submitted term becomes the query that is fetched.
  const [draft, setDraft] = useState(query);

  return (
    <div className="flex flex-col gap-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(draft.trim().slice(0, MAX_QUERY_LENGTH));
        }}
        className="flex gap-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-panel px-4 py-2.5 focus-within:border-accent">
          <SearchIcon size={16} className="flex-none text-ink-soft" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Song, artist, channel, anything"
            aria-label="Search YouTube"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-ink-soft"
          />
        </div>
        <button
          type="submit"
          className="flex-none rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Search
        </button>
      </form>

      <ChipBar
        label="Search filters"
        items={FILTERS}
        value={kind}
        onChange={setKind}
      />

      <StreamGrid
        query={query}
        kind={kind}
        idle={
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <SearchIcon size={32} className="text-ink-soft" />
            <p className="text-[14px] font-semibold">Search YouTube</p>
            <p className="max-w-[320px] text-[12.5px] text-ink-soft">
              Type anything — a song, an artist, a channel — and pick a card to play it here.
            </p>
          </div>
        }
      />
    </div>
  );
}
