import { decodeCode, encodeCode, inviteLink } from "@/lib/rtc/code";
import { createAnswer, createOffer, whenOpen, type Peer, type ReachMode } from "@/lib/rtc/peer";
import { uid } from "@/lib/utils";
import { isAudioFile, isMediaFile, parseLink, titleFromName } from "./media";
import {
  cleanName,
  encodeFrames,
  MAX_CHAT,
  MAX_ROOM_NAME,
  parseGuest,
  parseHost,
  PROTOCOL,
  Reassembler,
  type Control,
  type GuestMsg,
  type HostMsg,
  type Mids,
  type SharedSubs,
} from "./protocol";
import { ClockSync, expectedPosition, now } from "./sync";
import {
  DEFAULT_SETTINGS,
  MAX_MEMBERS,
  type ChatMessage,
  type Cue,
  type MediaItem,
  type Member,
  type MemberStatus,
  type Playback,
  type Reaction,
  type RoomSettings,
  type RoomSnapshot,
} from "./types";
import { openMic, SpeakingDetector, VoiceMixer } from "./voice";

/**
 * The room itself — the hub on the host's device, and the spoke on a guest's.
 *
 * **Joining.** Each guest is let in by the same hand-carried exchange File Drop
 * uses (`lib/rtc`): the host makes an invite, the guest opens it and hands back
 * a reply, the host pastes the reply. That buys a room with no server and no
 * account — and costs one invite per guest, because a WebRTC offer can only ever
 * be answered once.
 *
 * **Media, after joining.** The invite carries only a data channel, which keeps
 * it short enough for one QR code. Once the guest is in, the host adds four
 * media lines over that channel (a renegotiation — no second code): the
 * streamed picture and its sound, the voice mix the guest hears, and the
 * guest's own microphone. All four are created empty; starting a stream or
 * opening a mic later is a `replaceTrack`, which needs no negotiation at all.
 * The host is the only side that ever sends an offer, so the two ends can
 * never collide mid-negotiation.
 */

const CHANNEL = "party";

/** A guest who has said nothing for this long is gone, whatever ICE thinks.
 *  Guests ping every two seconds. */
const SILENT_MS = 20_000;

/** How long the host waits for a pasted reply to turn into a connection. */
const CONNECT_MS = 25_000;

const CHAT_KEPT = 200;
const HISTORY_KEPT = 20;
const QUEUE_MAX = 200;

const unreachable = (mode: ReachMode): string =>
  mode === "local"
    ? "Couldn't connect. With “this network only”, both devices have to be on the same Wi-Fi or hotspot."
    : "Couldn't find a direct route between these two networks. A few network pairs (usually two strict mobile carriers) can't be connected without a relay — try both devices on one Wi-Fi.";

const idleStatus = (): MemberStatus => ({ rtt: null, drift: null, buffering: false, mode: "idle" });

/** One data channel with framing on both sides. */
class Wire {
  private reasm = new Reassembler();
  onMessage: (raw: unknown) => void = () => {};

  constructor(readonly channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const value = this.reasm.accept(event.data);
      if (value !== null) this.onMessage(value);
    };
  }

  send(message: HostMsg | GuestMsg): void {
    if (this.channel.readyState !== "open") return;
    for (const frame of encodeFrames(message)) {
      try {
        this.channel.send(frame);
      } catch {
        return; // the channel closed under us; its close handler deals with it
      }
    }
  }
}

interface Transceivers {
  video: RTCRtpTransceiver;
  audio: RTCRtpTransceiver;
  voice: RTCRtpTransceiver;
  mic: RTCRtpTransceiver;
}

/* ================================== host ================================== */

export interface InviteView {
  id: string;
  code: string;
  link: string;
  mode: ReachMode;
  status: "creating" | "waiting" | "connecting" | "failed";
  error?: string;
}

export interface HostEvents {
  room: (room: RoomSnapshot) => void;
  chat: (message: ChatMessage) => void;
  react: (from: string, emoji: Reaction) => void;
  subs: (subs: SharedSubs | null) => void;
  speaking: (ids: string[]) => void;
  invites: (invites: InviteView[]) => void;
  /** Each guest's microphone, for the host to hear. */
  voices: (voices: Array<{ id: string; track: MediaStreamTrack }>) => void;
  /** The host's own shared screen, for its preview. */
  screen: (stream: MediaStream | null) => void;
  notice: (text: string) => void;
}

interface GuestLink {
  member: Member;
  peer: Peer;
  wire: Wire;
  lastSeen: number;
  tx: Transceivers | null;
  answer: ((sdp: string) => void) | null;
  lastReact: number;
}

interface PendingInvite {
  view: InviteView;
  peer: Peer | null;
  wire: Wire | null;
  timer: number | null;
}

export class HostRoom {
  readonly me: Member;
  private state: RoomSnapshot;
  private guests = new Map<string, GuestLink>();
  private invites = new Map<string, PendingInvite>();
  private files = new Map<string, { file: File; url: string | null }>();
  private chatLog: ChatMessage[] = [];
  private subs: SharedSubs | null = null;
  private outgoing: MediaStream | null = null;
  private screen: MediaStream | null = null;
  private mic: MediaStreamTrack | null = null;
  private mixer = new VoiceMixer();
  private detector = new SpeakingDetector();
  private speaking: string[] = [];
  private timers: number[] = [];
  private queued = false;
  private statusAt = 0;
  private statusTimer: number | null = null;
  closed = false;

  constructor(name: string, roomName: string, private events: HostEvents) {
    this.me = { id: uid(), name, slot: 0, host: true, mic: false };
    this.state = {
      name: cleanName(roomName, MAX_ROOM_NAME) || "Watch party",
      members: [this.me],
      status: { [this.me.id]: idleStatus() },
      settings: { ...DEFAULT_SETTINGS },
      now: null,
      queue: [],
      history: [],
      playback: { status: "paused", position: 0, rate: 1, at: now() },
      skipVotes: [],
    };
    this.timers.push(
      window.setInterval(() => this.watchdog(), 2000),
      window.setInterval(() => this.listen(), 200),
    );
    this.broadcast();
  }

  /** A copy, so React sees a new object and a guest can never share our arrays. */
  private snapshot(): RoomSnapshot {
    const s = this.state;
    return {
      ...s,
      members: s.members.map((m) => ({ ...m })),
      status: { ...s.status },
      settings: { ...s.settings },
      now: s.now ? { ...s.now } : null,
      queue: s.queue.map((i) => ({ ...i })),
      history: s.history.map((i) => ({ ...i })),
      playback: { ...s.playback },
      skipVotes: [...s.skipVotes],
    };
  }

  /** Send the room to everyone — coalesced, so ten changes in one tick are one message. */
  private broadcast(): void {
    if (this.queued || this.closed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (this.closed) return;
      const room = this.snapshot();
      for (const link of this.guests.values()) link.wire.send({ t: "room", room });
      this.events.room(room);
    });
  }

  /** Status reports arrive every two seconds from every guest; pass them on at most once a second. */
  private broadcastStatus(): void {
    const since = now() - this.statusAt;
    if (since >= 1000) {
      this.statusAt = now();
      this.broadcast();
    } else if (this.statusTimer == null) {
      this.statusTimer = window.setTimeout(() => {
        this.statusTimer = null;
        this.statusAt = now();
        this.broadcast();
      }, 1000 - since);
    }
  }

  private toAll(message: HostMsg): void {
    for (const link of this.guests.values()) link.wire.send(message);
  }

  /* ------------------------------- invites ------------------------------- */

  private emitInvites(): void {
    this.events.invites([...this.invites.values()].map((i) => ({ ...i.view })));
  }

  private patchInvite(id: string, patch: Partial<InviteView>): void {
    const invite = this.invites.get(id);
    if (!invite) return;
    invite.view = { ...invite.view, ...patch };
    this.emitInvites();
  }

  private failInvite(id: string, error: string): void {
    const invite = this.invites.get(id);
    if (!invite) return;
    if (invite.timer != null) window.clearTimeout(invite.timer);
    invite.timer = null;
    this.patchInvite(id, { status: "failed", error });
  }

  get seatsLeft(): number {
    return MAX_MEMBERS - this.state.members.length - this.invites.size;
  }

  /** Make a fresh invite — one per guest. */
  async createInvite(mode: ReachMode): Promise<void> {
    if (this.seatsLeft <= 0) {
      this.events.notice(`A room holds ${MAX_MEMBERS} people, counting open invites.`);
      return;
    }
    const id = uid();
    const invite: PendingInvite = {
      view: { id, code: "", link: "", mode, status: "creating" },
      peer: null,
      wire: null,
      timer: null,
    };
    this.invites.set(id, invite);
    this.emitInvites();

    try {
      const { peer, channel } = await createOffer(mode, CHANNEL, {
        onState: (state) => {
          if (state === "failed" && this.invites.has(id)) this.failInvite(id, unreachable(mode));
        },
        onUnreachable: () => this.failInvite(id, unreachable(mode)),
      });
      if (this.closed || !this.invites.has(id)) {
        peer.close();
        return;
      }
      const code = await encodeCode(peer.description);
      invite.peer = peer;
      invite.wire = new Wire(channel);
      invite.wire.onMessage = (raw) => {
        const message = parseGuest(raw);
        if (message?.t === "hello") this.admit(id, message.name);
      };
      this.patchInvite(id, {
        code,
        link: inviteLink(window.location.origin, "/watchparty", code),
        status: "waiting",
      });
    } catch {
      this.failInvite(id, "This browser couldn't make an invite.");
    }
  }

  /** The guest's reply, pasted or scanned back in. */
  async acceptReply(id: string, raw: string): Promise<void> {
    const invite = this.invites.get(id);
    if (!invite?.peer) return;
    let description: string;
    try {
      description = await decodeCode(raw);
    } catch (error) {
      this.patchInvite(id, { error: (error as Error).message });
      return;
    }
    try {
      await invite.peer.accept(description);
    } catch {
      this.patchInvite(id, {
        error: "That isn't a reply to this invite. Each guest answers the invite they were sent.",
      });
      return;
    }
    this.patchInvite(id, { status: "connecting", error: undefined });
    invite.timer = window.setTimeout(
      () =>
        this.failInvite(
          id,
          "No connection yet. Check the reply came from the person this invite went to — or make a new invite and try again.",
        ),
      CONNECT_MS,
    );
  }

  cancelInvite(id: string): void {
    const invite = this.invites.get(id);
    if (!invite) return;
    if (invite.timer != null) window.clearTimeout(invite.timer);
    invite.peer?.close();
    this.invites.delete(id);
    this.emitInvites();
  }

  private admit(inviteId: string, rawName: string): void {
    const invite = this.invites.get(inviteId);
    if (!invite?.peer || !invite.wire) return;
    if (invite.timer != null) window.clearTimeout(invite.timer);
    this.invites.delete(inviteId);
    this.emitInvites();

    const { peer, wire } = invite;
    if (this.state.members.length >= MAX_MEMBERS) {
      wire.send({ t: "bye", reason: "This room is full." });
      window.setTimeout(() => peer.close(), 300);
      return;
    }

    const used = new Set(this.state.members.map((m) => m.slot));
    let slot = 1;
    while (used.has(slot)) slot += 1;
    const member: Member = {
      id: uid(),
      name: cleanName(rawName) || `Guest ${slot}`,
      slot,
      host: false,
      mic: false,
    };
    const link: GuestLink = { member, peer, wire, lastSeen: now(), tx: null, answer: null, lastReact: 0 };
    this.guests.set(member.id, link);
    wire.onMessage = (raw) => this.onGuest(link, raw);
    wire.channel.onclose = () => this.drop(member.id, `${member.name} left`);
    peer.pc.onconnectionstatechange = () => {
      const state = peer.pc.connectionState;
      if (state === "failed" || state === "closed") this.drop(member.id, `${member.name} lost the connection`);
    };

    this.state.members.push(member);
    this.state.status[member.id] = idleStatus();
    wire.send({
      t: "welcome",
      you: member.id,
      room: this.snapshot(),
      chat: this.chatLog.slice(-50),
      subs: this.subs,
    });
    this.notice(`${member.name} joined`);
    // Said out loud too: the host is usually on another tab by now.
    this.events.notice(`${member.name} joined the room 🎉`);
    this.broadcast();
    void this.negotiate(link);
  }

  /** Add the four media lines over the open channel. See the module comment. */
  private async negotiate(link: GuestLink): Promise<void> {
    const pc = link.peer.pc;
    try {
      const video = pc.addTransceiver("video", { direction: "sendonly" });
      const audio = pc.addTransceiver("audio", { direction: "sendonly" });
      const voice = pc.addTransceiver("audio", { direction: "sendonly" });
      const mic = pc.addTransceiver("audio", { direction: "recvonly" });
      await pc.setLocalDescription(await pc.createOffer());

      const answered = new Promise<string>((resolve, reject) => {
        link.answer = resolve;
        window.setTimeout(() => reject(new Error("no answer")), 20_000);
      });
      const mids: Mids = { video: video.mid!, audio: audio.mid!, voice: voice.mid!, mic: mic.mid! };
      link.wire.send({ t: "sdp", sdp: pc.localDescription!.sdp, mids });
      const sdp = await answered;
      link.answer = null;
      if (!this.guests.has(link.member.id)) return;
      await pc.setRemoteDescription({ type: "answer", sdp });

      link.tx = { video, audio, voice, mic };
      await this.pushMedia(link);
      await voice.sender.replaceTrack(this.mixer.output(link.member.id));
      this.mixer.setSource(link.member.id, mic.receiver.track);
      this.emitVoices();
    } catch {
      link.answer = null;
      // Sync, chat and the queue all run over the data channel and still work.
      this.events.notice(`Streaming and voice couldn't be set up for ${link.member.name}.`);
    }
  }

  private async pushMedia(link: GuestLink): Promise<void> {
    if (!link.tx) return;
    const video = this.outgoing?.getVideoTracks()[0] ?? null;
    const audio = this.outgoing?.getAudioTracks()[0] ?? null;
    await Promise.all([
      link.tx.video.sender.replaceTrack(video).catch(() => {}),
      link.tx.audio.sender.replaceTrack(audio).catch(() => {}),
    ]);
  }

  private emitVoices(): void {
    const voices: Array<{ id: string; track: MediaStreamTrack }> = [];
    for (const link of this.guests.values()) {
      if (link.tx) voices.push({ id: link.member.id, track: link.tx.mic.receiver.track });
    }
    this.events.voices(voices);
  }

  private drop(id: string, why: string): void {
    const link = this.guests.get(id);
    if (!link) return;
    this.guests.delete(id);
    link.answer = null;
    link.peer.close();
    this.mixer.setSource(id, null);
    this.mixer.removeOutput(id);
    this.state.members = this.state.members.filter((m) => m.id !== id);
    delete this.state.status[id];
    this.state.skipVotes = this.state.skipVotes.filter((v) => v !== id);
    if (!this.closed) {
      this.notice(why);
      this.broadcast();
      this.emitVoices();
    }
  }

  kick(id: string): void {
    const link = this.guests.get(id);
    if (!link) return;
    link.wire.send({ t: "bye", reason: "The host removed you from the room." });
    window.setTimeout(() => this.drop(id, `${link.member.name} was removed`), 250);
  }

  private watchdog(): void {
    const t = now();
    for (const [id, link] of this.guests) {
      if (t - link.lastSeen > SILENT_MS) this.drop(id, `${link.member.name} lost the connection`);
    }
  }

  /* --------------------------- guest messages ---------------------------- */

  private onGuest(link: GuestLink, raw: unknown): void {
    const message = parseGuest(raw);
    if (!message) return;
    const { member } = link;
    link.lastSeen = now();
    const refuse = (text: string) => link.wire.send({ t: "notice", text });

    switch (message.t) {
      case "ping":
        link.wire.send({ t: "pong", t0: message.t0, h: now() });
        break;
      case "chat":
        this.postChat(member, message.text);
        break;
      case "react":
        if (now() - link.lastReact < 250) return;
        link.lastReact = now();
        this.throwReaction(member.id, message.emoji);
        break;
      case "control":
        if (!this.state.settings.guestControl) return refuse("The host has playback to themselves.");
        this.control(message, member);
        break;
      case "add": {
        if (!this.state.settings.guestQueue) return refuse("The host has turned off adding to the queue.");
        const result = this.addLink(message.link, member.name, message.next ? "next" : "end");
        if (!result.ok) refuse(result.reason);
        break;
      }
      case "vote":
        this.vote(member.id);
        break;
      case "stat":
        this.state.status[member.id] = {
          rtt: message.rtt,
          drift: message.drift,
          buffering: message.buffering,
          mode: message.mode,
        };
        this.broadcastStatus();
        break;
      case "mic":
        member.mic = message.on;
        this.broadcast();
        break;
      case "sdp":
        link.answer?.(message.sdp);
        break;
      case "bye":
        this.drop(member.id, `${member.name} left`);
        break;
      case "hello":
        break;
    }
  }

  /* -------------------------------- chat --------------------------------- */

  private pushChat(message: ChatMessage): void {
    this.chatLog.push(message);
    if (this.chatLog.length > CHAT_KEPT) this.chatLog.shift();
    this.toAll({ t: "chat", msg: message });
    this.events.chat(message);
  }

  private postChat(from: Member, raw: string): void {
    const text = raw.replace(/[ \t]+/g, " ").trim().slice(0, MAX_CHAT);
    if (!text) return;
    this.pushChat({ id: uid(), from: from.id, name: from.name, slot: from.slot, text, at: Date.now() });
  }

  /** A line from the room itself — joins, leaves, what started playing. */
  private notice(text: string): void {
    this.pushChat({ id: uid(), from: null, name: "", slot: -1, text, at: Date.now() });
  }

  sendChat(text: string): void {
    this.postChat(this.me, text);
  }

  private throwReaction(from: string, emoji: Reaction): void {
    this.toAll({ t: "react", from, emoji });
    this.events.react(from, emoji);
  }

  react(emoji: Reaction): void {
    this.throwReaction(this.me.id, emoji);
  }

  /* ------------------------------ playback ------------------------------- */

  private setPlayback(playback: Playback): void {
    this.state.playback = playback;
    this.broadcast();
  }

  /**
   * Someone pressed a control. The host's own position is trusted (it comes
   * from the host's player); a guest's is not, since their player may be the
   * one that is off — the room's line decides where a guest's pause lands.
   */
  control(control: Control, by: Member = this.me): void {
    const item = this.state.now;
    if (!item || item.kind === "screen") return;
    const pb = this.state.playback;
    const t = now();
    const here = expectedPosition(pb, t);
    const end = item.duration ?? Infinity;
    const clamp = (p: number) => Math.max(0, Math.min(p, end));
    const said = (verb: string) => {
      if (this.state.members.length > 1) this.notice(`${by.name} ${verb}`);
    };

    switch (control.action) {
      case "play": {
        // Pressing play at the very end starts it again, as any player does.
        const from = pb.status === "paused" ? pb.position : here;
        const position = from >= end - 0.5 ? 0 : from;
        this.setPlayback({ status: "playing", position, rate: pb.rate, at: t });
        if (pb.status === "paused") said("pressed play");
        break;
      }
      case "pause": {
        const position = clamp(by.host && control.position != null ? control.position : here);
        this.setPlayback({ status: "paused", position, rate: pb.rate, at: t });
        if (pb.status === "playing") said("paused");
        break;
      }
      case "seek":
        this.setPlayback({ ...pb, position: clamp(control.position), at: t, anchor: false });
        break;
      case "rate":
        this.setPlayback({ ...pb, position: here, rate: control.rate, at: t, anchor: false });
        said(`set the speed to ${control.rate}×`);
        break;
    }
  }

  /** The host's player is not where the line says (it buffered, or is still
   *  loading): move the line to the player, so the room waits for the host. */
  reanchor(position: number): void {
    const pb = this.state.playback;
    if (pb.status !== "playing") return;
    this.setPlayback({ ...pb, position: Math.max(0, position), at: now(), anchor: true });
  }

  /** Facts the host's player learned about what is playing. */
  patchNow(patch: Partial<Pick<MediaItem, "duration" | "title" | "audio">>): void {
    const item = this.state.now;
    if (!item) return;
    const changed = (Object.keys(patch) as Array<keyof typeof patch>).some((k) => item[k] !== patch[k]);
    if (!changed) return;
    this.state.now = { ...item, ...patch };
    this.broadcast();
  }

  /** The host's own sync report, shown in the member list like anyone's. */
  setOwnStatus(status: MemberStatus): void {
    this.state.status[this.me.id] = status;
    this.broadcastStatus();
  }

  /* -------------------------------- queue -------------------------------- */

  private enqueue(item: MediaItem, where: "now" | "next" | "end"): boolean {
    if (this.state.queue.length >= QUEUE_MAX) {
      this.events.notice("The queue is full.");
      return false;
    }
    if (where === "now" || !this.state.now) {
      this.start(item);
    } else {
      if (where === "next") this.state.queue.unshift(item);
      else this.state.queue.push(item);
      this.notice(`${item.addedBy} queued ${item.title}`);
    }
    this.broadcast();
    return true;
  }

  addLink(raw: string, addedBy: string, where: "now" | "next" | "end"): { ok: true } | { ok: false; reason: string } {
    const parsed = parseLink(raw);
    if (!parsed.ok) return parsed;
    const item: MediaItem = {
      id: uid(),
      kind: parsed.kind,
      title: parsed.title,
      src: parsed.src,
      audio: parsed.kind === "url" ? parsed.audio : false,
      duration: null,
      addedBy,
    };
    return this.enqueue(item, where) ? { ok: true } : { ok: false, reason: "The queue is full." };
  }

  /** Files never leave this device; guests get them as a live stream. */
  addFiles(files: File[], where: "now" | "end" = "end"): number {
    let added = 0;
    for (const file of files) {
      if (!isMediaFile(file)) continue;
      const item: MediaItem = {
        id: uid(),
        kind: "file",
        title: titleFromName(file.name),
        src: "",
        audio: isAudioFile(file),
        duration: null,
        size: file.size,
        addedBy: this.me.name,
      };
      this.files.set(item.id, { file, url: null });
      if (!this.enqueue(item, added === 0 ? where : "end")) break;
      added += 1;
    }
    return added;
  }

  /** A playable URL for one of the host's files. */
  fileUrl(itemId: string): string | null {
    const entry = this.files.get(itemId);
    if (!entry) return null;
    entry.url ??= URL.createObjectURL(entry.file);
    return entry.url;
  }

  private start(item: MediaItem): void {
    const previous = this.state.now;
    if (previous) this.retire(previous);
    this.state.now = item;
    this.state.skipVotes = [];
    // Anchored: the host's player will hold the room at 0 until it has loaded.
    this.state.playback = { status: "playing", position: 0, rate: 1, at: now(), anchor: true };
    if (this.subs && this.subs.itemId !== item.id) {
      this.subs = null;
      this.toAll({ t: "subs", subs: null });
      this.events.subs(null);
    }
    this.notice(`Now playing: ${item.title}`);
  }

  private retire(item: MediaItem): void {
    if (item.kind === "screen") {
      this.stopScreen();
      return; // a finished screen share can't be played again
    }
    const entry = this.files.get(item.id);
    if (entry?.url) {
      URL.revokeObjectURL(entry.url);
      entry.url = null;
    }
    this.state.history.unshift(item);
    const dropped = this.state.history.splice(HISTORY_KEPT);
    for (const old of dropped) this.files.delete(old.id);
  }

  /** What is playing cannot be played (YouTube refused it, the file is
   *  unreadable): say why in the chat, and move on. */
  skipBroken(reason: string): void {
    const item = this.state.now;
    if (!item) return;
    this.notice(`Skipped ${item.title} — ${reason}`);
    this.next();
  }

  next(): void {
    const item = this.state.queue.shift();
    if (item) {
      this.start(item);
    } else if (this.state.now) {
      this.retire(this.state.now);
      this.state.now = null;
      this.state.skipVotes = [];
      this.state.playback = { status: "paused", position: 0, rate: 1, at: now() };
      this.notice("That's the end of the queue");
    }
    this.broadcast();
  }

  /** Play something from the queue or from history, now. */
  playNow(id: string): void {
    const queued = this.state.queue.findIndex((i) => i.id === id);
    if (queued !== -1) {
      const [item] = this.state.queue.splice(queued, 1);
      this.start(item);
      this.broadcast();
      return;
    }
    const played = this.state.history.find((i) => i.id === id);
    if (!played) return;
    const again: MediaItem = { ...played, id: uid(), duration: played.duration };
    const file = this.files.get(played.id);
    if (file) this.files.set(again.id, { file: file.file, url: null });
    this.start(again);
    this.broadcast();
  }

  remove(id: string): void {
    this.state.queue = this.state.queue.filter((i) => i.id !== id);
    this.broadcast();
  }

  move(id: string, delta: -1 | 1): void {
    const q = this.state.queue;
    const from = q.findIndex((i) => i.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= q.length) return;
    [q[from], q[to]] = [q[to], q[from]];
    this.broadcast();
  }

  /** Toggle a skip vote. A majority of the room, host included, skips. */
  vote(memberId: string = this.me.id): void {
    if (!this.state.settings.voteSkip || !this.state.now) return;
    const votes = this.state.skipVotes;
    this.state.skipVotes = votes.includes(memberId)
      ? votes.filter((v) => v !== memberId)
      : [...votes, memberId];
    const need = Math.floor(this.state.members.length / 2) + 1;
    if (this.state.skipVotes.length >= need) {
      this.notice(`Skipped ${this.state.now.title} by vote`);
      this.next();
    } else {
      this.broadcast();
    }
  }

  /* ------------------------------ streaming ------------------------------ */

  /**
   * What guests without their own copy see and hear. Null stops the stream.
   * Called again with the same stream when its tracks change underneath (a
   * captured `<video>` swaps tracks when it loads a new source).
   */
  setOutgoing(stream: MediaStream | null): void {
    this.outgoing = stream;
    for (const link of this.guests.values()) void this.pushMedia(link);
  }

  async shareScreen(): Promise<void> {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30 } },
      audio: true,
    });
    if (this.closed) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stopScreen();
    this.screen = stream;
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (this.screen === stream && this.state.now?.kind === "screen") this.next();
    });
    const item: MediaItem = {
      id: uid(),
      kind: "screen",
      title: `${this.me.name}'s screen`,
      src: "",
      audio: false,
      duration: null,
      addedBy: this.me.name,
    };
    this.enqueue(item, "now");
    this.setOutgoing(stream);
    this.events.screen(stream);
  }

  private stopScreen(): void {
    if (!this.screen) return;
    this.screen.getTracks().forEach((t) => t.stop());
    if (this.outgoing === this.screen) this.setOutgoing(null);
    this.screen = null;
    this.events.screen(null);
  }

  /* ------------------------------ subtitles ------------------------------ */

  setSubs(cues: Cue[] | null): void {
    const item = this.state.now;
    if (!item) return;
    this.subs = cues ? { itemId: item.id, cues } : null;
    this.toAll({ t: "subs", subs: this.subs });
    this.events.subs(this.subs);
    if (cues) this.notice(`${this.me.name} added subtitles`);
  }

  /* -------------------------------- voice -------------------------------- */

  async setMic(on: boolean): Promise<void> {
    if (on) {
      const track = await openMic();
      if (this.closed) {
        track.stop();
        return;
      }
      this.mic?.stop();
      this.mic = track;
      this.mixer.resume();
      this.mixer.setSource(this.me.id, track);
    } else {
      this.mic?.stop();
      this.mic = null;
      this.mixer.setSource(this.me.id, null);
    }
    this.me.mic = on;
    this.broadcast();
  }

  resumeAudio(): void {
    this.mixer.resume();
  }

  /** Who is talking, from the mixer's own level meters. */
  private listen(): void {
    const t = now();
    const levels = this.mixer.levels();
    // A closed microphone is silent anyway; skipping it saves the analysis.
    for (const m of this.state.members) if (!m.mic) levels.delete(m.id);
    const speaking = this.detector.update(levels, t);
    if (speaking.join() === this.speaking.join()) return;
    this.speaking = speaking;
    this.toAll({ t: "speaking", ids: speaking });
    this.events.speaking(speaking);
  }

  /* ------------------------------- settings ------------------------------ */

  setSettings(patch: Partial<RoomSettings>): void {
    this.state.settings = { ...this.state.settings, ...patch };
    if (!this.state.settings.voteSkip) this.state.skipVotes = [];
    this.broadcast();
  }

  rename(name: string): void {
    const clean = cleanName(name, MAX_ROOM_NAME);
    if (!clean) return;
    this.state.name = clean;
    this.broadcast();
  }

  /** Close the room for everyone. */
  end(reason = "The host ended the room."): void {
    if (this.closed) return;
    this.toAll({ t: "bye", reason });
    this.closed = true;
    this.timers.forEach((t) => window.clearInterval(t));
    if (this.statusTimer != null) window.clearTimeout(this.statusTimer);
    const peers = [...this.guests.values()].map((l) => l.peer);
    // A moment for the goodbye to leave before the connections go.
    window.setTimeout(() => peers.forEach((p) => p.close()), 300);
    this.guests.clear();
    for (const invite of this.invites.values()) {
      if (invite.timer != null) window.clearTimeout(invite.timer);
      invite.peer?.close();
    }
    this.invites.clear();
    this.mic?.stop();
    this.stopScreen();
    this.mixer.close();
    for (const entry of this.files.values()) if (entry.url) URL.revokeObjectURL(entry.url);
    this.files.clear();
  }
}

/* ================================== guest ================================= */

export interface GuestEvents {
  joined: (me: string, room: RoomSnapshot, chat: ChatMessage[], subs: SharedSubs | null) => void;
  room: (room: RoomSnapshot) => void;
  chat: (message: ChatMessage) => void;
  react: (from: string, emoji: Reaction) => void;
  subs: (subs: SharedSubs | null) => void;
  speaking: (ids: string[]) => void;
  notice: (text: string) => void;
  /** The host's stream and the voice mix, once the media lines exist. */
  remote: (media: MediaStream, voice: MediaStream) => void;
  clock: (offset: number, rtt: number | null) => void;
  status: (text: string) => void;
  ended: (reason: string) => void;
}

export class GuestRoom {
  replyCode = "";
  me: string | null = null;
  private peer: Peer | null = null;
  private wire: Wire | null = null;
  private clock = new ClockSync();
  private tx: Transceivers | null = null;
  private mic: MediaStreamTrack | null = null;
  private timers: number[] = [];
  private stat: MemberStatus = idleStatus();
  closed = false;

  private constructor(
    private name: string,
    private events: GuestEvents,
  ) {}

  /**
   * Open an invite and produce the reply. Resolves as soon as there is a reply
   * to show; the room itself arrives later, once the host has pasted it.
   */
  static async open(invite: string, name: string, events: GuestEvents): Promise<GuestRoom> {
    const offer = await decodeCode(invite);
    // Answer on the invite's own terms: an offer with public (STUN-learned)
    // candidates came from "anywhere" mode, and one without must stay local.
    const mode: ReachMode = /typ srflx/.test(offer) ? "internet" : "local";
    const room = new GuestRoom(name, events);
    const { peer, channel } = await createAnswer(offer, mode, {
      onState: (state) => {
        if (state === "failed") room.ended(room.me ? "Lost the connection to the host." : unreachable(mode));
      },
      onUnreachable: () => room.ended(room.me ? "Lost the connection to the host." : unreachable(mode)),
    });
    room.peer = peer;
    room.replyCode = await encodeCode(peer.description);
    void channel.then(async (ch) => {
      try {
        await whenOpen(ch);
      } catch {
        room.ended("The connection to the host didn't open.");
        return;
      }
      room.attach(ch);
    });
    return room;
  }

  private attach(channel: RTCDataChannel): void {
    if (this.closed) return;
    this.wire = new Wire(channel);
    this.wire.onMessage = (raw) => this.onHost(raw);
    channel.onclose = () => this.ended("Lost the connection to the host.");
    this.events.status("Connected — joining the room…");
    this.wire.send({ t: "hello", name: this.name, v: PROTOCOL });
  }

  send(message: GuestMsg): void {
    this.wire?.send(message);
  }

  private ping(): void {
    this.send({ t: "ping", t0: now() });
  }

  private onHost(raw: unknown): void {
    const message = parseHost(raw);
    if (!message || this.closed) return;
    switch (message.t) {
      case "welcome":
        this.me = message.you;
        this.events.joined(message.you, message.room, message.chat, message.subs);
        // A burst first, so the clock is trustworthy within a second; then a
        // steady beat that doubles as the "still here" signal and status report.
        for (let i = 0; i < 6; i++) this.timers.push(window.setTimeout(() => this.ping(), i * 150));
        this.timers.push(
          window.setInterval(() => {
            this.ping();
            this.send({ t: "stat", ...this.stat, rtt: this.clock.rtt });
          }, 2000),
        );
        break;
      case "room":
        this.events.room(message.room);
        break;
      case "pong":
        this.clock.add(message.t0, message.h, now());
        this.events.clock(this.clock.offset, this.clock.rtt);
        break;
      case "chat":
        this.events.chat(message.msg);
        break;
      case "react":
        this.events.react(message.from, message.emoji);
        break;
      case "subs":
        this.events.subs(message.subs);
        break;
      case "speaking":
        this.events.speaking(message.ids);
        break;
      case "notice":
        this.events.notice(message.text);
        break;
      case "sdp":
        void this.answer(message.sdp, message.mids);
        break;
      case "bye":
        this.ended(message.reason);
        break;
    }
  }

  private async answer(sdp: string, mids: Mids): Promise<void> {
    const pc = this.peer?.pc;
    if (!pc) return;
    try {
      await pc.setRemoteDescription({ type: "offer", sdp });
      const find = (mid: string) => pc.getTransceivers().find((t) => t.mid === mid);
      const video = find(mids.video);
      const audio = find(mids.audio);
      const voice = find(mids.voice);
      const mic = find(mids.mic);
      if (!video || !audio || !voice || !mic) throw new Error("missing media line");
      // Offered as "the host receives"; answering "this side sends" is what
      // lets the mic go live later with a bare replaceTrack.
      mic.direction = "sendonly";
      if (this.mic) await mic.sender.replaceTrack(this.mic);
      await pc.setLocalDescription(await pc.createAnswer());
      this.send({ t: "sdp", sdp: pc.localDescription!.sdp });
      this.tx = { video, audio, voice, mic };
      this.events.remote(
        new MediaStream([video.receiver.track, audio.receiver.track]),
        new MediaStream([voice.receiver.track]),
      );
    } catch {
      this.events.notice("Streaming and voice couldn't be set up. Synced playback and chat still work.");
    }
  }

  /** What the player says about itself, sent with the next ping. */
  report(stat: Omit<MemberStatus, "rtt">): void {
    this.stat = { ...stat, rtt: this.clock.rtt };
  }

  async setMic(on: boolean): Promise<void> {
    if (on) {
      const track = await openMic();
      if (this.closed) {
        track.stop();
        return;
      }
      this.mic?.stop();
      this.mic = track;
      await this.tx?.mic.sender.replaceTrack(track);
    } else {
      this.mic?.stop();
      this.mic = null;
      await this.tx?.mic.sender.replaceTrack(null).catch(() => {});
    }
    this.send({ t: "mic", on });
  }

  get joined(): boolean {
    return this.me != null;
  }

  private cleanup(): void {
    this.closed = true;
    this.timers.forEach((t) => {
      window.clearInterval(t);
      window.clearTimeout(t);
    });
    this.timers = [];
    this.mic?.stop();
    this.mic = null;
  }

  /** Leave on purpose. */
  leave(): void {
    if (this.closed) return;
    this.send({ t: "bye" });
    this.cleanup();
    const peer = this.peer;
    window.setTimeout(() => peer?.close(), 200);
  }

  private ended(reason: string): void {
    if (this.closed) return;
    this.cleanup();
    this.peer?.close();
    this.events.ended(reason);
  }
}
