"use client";

import { useEffect, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import type { PlayerHandle } from "@/lib/WatchParty/player";
import { correct, expectedPosition, now } from "@/lib/WatchParty/sync";
import type { Playback } from "@/lib/WatchParty/types";

/** How often a player is checked against the room. */
const TICK_MS = 400;

/** The room's position right now, from this device's point of view. */
function roomPosition(): { position: number; duration: number | null } {
  const s = useWatchPartyStore.getState();
  const pb = s.room?.playback;
  const duration = s.room?.now?.duration ?? null;
  if (!pb) return { position: 0, duration };
  const hostNow = s.role === "guest" ? now() + s.offset : now();
  const position = expectedPosition(pb, hostNow);
  return { position: duration ? Math.min(position, duration) : position, duration };
}

/**
 * Keep one player on the room's line.
 *
 * Everybody runs this — the host included. The difference is what happens when
 * a player and the line disagree:
 *
 *  - A **guest's** player is corrected toward the line (a small rate change for
 *    a small gap, a seek for a large one — see `correct`).
 *  - The **host's** player *is* the room's pace. When the host deliberately
 *    changes the line (play, pause, seek) its player jumps to match; but when
 *    it merely falls behind — buffering, or still loading a new video — the line
 *    is moved to the player instead (`reanchor`), and every guest waits.
 *    Without that split, a host on a slow connection would be dragged forward
 *    through a film it had not yet downloaded.
 */
export function useWatchPartySync(handle: PlayerHandle | null): void {
  useEffect(() => {
    if (!handle) return;
    let first = true;
    let lastPb: Playback | null = null;
    let graceUntil = 0;
    let seekCooldown = 0;
    let playAttemptAt = 0;
    let pausedSince = 0;
    let reportedAt = 0;

    const tick = () => {
      const s = useWatchPartyStore.getState();
      const item = s.room?.now;
      const pb = s.room?.playback;
      if (!item || !pb) return;
      const t = now();
      const isHost = s.role === "host";
      const known = handle.duration();
      if (isHost && known && item.duration == null) s.patchNow({ duration: known });
      const duration = known ?? item.duration;

      const hostNow = isHost ? t : t + s.offset;
      let expected = expectedPosition(pb, hostNow);
      if (duration) expected = Math.min(expected, duration);
      const actual = handle.time();
      const fresh = pb !== lastPb;
      lastPb = pb;
      let drift = actual - expected;

      if (pb.status === "paused") {
        if (!handle.paused()) handle.pause();
        drift = actual - pb.position;
        // YouTube starts playing if asked to seek before it has ever played, so
        // a paused room at the very start is left where it is.
        const untouched = handle.engine === "youtube" && actual < 0.3 && pb.position < 0.3;
        if (Math.abs(drift) > 0.3 && t > seekCooldown && !untouched) {
          handle.seek(pb.position);
          seekCooldown = t + 800;
        }
        handle.setRate(pb.rate);
        pausedSince = 0;
        if (s.needsTap) s.setNeedsTap(false);
      } else if (!(handle.ended() || (duration != null && expected >= duration - 0.3))) {
        if (handle.paused()) {
          if (t - playAttemptAt > 1500) {
            playAttemptAt = t;
            handle.play().catch((error: unknown) => {
              if ((error as { name?: string } | null)?.name === "NotAllowedError") s.setNeedsTap(true);
            });
          }
          // YouTube's play never rejects; a video that will not start is the sign.
          if (!pausedSince) pausedSince = t;
          else if (handle.engine === "youtube" && t - pausedSince > 3000 && !handle.buffering()) {
            s.setNeedsTap(true);
          }
        } else {
          pausedSince = 0;
          if (s.needsTap) s.setNeedsTap(false);
        }

        if (isHost) {
          if (first || (fresh && !pb.anchor)) {
            if (Math.abs(drift) > 0.25) handle.seek(expected);
            graceUntil = t + 1500;
          } else if (t > graceUntil && Math.abs(drift) > 0.6) {
            s.reanchor(actual);
            graceUntil = t + 1500;
          }
          handle.setRate(pb.rate);
        } else {
          const fix = correct(actual, expected, pb.rate, handle.engine);
          if (fix.kind === "seek") {
            if (t > seekCooldown) {
              // A YouTube seek takes a moment to land; aim slightly ahead of it.
              handle.seek(fix.to + (handle.engine === "youtube" ? 0.25 : 0));
              seekCooldown = t + 1500;
            }
          } else {
            handle.setRate(fix.rate);
          }
        }
      }
      first = false;

      if (t - reportedAt > 1000) {
        reportedAt = t;
        s.reportSync(Math.round(drift * 100) / 100, handle.buffering(), "sync");
      }
    };

    tick();
    const timer = window.setInterval(tick, TICK_MS);
    // A control pressed anywhere in the room lands here at once, not on the next tick.
    const unsubscribe = useWatchPartyStore.subscribe((s, prev) => {
      if (s.room?.playback !== prev.room?.playback) tick();
    });
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [handle]);
}

/**
 * Where the playhead is, for the seek bar and the subtitles — read from the
 * player when there is one, and from the room's line when this device is
 * watching the host's stream and has no player of its own to ask.
 */
export function usePlayhead(handle: PlayerHandle | null): { position: number; duration: number | null } {
  const [head, setHead] = useState<{ position: number; duration: number | null }>({
    position: 0,
    duration: null,
  });

  useEffect(() => {
    const read = () => {
      const fallback = roomPosition();
      const next = handle
        ? { position: handle.time(), duration: handle.duration() ?? fallback.duration }
        : fallback;
      setHead((prev) =>
        Math.abs(prev.position - next.position) < 0.05 && prev.duration === next.duration ? prev : next,
      );
    };
    read();
    const timer = window.setInterval(read, 250);
    return () => window.clearInterval(timer);
  }, [handle]);

  return head;
}
