import type { Cue } from "./types";

/**
 * Subtitles — SubRip (.srt) and WebVTT (.vtt), read into plain timed lines.
 *
 * They are drawn by the app over the picture rather than handed to the
 * `<video>` element's own text tracks, for two reasons. A room is often not
 * playing a `<video>` at all — a YouTube embed or the host's live stream has no
 * track list to add to — and a stream in particular carries no text. And one
 * subtitle file loaded by the host has to reach every guest, which means it has
 * to be data the app can send, not a track inside one browser.
 *
 * Formatting is stripped to text: `<i>`, `<b>`, `<font>`, VTT voice tags and
 * the ASS-style `{\an8}` positioning codes some SRT files carry. Getting the
 * words on screen at the right moment is the job; styling would be a second
 * renderer.
 */

/** Largest subtitle file accepted, and the most cues kept. A feature film is
 *  typically 60–150 KB and 1,000–2,000 cues. */
export const MAX_SUBTITLE_BYTES = 1_500_000;
export const MAX_CUES = 6000;

/** "01:02:03,456", "02:03.456" or "02:03" → seconds. */
export function parseTimestamp(raw: string): number | null {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/.exec(raw.trim());
  if (!match) return null;
  const [, h, m, s, ms] = match;
  const frac = ms ? Number(ms.padEnd(3, "0")) / 1000 : 0;
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s) + frac;
}

const cleanText = (line: string): string =>
  line
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

const TIMING = /^\s*(\S+)\s+-->\s+(\S+)/;

/** Read an .srt or .vtt file. Blocks that do not parse are skipped, not fatal. */
export function parseSubtitles(text: string): Cue[] {
  const blocks = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/);

  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => TIMING.test(line));
    if (at === -1) continue; // WEBVTT header, NOTE, STYLE, REGION, stray text
    const [, from, to] = TIMING.exec(lines[at])!;
    const start = parseTimestamp(from);
    const end = parseTimestamp(to);
    if (start == null || end == null || end <= start) continue;
    const body = lines
      .slice(at + 1)
      .map(cleanText)
      .filter(Boolean)
      .join("\n");
    if (!body) continue;
    cues.push({ start, end, text: body });
    if (cues.length >= MAX_CUES) break;
  }
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * The lines on screen at `time`. Cues are sorted by start, so this finds the
 * last cue to have started and walks back over any it overlaps — two speakers
 * talking at once are two cues alive at the same moment.
 */
export function cueAt(cues: readonly Cue[], time: number): string {
  let lo = 0;
  let hi = cues.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= time) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const lines: string[] = [];
  // Overlaps are rare and short; eight back is far more than any real file needs.
  for (let i = last; i >= 0 && i > last - 8; i--) {
    if (cues[i].end > time) lines.unshift(cues[i].text);
  }
  return lines.join("\n");
}
