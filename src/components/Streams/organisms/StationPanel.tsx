"use client";

import { useStreamsStore } from "@/store/useStreamsStore";
import { ChipBar } from "@/components/SketchNotes/molecules/ChipBar";
import { NavView } from "@/components/SketchNotes/atoms/NavView";
import { StreamGrid } from "@/components/Streams/organisms/StreamGrid";
import {
  LIVE_STATIONS,
  LIVE_STATION_ORDER,
  MUSIC_STATIONS,
  MUSIC_STATION_ORDER,
  stationById,
} from "@/lib/Streams/catalog";

/**
 * One of the two curated tabs: a row of station chips over the results for the
 * chosen one.
 *
 * Music and Live are the same panel with a different set of stations and a
 * different YouTube filter, so they share this component rather than existing
 * twice. Switching station animates the grid in from the side the chip sits on
 * (see {@link NavView}), and each station keeps its own cached results, so
 * coming back to one is instant.
 */
export function StationPanel({ kind }: { kind: "music" | "live" }) {
  const music = kind === "music";

  const station = useStreamsStore((s) => (music ? s.musicStation : s.liveStation));
  const setMusicStation = useStreamsStore((s) => s.setMusicStation);
  const setLiveStation = useStreamsStore((s) => s.setLiveStation);
  const setStation = music ? setMusicStation : setLiveStation;

  const stations = music ? MUSIC_STATIONS : LIVE_STATIONS;
  const order = music ? MUSIC_STATION_ORDER : LIVE_STATION_ORDER;
  const current = stationById(kind, station) ?? stations[0];

  return (
    <div className="flex flex-col gap-4">
      <ChipBar
        label={music ? "Music stations" : "Live stations"}
        items={stations}
        value={current.id}
        onChange={setStation}
      />

      <h2 className="sr-only">
        {current.label} — {music ? "music" : "live channels"}
      </h2>

      <NavView viewKey={current.id} order={order}>
        <StreamGrid query={current.query} kind={kind} />
      </NavView>
    </div>
  );
}
