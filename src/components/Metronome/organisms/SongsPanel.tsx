"use client";

import { useState } from "react";
import { PlayIcon, PlusIcon, TrashIcon } from "@/components/SketchNotes/atoms/icons";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { useMetronomeStore } from "@/store/useMetronomeStore";
import { describeSong } from "@/lib/Metronome/settings";

/**
 * Tempos kept under a name. The point is the rehearsal and the gig: a set list
 * where each song is one tap away from its tempo, metre, accents and
 * subdivision, instead of a number scribbled on the setlist and dialled in
 * by hand between songs.
 */
export function SongsPanel() {
  const songs = useMetronomeStore((s) => s.songs);
  const settings = useMetronomeStore((s) => s.settings);
  const saveSong = useMetronomeStore((s) => s.saveSong);
  const loadSong = useMetronomeStore((s) => s.loadSong);
  const removeSong = useMetronomeStore((s) => s.removeSong);
  const setTool = useMetronomeStore((s) => s.setTool);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSong(name);
          setName("");
        }}
        className="rounded-[14px] border border-border bg-panel p-4"
      >
        <label htmlFor="metronome-song-name" className="text-[13.5px] font-bold">
          Save the current setup
        </label>
        <p className="mt-0.5 text-[12px] text-ink-soft">{describeSong(settings)}</p>
        <div className="mt-3 flex gap-2">
          <input
            id="metronome-song-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Song or exercise name"
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-paper px-3 text-[14px] outline-none focus:border-accent"
          />
          <PrimaryButton type="submit" className="h-10">
            <PlusIcon size={16} />
            Save
          </PrimaryButton>
        </div>
      </form>

      {songs.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border p-4 text-[13px] leading-relaxed text-ink-soft">
          Nothing saved yet. Set a tempo and a bar on the Beat tab, name it here, and it becomes one
          tap on the night — accents and subdivision included.
        </p>
      ) : (
        <ol aria-label="Saved songs" className="flex flex-col gap-2">
          {songs.map((song, index) => (
            <li
              key={song.id}
              className="flex min-w-0 items-center gap-2 rounded-[14px] border border-border bg-panel p-2 pl-4"
            >
              <span className="w-6 flex-none font-mono text-[11px] tabular-nums text-ink-soft">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold">{song.name}</span>
                <span className="block truncate font-mono text-[11px] text-ink-soft">
                  {describeSong(song)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  loadSong(song.id);
                  setTool("beat");
                }}
                aria-label={`Load ${song.name}`}
                className="flex h-10 flex-none items-center gap-1.5 rounded-[10px] border border-border bg-paper px-3 text-[13px] font-semibold hover:border-accent hover:text-accent"
              >
                <PlayIcon size={15} />
                Load
              </button>
              <button
                type="button"
                onClick={() => removeSong(song.id)}
                aria-label={`Delete ${song.name}`}
                title="Delete"
                className="grid size-10 flex-none place-items-center rounded-[10px] text-ink-soft hover:bg-paper hover:text-danger"
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className="text-[12px] leading-relaxed text-ink-soft">
        Kept in this browser only, and carried by Settings → Data backups like everything else
        here.
      </p>
    </div>
  );
}
