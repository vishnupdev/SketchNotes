/**
 * The way a guest's reply gets back to the host by itself.
 *
 * Without it, joining is a round trip by hand: the host sends an invite, the
 * guest sends a reply, the host pastes it. The invite has to travel — it is
 * the link — but the reply only exists because two browsers can't reach each
 * other until both halves are known. So the reply is posted to a public
 * message relay instead, and the host, listening there, picks it up.
 *
 * What the relay can learn is as little as this design allows:
 *
 *  - **Nothing it can read.** The reply is sealed with AES-GCM under a key
 *    derived from the invite's ICE password — a secret that exists only inside
 *    the invite link (whose fragment never reaches any server). No key, no
 *    extra characters in the link.
 *  - **A topic that means nothing.** The topic is another hash of the same
 *    secret, so it can't be guessed, and can't be tied to a room or a person.
 *  - **Only for "Anywhere" invites.** "This network only" promises that nothing
 *    outside the Wi-Fi is contacted, so those keep the paste-the-reply route.
 *
 * The relay is MQTT over secure WebSockets — the smallest protocol that free
 * public brokers speak. Three independent brokers are used at once and the
 * first delivery wins, so one of them being down costs nothing. The guest's
 * message is *retained*, so a host whose phone put the tab to sleep while they
 * were sending the link still finds the reply waiting when they come back; the
 * host clears it as soon as it is read.
 *
 * Only the handful of MQTT 3.1.1 packets this needs are implemented: CONNECT,
 * SUBSCRIBE, PUBLISH at QoS 0, PING and DISCONNECT.
 */

export const RELAY_BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://test.mosquitto.org:8081/mqtt",
];

const KEEPALIVE_S = 50;
const CONNECT_TIMEOUT_MS = 8000;
const enc = new TextEncoder();
const dec = new TextDecoder();

/* --------------------------------- keys --------------------------------- */

export interface RelayKey {
  topic: string;
  key: CryptoKey;
}

/** The ICE credentials in a `{type, sdp}` description — the invite's secret. */
function iceSecret(description: string): string | null {
  try {
    const { sdp } = JSON.parse(description) as { sdp?: string };
    const ufrag = /a=ice-ufrag:(\S+)/.exec(sdp ?? "")?.[1];
    const pwd = /a=ice-pwd:(\S+)/.exec(sdp ?? "")?.[1];
    return ufrag && pwd ? `${ufrag}:${pwd}` : null;
  } catch {
    return null;
  }
}

const sha256 = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/**
 * The topic and key for an invite, from its offer. Host and guest both hold the
 * offer, so both derive the same pair without either sending it.
 */
export async function relayKeyFor(offer: string): Promise<RelayKey | null> {
  const secret = iceSecret(offer);
  if (!secret || typeof crypto?.subtle === "undefined") return null;
  const [topicHash, keyBytes] = await Promise.all([sha256(`wp-relay-topic:${secret}`), sha256(`wp-relay-key:${secret}`)]);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  return { topic: `oneapp/wp/${hex(topicHash.slice(0, 16))}`, key };
}

/** What a guest posts: who they are, and their reply code. */
export interface RelayReply {
  name: string;
  code: string;
}

export async function sealReply(key: CryptoKey, reply: RelayReply): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(reply))));
  return Uint8Array.from([...iv, ...body]);
}

export async function openReply(key: CryptoKey, bytes: Uint8Array): Promise<RelayReply | null> {
  if (bytes.length < 13) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    const parsed = JSON.parse(dec.decode(plain)) as Partial<RelayReply>;
    if (typeof parsed.code !== "string" || typeof parsed.name !== "string") return null;
    return { name: parsed.name.slice(0, 40), code: parsed.code };
  } catch {
    return null; // not for us, or tampered with — either way, ignored
  }
}

/* --------------------------------- MQTT --------------------------------- */

function remainingLength(n: number): number[] {
  const out: number[] = [];
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 0x80;
    out.push(byte);
  } while (n > 0);
  return out;
}

const mqttString = (s: string): number[] => {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 0xff, ...b];
};

const packet = (type: number, body: number[]): Uint8Array => Uint8Array.from([type, ...remainingLength(body.length), ...body]);

const connectPacket = (clientId: string) =>
  packet(0x10, [...mqttString("MQTT"), 4, 0x02, KEEPALIVE_S >> 8, KEEPALIVE_S & 0xff, ...mqttString(clientId)]);

const subscribePacket = (id: number, topic: string) => packet(0x82, [id >> 8, id & 0xff, ...mqttString(topic), 0]);

export const publishPacket = (topic: string, payload: Uint8Array, retain: boolean) =>
  packet(0x30 | (retain ? 1 : 0), [...mqttString(topic), ...payload]);

const PING = Uint8Array.from([0xc0, 0]);
const DISCONNECT = Uint8Array.from([0xe0, 0]);

/** Split a byte stream into whole MQTT packets, keeping any partial tail. */
export function takePackets(buffer: Uint8Array): { packets: Array<{ type: number; body: Uint8Array }>; rest: Uint8Array } {
  const packets: Array<{ type: number; body: Uint8Array }> = [];
  let at = 0;
  while (at + 2 <= buffer.length) {
    let length = 0;
    let mult = 1;
    let i = at + 1;
    let done = false;
    for (; i < buffer.length && i < at + 5; i++) {
      length += (buffer[i] & 0x7f) * mult;
      mult *= 128;
      if (!(buffer[i] & 0x80)) {
        done = true;
        i++;
        break;
      }
    }
    if (!done || i + length > buffer.length) break;
    packets.push({ type: buffer[at], body: buffer.slice(i, i + length) });
    at = i + length;
  }
  return { packets, rest: buffer.slice(at) };
}

/** A received PUBLISH: its topic and payload (QoS 0, so no packet id). */
export function readPublish(type: number, body: Uint8Array): { topic: string; payload: Uint8Array } | null {
  if (body.length < 2) return null;
  const len = (body[0] << 8) | body[1];
  const qos = (type >> 1) & 0x3;
  const start = 2 + len + (qos > 0 ? 2 : 0);
  if (start > body.length) return null;
  return { topic: dec.decode(body.slice(2, 2 + len)), payload: body.slice(start) };
}

/**
 * One broker connection. Opens, says CONNECT, and reports each PUBLISH that
 * arrives. `ready` resolves once the broker has accepted the connection.
 */
class Broker {
  private ws: WebSocket;
  private buffer: Uint8Array = new Uint8Array(0);
  private ping: ReturnType<typeof setInterval> | null = null;
  private nextId = 1;
  readonly ready: Promise<void>;
  closed = false;

  constructor(
    url: string,
    private onPublish: (topic: string, payload: Uint8Array) => void,
    private onClose: () => void,
  ) {
    this.ws = new WebSocket(url, "mqtt");
    this.ws.binaryType = "arraybuffer";
    this.ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), CONNECT_TIMEOUT_MS);
      this.ws.onopen = () => {
        const id = crypto.getRandomValues(new Uint8Array(8));
        this.ws.send(connectPacket(`wp-${hex(id)}`));
      };
      this.ws.onmessage = (event) => {
        const incoming = new Uint8Array(event.data as ArrayBuffer);
        const joined = new Uint8Array(this.buffer.length + incoming.length);
        joined.set(this.buffer);
        joined.set(incoming, this.buffer.length);
        const { packets, rest } = takePackets(joined);
        this.buffer = rest;
        for (const p of packets) {
          const kind = p.type >> 4;
          if (kind === 2) {
            clearTimeout(timer);
            if (p.body[1] === 0) {
              this.ping = setInterval(() => this.send(PING), (KEEPALIVE_S - 10) * 1000);
              resolve();
            } else reject(new Error("refused"));
          } else if (kind === 3) {
            const msg = readPublish(p.type, p.body);
            if (msg) this.onPublish(msg.topic, msg.payload);
          }
        }
      };
      this.ws.onerror = () => reject(new Error("socket"));
      this.ws.onclose = () => {
        clearTimeout(timer);
        reject(new Error("closed"));
        this.shutdown();
        this.onClose();
      };
    });
    // A broker that never answers is simply one fewer route.
    this.ready.catch(() => this.close());
  }

  send(bytes: Uint8Array): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(bytes);
  }

  subscribe(topic: string): void {
    this.send(subscribePacket(this.nextId++, topic));
  }

  publish(topic: string, payload: Uint8Array, retain: boolean): void {
    this.send(publishPacket(topic, payload, retain));
  }

  /** Resolves once everything queued has gone out — or soon, if it never does. */
  flushed(): Promise<void> {
    return new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        if (this.ws.bufferedAmount === 0 || Date.now() - started > 3000) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  private shutdown(): void {
    this.closed = true;
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
  }

  close(): void {
    if (this.closed) return;
    this.shutdown();
    this.send(DISCONNECT);
    try {
      this.ws.close();
    } catch {
      /* already closing */
    }
  }
}

/* ------------------------------- the two ends ------------------------------ */

export interface RelayListener {
  close: () => void;
}

/**
 * The host's end: listen for the reply to one invite. Each broker reconnects if
 * it drops — a phone that slept the tab while the host was in their messaging
 * app comes back to a fresh subscription and the retained reply.
 */
export function listenForReply(relay: RelayKey, onReply: (reply: RelayReply) => void): RelayListener {
  let stopped = false;
  let delivered = false;
  const brokers = new Map<string, Broker>();
  const retries = new Map<string, ReturnType<typeof setTimeout>>();

  const receive = async (topic: string, payload: Uint8Array) => {
    if (stopped || delivered || topic !== relay.topic || !payload.length) return;
    const reply = await openReply(relay.key, payload);
    if (!reply || stopped || delivered) return;
    delivered = true;
    onReply(reply);
  };

  const connect = (url: string, attempt = 0) => {
    if (stopped) return;
    const broker = new Broker(url, (t, p) => void receive(t, p), () => {
      if (stopped || brokers.get(url) !== broker) return;
      brokers.delete(url);
      // Back off, but keep trying: the reply may be sent at any time.
      const delay = Math.min(30000, 1000 * 2 ** attempt);
      retries.set(url, setTimeout(() => connect(url, attempt + 1), delay));
    });
    brokers.set(url, broker);
    broker.ready.then(() => broker.subscribe(relay.topic)).catch(() => {});
  };

  // Coming back to the tab is the moment a slept connection is most likely dead.
  const onVisible = () => {
    if (document.visibilityState !== "visible" || stopped) return;
    for (const url of RELAY_BROKERS) {
      if (!brokers.has(url)) {
        const retry = retries.get(url);
        if (retry) clearTimeout(retry);
        connect(url);
      }
    }
  };

  RELAY_BROKERS.forEach((url) => connect(url));
  document.addEventListener("visibilitychange", onVisible);

  return {
    close: () => {
      if (stopped) return;
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      retries.forEach((t) => clearTimeout(t));
      for (const broker of brokers.values()) {
        // Clear the retained reply, so nothing about this invite lingers.
        if (delivered) broker.publish(relay.topic, new Uint8Array(0), true);
        void broker.flushed().then(() => broker.close());
      }
      brokers.clear();
    },
  };
}

/**
 * The guest's end: post the reply. Resolves true if at least one broker took
 * it — false means the guest should be shown the reply to send by hand.
 */
export async function postReply(relay: RelayKey, reply: RelayReply): Promise<boolean> {
  const payload = await sealReply(relay.key, reply);
  const results = await Promise.all(
    RELAY_BROKERS.map(async (url) => {
      const broker = new Broker(url, () => {}, () => {});
      try {
        await broker.ready;
        broker.publish(relay.topic, payload, true);
        await broker.flushed();
        return true;
      } catch {
        return false;
      } finally {
        broker.close();
      }
    }),
  );
  return results.some(Boolean);
}
