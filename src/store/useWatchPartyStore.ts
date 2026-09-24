"use client";

import { create } from "zustand";
import { sGet, sSet } from "@/lib/storage";
import { uid } from "@/lib/utils";
import type { ReachMode } from "@/lib/rtc/peer";
import { GuestRoom, HostRoom, type GuestEvents, type HostEvents, type InviteView } from "@/lib/WatchParty/room";
import { cleanName, type Control, type SharedSubs } from "@/lib/WatchParty/protocol";
import { parseLink } from "@/lib/WatchParty/media";
import { MAX_SUBTITLE_BYTES, parseSubtitles } from "@/lib/WatchParty/subtitles";
import { micError } from "@/lib/WatchParty/voice";
import {
  cleanOutputs,
  listOutputs,
  clampDelay,
  DEFAULT_TUNE,
  MAX_NAME as MAX_OUTPUT_NAME,
  MAX_OUTPUTS,
  outputsError,
  revealOutputs,
  type ChosenOutput,
  type OutputDevice,
  type OutputTune,
} from "@/lib/WatchParty/outputs";
import { outputMixer } from "@/lib/WatchParty/output-mixer";
import { friendlyName } from "@/lib/WatchParty/names";
import type {
  ChatMessage,
  Cue,
  MemberStatus,
  Reaction,
  Role,
  RoomSettings,
  RoomSnapshot,
} from "@/lib/WatchParty/types";

const NAME_KEY = "sknotes:watchparty:name";
const PREFS_KEY = "sknotes:watchparty:prefs";
const RECENT_KEY = "sknotes:watchparty:recent";

export type PartyTab = "watch" | "queue" | "chat" | "people";
export const PARTY_TABS: PartyTab[] = ["watch", "queue", "chat", "people"];

export interface Prefs {
  volume: number;
  muted: boolean;
  voiceVolume: number;
  captions: boolean;
  /** Seconds added to subtitle timing, for a file that runs early or late. */
  subOffset: number;
  /** Last reach chosen for an invite. */
  reach: ReachMode;
  /** Extra speakers and headphones the room also plays on. */
  outputs: ChosenOutput[];
  /** Keep playing on the system's own output while extra ones are on. */
  localSpeaker: boolean;
}

const DEFAULT_PREFS: Prefs = {
  volume: 0.9,
  muted: false,
  voiceVolume: 1,
  captions: true,
  subOffset: 0,
  reach: "internet",
  outputs: [],
  localSpeaker: true,
};

/** Something drifting up over the picture — a reaction, or a chat line. */
export interface Floater {
  id: string;
  kind: "react" | "chat";
  text: string;
  name: string;
  slot: number;
  /** Horizontal start, percent of the stage. */
  x: number;
}

export interface SubsState {
  itemId: string;
  cues: Cue[];
  /** Loaded on this device only, rather than shared by the host. */
  mine: boolean;
}

export interface OwnCopy {
  itemId: string;
  url: string;
  name: string;
  /** Same size as the host's file — the likeliest sign it is the same cut. */
  sizeMatch: boolean;
}

type Phase = "lobby" | "joining" | "room" | "ended";

interface PartyState {
  hydrated: boolean;
  tab: PartyTab;
  name: string;
  prefs: Prefs;
  recent: string[];

  phase: Phase;
  role: Role | null;
  me: string | null;
  room: RoomSnapshot | null;
  chat: ChatMessage[];
  unread: number;
  floaters: Floater[];
  invites: InviteView[];
  /** The guest's reply code while waiting to be let in. */
  reply: string | null;
  joinStatus: string;
  endedReason: string | null;
  error: string | null;
  toast: { id: string; text: string } | null;

  /** Guest's estimate of host clock − local clock, in ms. */
  offset: number;
  rtt: number | null;
  sync: { drift: number | null; buffering: boolean };
  speaking: string[];
  micOn: boolean;
  micBusy: boolean;
  /** Guest: the host's stream and the voice mix. */
  remote: { media: MediaStream | null; voice: MediaStream | null };
  /** Host: each guest's voice, to play here. */
  voices: Array<{ id: string; track: MediaStreamTrack }>;
  /** Host: its own shared screen, for the preview. */
  screen: MediaStream | null;
  subs: SubsState | null;
  ownCopy: OwnCopy | null;
  /** The browser blocked playback until someone taps. */
  needsTap: boolean;
  /** The sound of what is playing here, for the extra outputs to play. */
  tap: MediaStream | null;
  /** This device's audio outputs, as last listed. */
  devices: OutputDevice[];
  /** Whether the outputs' names have been revealed yet. */
  devicesListed: boolean;
  devicesBusy: boolean;

  hydrate: () => Promise<void>;
  setTab: (tab: PartyTab) => void;
  setName: (name: string) => void;
  setPrefs: (patch: Partial<Prefs>) => void;

  startRoom: (roomName: string) => void;
  join: (invite: string) => Promise<void>;
  cancelJoin: () => void;
  leave: () => void;
  dismissEnded: () => void;

  invite: () => Promise<void>;
  acceptReply: (id: string, code: string) => Promise<void>;
  cancelInvite: (id: string) => void;

  control: (control: Control) => void;
  addLink: (raw: string, where: "now" | "next" | "end") => { ok: true } | { ok: false; reason: string };
  addFiles: (files: File[], where: "now" | "end") => number;
  shareScreen: () => Promise<void>;
  playNow: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, delta: -1 | 1) => void;
  skip: () => void;
  voteSkip: () => void;

  sendChat: (text: string) => void;
  react: (emoji: Reaction) => void;
  setSettings: (patch: Partial<RoomSettings>) => void;
  renameRoom: (name: string) => void;
  kick: (id: string) => void;

  toggleMic: () => Promise<void>;
  loadSubs: (file: File, forEveryone: boolean) => Promise<void>;
  clearSubs: () => void;
  setOwnCopy: (file: File | null) => void;

  /* Extra speakers and headphones on this device. */
  refreshDevices: () => Promise<void>;
  findDevices: () => Promise<void>;
  addOutput: (device: OutputDevice) => void;
  removeOutput: (id: string) => void;
  /** Change how one output plays; `name: ""` clears the listener's own name. */
  tuneOutput: (id: string, patch: Partial<OutputTune> & { name?: string }) => void;
  /** Play the sync clicks or the identify chime on some outputs. */
  pingOutputs: (ids: string[], kind: "sync" | "identify") => void;

  /* Wired to the player by the stage. */
  setTap: (stream: MediaStream | null) => void;
  reportSync: (drift: number | null, buffering: boolean, mode: MemberStatus["mode"]) => void;
  reanchor: (position: number) => void;
  patchNow: (patch: { duration?: number; title?: string; audio?: boolean }) => void;
  hostEnded: () => void;
  hostBroken: (reason: string) => void;
  setOutgoing: (stream: MediaStream | null) => void;
  fileUrl: (itemId: string) => string | null;
  setNeedsTap: (value: boolean) => void;
  notify: (text: string) => void;
  /** The app is unmounting: close the microphone, keep the room. */
  release: () => void;
}

/* The room engines hold live connections and an AudioContext — nothing React
   should compare — so they sit beside the store, as the Metronome engine does. */
let host: HostRoom | null = null;
let guest: GuestRoom | null = null;
let prefsTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const SESSION_RESET = {
  role: null,
  me: null,
  room: null,
  chat: [],
  unread: 0,
  floaters: [],
  invites: [],
  reply: null,
  joinStatus: "",
  offset: 0,
  rtt: null,
  sync: { drift: null, buffering: false },
  speaking: [],
  micOn: false,
  micBusy: false,
  remote: { media: null, voice: null },
  voices: [],
  screen: null,
  subs: null,
  ownCopy: null,
  needsTap: false,
  tap: null,
} satisfies Partial<PartyState>;

function parsePrefs(raw: string | null): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const p = JSON.parse(raw) as Partial<Prefs>;
    const num = (v: unknown, lo: number, hi: number, d: number) =>
      typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
    return {
      volume: num(p.volume, 0, 1, DEFAULT_PREFS.volume),
      muted: p.muted === true,
      voiceVolume: num(p.voiceVolume, 0, 1, DEFAULT_PREFS.voiceVolume),
      captions: p.captions !== false,
      subOffset: num(p.subOffset, -30, 30, 0),
      reach: p.reach === "local" ? "local" : "internet",
      outputs: cleanOutputs(p.outputs),
      localSpeaker: p.localSpeaker !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Watch Party's state — the lobby, the room as last published by the host, and
 * this device's own view of it (chat read, volume, subtitles, the mic).
 *
 * Both engines report through the same handful of events, so the rest of the
 * app renders one `room` and never asks which side of the connection it is on
 * except to decide what to *offer* (only a host can pick a file to stream).
 */
export const useWatchPartyStore = create<PartyState>((set, get) => {
  const notify = (text: string) => {
    const id = uid();
    set({ toast: { id, text } });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 4500);
  };

  const float = (floater: Omit<Floater, "id" | "x">) => {
    const item: Floater = { ...floater, id: uid(), x: 8 + Math.random() * 78 };
    set((s) => ({ floaters: [...s.floaters.slice(-24), item] }));
    setTimeout(
      () => set((s) => ({ floaters: s.floaters.filter((f) => f.id !== item.id) })),
      floater.kind === "chat" ? 5200 : 3400,
    );
  };

  const memberOf = (id: string) => get().room?.members.find((m) => m.id === id);

  const onRoom = (room: RoomSnapshot) => {
    const { ownCopy, subs } = get();
    const nowId = room.now?.id ?? null;
    const patch: Partial<PartyState> = { room };
    // Things tied to one item do not outlive it.
    if (ownCopy && ownCopy.itemId !== nowId) {
      URL.revokeObjectURL(ownCopy.url);
      patch.ownCopy = null;
    }
    if (subs && subs.itemId !== nowId) patch.subs = null;
    if (!room.now) patch.needsTap = false;
    set(patch);
  };

  const onChat = (message: ChatMessage) => {
    const { tab, me } = get();
    set((s) => ({
      chat: [...s.chat.slice(-199), message],
      unread: tab !== "chat" && message.from !== me ? s.unread + 1 : s.unread,
    }));
    // Other people's words also drift over the picture, so a chat is never
    // missed by someone watching full screen.
    if (message.from && message.from !== me) {
      float({ kind: "chat", text: message.text, name: message.name, slot: message.slot });
    }
  };

  const onReact = (from: string, emoji: Reaction) => {
    const member = memberOf(from);
    float({ kind: "react", text: emoji, name: member?.name ?? "", slot: member?.slot ?? 0 });
  };

  const onSubs = (shared: SharedSubs | null) => {
    if (get().subs?.mine) return; // your own file wins over the host's
    set({ subs: shared ? { ...shared, mine: false } : null });
  };

  const endSession = (reason: string | null) => {
    const { ownCopy } = get();
    if (ownCopy) URL.revokeObjectURL(ownCopy.url);
    host = null;
    guest = null;
    set({ ...SESSION_RESET, phase: reason ? "ended" : "lobby", endedReason: reason, tab: "watch" });
  };

  const hostEvents = (): HostEvents => ({
    room: onRoom,
    chat: onChat,
    react: onReact,
    subs: onSubs,
    speaking: (ids) => set({ speaking: ids }),
    invites: (invites) => set({ invites }),
    voices: (voices) => set({ voices }),
    screen: (screen) => set({ screen }),
    notice: notify,
  });

  const guestEvents = (): GuestEvents => ({
    joined: (me, room, chat, shared) => {
      set({ phase: "room", role: "guest", me, chat, reply: null, tab: "watch", error: null });
      onRoom(room);
      onSubs(shared);
    },
    room: onRoom,
    chat: onChat,
    react: onReact,
    subs: onSubs,
    speaking: (ids) => set({ speaking: ids }),
    notice: notify,
    remote: (media, voice) => set({ remote: { media, voice } }),
    clock: (offset, rtt) => set({ offset, rtt }),
    status: (joinStatus) => set({ joinStatus }),
    ended: (reason) => endSession(reason),
  });

  const remember = (link: string) => {
    const recent = [link, ...get().recent.filter((r) => r !== link)].slice(0, 8);
    set({ recent });
    void sSet(RECENT_KEY, JSON.stringify(recent));
  };

  return {
    hydrated: false,
    tab: "watch",
    name: "",
    prefs: DEFAULT_PREFS,
    recent: [],
    phase: "lobby",
    endedReason: null,
    error: null,
    toast: null,
    devices: [],
    devicesListed: false,
    devicesBusy: false,
    ...SESSION_RESET,

    hydrate: async () => {
      if (get().hydrated) return;
      const [name, prefs, recent] = await Promise.all([sGet(NAME_KEY), sGet(PREFS_KEY), sGet(RECENT_KEY)]);
      let links: string[] = [];
      try {
        const parsed: unknown = recent ? JSON.parse(recent) : [];
        if (Array.isArray(parsed)) links = parsed.filter((l): l is string => typeof l === "string").slice(0, 8);
      } catch {
        /* a damaged list is just an empty one */
      }
      // A first visit starts with a name already in place, kept so it stays the same next time.
      const kept = name ? cleanName(name) : "";
      const start = kept || friendlyName();
      if (!kept) void sSet(NAME_KEY, start);
      set({ hydrated: true, name: start, prefs: parsePrefs(prefs), recent: links });
    },

    setTab: (tab) => set(tab === "chat" ? { tab, unread: 0 } : { tab }),

    setName: (name) => {
      set({ name });
      void sSet(NAME_KEY, cleanName(name));
    },

    setPrefs: (patch) => {
      const prefs = { ...get().prefs, ...patch };
      set({ prefs });
      if (prefsTimer) clearTimeout(prefsTimer);
      prefsTimer = setTimeout(() => void sSet(PREFS_KEY, JSON.stringify(prefs)), 400);
    },

    /* ------------------------------ lifecycle ------------------------------ */

    startRoom: (roomName) => {
      const name = cleanName(get().name) || friendlyName();
      host?.end();
      host = new HostRoom(name, roomName, hostEvents());
      set({ ...SESSION_RESET, phase: "room", role: "host", me: host.me.id, tab: "people", error: null });
      // The first thing every host does next is invite someone — so it is
      // already made, waiting to be shared, when the room opens.
      void host.createInvite(get().prefs.reach);
    },

    join: async (invite) => {
      const name = cleanName(get().name) || friendlyName();
      guest?.leave();
      set({ ...SESSION_RESET, phase: "joining", joinStatus: "Opening the invite…", error: null });
      try {
        const room = await GuestRoom.open(invite, name, guestEvents());
        guest = room;
        set({ reply: room.replyCode, joinStatus: "Waiting for the host to let you in…" });
      } catch (error) {
        guest = null;
        set({ phase: "lobby", error: (error as Error).message || "That invite couldn't be opened." });
      }
    },

    cancelJoin: () => {
      guest?.leave();
      endSession(null);
    },

    leave: () => {
      if (host) host.end();
      if (guest) guest.leave();
      endSession(null);
    },

    dismissEnded: () => set({ phase: "lobby", endedReason: null }),

    /* ------------------------------- invites ------------------------------- */

    invite: async () => {
      host?.resumeAudio();
      await host?.createInvite(get().prefs.reach);
    },
    acceptReply: async (id, code) => {
      host?.resumeAudio();
      await host?.acceptReply(id, code);
    },
    cancelInvite: (id) => host?.cancelInvite(id),

    /* ------------------------------ playback ------------------------------- */

    control: (control) => {
      if (host) {
        host.resumeAudio();
        host.control(control);
      } else {
        guest?.send({ t: "control", ...control });
      }
    },

    addLink: (raw, where) => {
      const parsed = parseLink(raw);
      if (!parsed.ok) return parsed;
      if (host) {
        const result = host.addLink(raw, host.me.name, where);
        if (result.ok) remember(raw.trim());
        return result;
      }
      if (!get().room?.settings.guestQueue) {
        return { ok: false, reason: "The host has turned off adding to the queue." };
      }
      guest?.send({ t: "add", link: raw.trim(), next: where !== "end" });
      remember(raw.trim());
      return { ok: true };
    },

    addFiles: (files, where) => host?.addFiles(files, where) ?? 0,

    shareScreen: async () => {
      if (!host) return;
      try {
        await host.shareScreen();
      } catch (error) {
        // Closing the browser's picker is a choice, not a failure.
        if ((error as { name?: string }).name !== "NotAllowedError") notify("Screen sharing couldn't start.");
      }
    },

    playNow: (id) => host?.playNow(id),
    remove: (id) => host?.remove(id),
    move: (id, delta) => host?.move(id, delta),
    skip: () => host?.next(),
    voteSkip: () => {
      if (host) host.vote();
      else guest?.send({ t: "vote" });
    },

    /* ----------------------------- social ---------------------------------- */

    sendChat: (text) => {
      if (!text.trim()) return;
      if (host) host.sendChat(text);
      else guest?.send({ t: "chat", text });
    },

    react: (emoji) => {
      if (host) host.react(emoji);
      else guest?.send({ t: "react", emoji });
    },

    setSettings: (patch) => host?.setSettings(patch),
    renameRoom: (name) => host?.rename(name),
    kick: (id) => host?.kick(id),

    toggleMic: async () => {
      const room = host ?? guest;
      if (!room || get().micBusy) return;
      const on = !get().micOn;
      set({ micBusy: true });
      try {
        await room.setMic(on);
        set({ micOn: on });
      } catch (error) {
        notify(micError(error));
      } finally {
        set({ micBusy: false });
      }
    },

    loadSubs: async (file, forEveryone) => {
      const item = get().room?.now;
      if (!item) return;
      if (file.size > MAX_SUBTITLE_BYTES) {
        notify("That file is too large to be subtitles.");
        return;
      }
      const cues = parseSubtitles(await file.text());
      if (!cues.length) {
        notify("No subtitles were found in that file. It needs to be .srt or .vtt.");
        return;
      }
      if (forEveryone && host) {
        set({ subs: null });
        host.setSubs(cues);
      } else {
        set({ subs: { itemId: item.id, cues, mine: true } });
      }
      get().setPrefs({ captions: true });
    },

    clearSubs: () => {
      const { subs } = get();
      if (host && subs && !subs.mine) host.setSubs(null);
      else set({ subs: null });
    },

    setOwnCopy: (file) => {
      const { ownCopy, room } = get();
      if (ownCopy) URL.revokeObjectURL(ownCopy.url);
      const item = room?.now;
      if (!file || !item) {
        set({ ownCopy: null });
        return;
      }
      set({
        ownCopy: {
          itemId: item.id,
          url: URL.createObjectURL(file),
          name: file.name,
          sizeMatch: item.size == null || item.size === file.size,
        },
        needsTap: false,
      });
    },

    /* ------------------------- speakers & headphones ------------------------ */

    refreshDevices: async () => {
      const { devices, named } = await listOutputs();
      set({ devices, devicesListed: named });
    },

    findDevices: async () => {
      if (get().devicesBusy) return;
      set({ devicesBusy: true });
      try {
        const picked = await revealOutputs();
        await get().refreshDevices();
        // Firefox's picker hands back the one output chosen — add it straight away.
        const device = picked ? get().devices.find((d) => d.id === picked) : undefined;
        if (device) get().addOutput(device);
      } catch (error) {
        notify(outputsError(error));
      } finally {
        set({ devicesBusy: false });
      }
    },

    addOutput: (device) => {
      const { outputs } = get().prefs;
      if (outputs.some((o) => o.id === device.id)) return;
      if (outputs.length >= MAX_OUTPUTS) {
        notify(`Up to ${MAX_OUTPUTS} extra outputs at once.`);
        return;
      }
      get().setPrefs({ outputs: [...outputs, { ...DEFAULT_TUNE, id: device.id, label: device.label }] });
      outputMixer().resume();
    },

    removeOutput: (id) => {
      const outputs = get().prefs.outputs.filter((o) => o.id !== id);
      // With nothing extra left, the system output must not stay silenced.
      get().setPrefs(outputs.length ? { outputs } : { outputs, localSpeaker: true });
    },

    tuneOutput: (id, patch) => {
      const outputs = get().prefs.outputs.map((o) => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch };
        next.volume = Math.min(1, Math.max(0, next.volume));
        next.delayMs = clampDelay(next.delayMs);
        if (patch.name !== undefined) {
          const name = patch.name.slice(0, MAX_OUTPUT_NAME);
          if (name.trim()) next.name = name;
          else delete next.name;
        }
        return next;
      });
      get().setPrefs({ outputs });
    },

    pingOutputs: (ids, kind) => outputMixer().ping(ids, kind),

    /* ---------------------------- player wiring ---------------------------- */

    setTap: (tap) => set({ tap }),

    reportSync: (drift, buffering, mode) => {
      set({ sync: { drift, buffering } });
      if (host) host.setOwnStatus({ rtt: null, drift, buffering, mode });
      else guest?.report({ drift, buffering, mode });
    },
    reanchor: (position) => host?.reanchor(position),
    patchNow: (patch) => host?.patchNow(patch),
    hostEnded: () => host?.next(),
    hostBroken: (reason) => host?.skipBroken(reason),
    setOutgoing: (stream) => host?.setOutgoing(stream),
    fileUrl: (itemId) => host?.fileUrl(itemId) ?? null,
    setNeedsTap: (needsTap) => set({ needsTap }),
    notify,

    release: () => {
      if (get().micOn) void get().toggleMic();
    },
  };
});

/** Whether this device may press play, pause, seek and change speed. */
export const selectCanControl = (s: PartyState): boolean =>
  s.role === "host" || (s.room?.settings.guestControl ?? false);

/**
 * Whether the system's own output should fall silent: the listener asked for
 * that, and at least one chosen output is connected to take over. A choice
 * whose headphones are switched off never leaves the room with no sound.
 */
export const selectSilenceLocal = (s: PartyState): boolean =>
  !s.prefs.localSpeaker && s.prefs.outputs.some((o) => s.devices.some((d) => d.id === o.id));
