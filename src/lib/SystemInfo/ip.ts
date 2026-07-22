/**
 * Device IP discovery. Two independent sources:
 *  - Local/private addresses via WebRTC ICE candidates (no server, no external
 *    request). Modern browsers may hide these behind an mDNS `*.local` hostname.
 *  - Public IP via a lightweight external echo service — an explicit network
 *    call, so it is only run on user request (never automatically).
 */

const IP_RE = /((?:\d{1,3}\.){3}\d{1,3})|((?:[a-f0-9]{0,4}:){2,}[a-f0-9]{0,4})/i;

export interface LocalIpResult {
  ips: string[];
  /** True when the browser returned only mDNS `.local` hostnames (IPs hidden). */
  mdnsHidden: boolean;
}

/** Gather local interface IPs via WebRTC. Resolves within `timeoutMs`. */
export function getLocalIPs(timeoutMs = 1500): Promise<LocalIpResult> {
  return new Promise((resolve) => {
    if (typeof RTCPeerConnection === "undefined") {
      resolve({ ips: [], mdnsHidden: false });
      return;
    }
    const ips = new Set<string>();
    let mdns = false;
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
    } catch {
      resolve({ ips: [], mdnsHidden: false });
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      resolve({ ips: [...ips], mdnsHidden: mdns && ips.size === 0 });
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        finish();
        return;
      }
      const text = e.candidate.candidate;
      if (/\.local\b/i.test(text)) mdns = true;
      const m = IP_RE.exec(text);
      if (m && m[0] && m[0] !== "0.0.0.0") ips.add(m[0]);
    };

    pc.createDataChannel("probe");
    pc.createOffer()
      .then((o) => pc.setLocalDescription(o))
      .catch(() => finish());
    window.setTimeout(finish, timeoutMs);
  });
}

export interface PublicIpResult {
  ip: string;
  source: string;
}

/** Look up the public IP via an external service. Returns null on failure. */
export async function getPublicIP(): Promise<PublicIpResult | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const ip = (data as { ip?: unknown }).ip;
    return typeof ip === "string" ? { ip, source: "api.ipify.org" } : null;
  } catch {
    return null;
  }
}
