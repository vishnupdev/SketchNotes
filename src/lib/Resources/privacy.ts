/**
 * The tracking side of the picture: the privacy signals this browser sends, the
 * hosts this page has actually talked to, and the details any page can read
 * about the machine without ever asking permission.
 *
 * The last one is the point worth making. Everything in {@link readIdentitySurface}
 * is free for the taking — no prompt, no indicator, no setting — which is why a
 * permission list alone never tells the whole story.
 */

export type SignalTone = "good" | "warn" | "neutral";

export interface PrivacySignal {
  label: string;
  value: string;
  tone: SignalTone;
  /** Why it matters, in one sentence. */
  note: string;
}

export interface HostContact {
  host: string;
  requests: number;
  /** Bytes actually pulled over the network; 0 when served from cache. */
  bytes: number;
  thirdParty: boolean;
}

export interface IdentityFact {
  label: string;
  value: string;
}

type GpcNavigator = Navigator & { globalPrivacyControl?: boolean };
type DntWindow = Window & { doNotTrack?: string };
type MemoryNavigator = Navigator & { deviceMemory?: number };

/** Signals the browser volunteers about how it wants to be treated. */
export function readPrivacySignals(): PrivacySignal[] {
  const nav = navigator as GpcNavigator;
  const dntRaw =
    navigator.doNotTrack ?? (window as DntWindow).doNotTrack ?? null;
  const dntOn = dntRaw === "1" || dntRaw === "yes";
  const gpc = typeof nav.globalPrivacyControl === "boolean" ? nav.globalPrivacyControl : null;

  return [
    {
      label: "Do Not Track",
      value: dntRaw == null ? "Not set" : dntOn ? "On" : "Off",
      tone: dntOn ? "good" : "neutral",
      note: "A request, not a rule — sites are free to ignore it, and most do.",
    },
    {
      label: "Global Privacy Control",
      value: gpc == null ? "Not sent" : gpc ? "On" : "Off",
      tone: gpc ? "good" : "neutral",
      note: "A legally recognised opt-out signal in some regions.",
    },
    {
      label: "Secure context",
      value: window.isSecureContext ? "Yes (HTTPS)" : "No",
      tone: window.isSecureContext ? "good" : "warn",
      note: "Camera, microphone and location are refused outright without it.",
    },
    {
      label: "Cookies",
      value: navigator.cookieEnabled ? "Enabled" : "Blocked",
      tone: navigator.cookieEnabled ? "neutral" : "good",
      note: "OneApp sets none of its own; this is the browser-wide setting.",
    },
    {
      label: "Automation",
      value: navigator.webdriver ? "Browser is automated" : "Normal session",
      tone: navigator.webdriver ? "warn" : "good",
      note: "Set when the browser is being driven by a test or scraping tool.",
    },
  ];
}

/** Whether this page can read cookies set for it in a third-party context. */
export async function readStorageAccess(): Promise<boolean | null> {
  if (typeof document === "undefined" || typeof document.hasStorageAccess !== "function") {
    return null;
  }
  try {
    return await document.hasStorageAccess();
  } catch {
    return null;
  }
}

/**
 * Every host this page has fetched from since it loaded, from the browser's own
 * Resource Timing buffer. This is the honest answer to "is it phoning anyone" —
 * it counts what the network actually did, not what the code claims.
 */
export function readHostContacts(): HostContact[] {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return [];
  const here = window.location.host;
  const byHost = new Map<string, HostContact>();

  for (const entry of performance.getEntriesByType("resource")) {
    const timing = entry as PerformanceResourceTiming;
    let host: string;
    try {
      host = new URL(timing.name, window.location.href).host;
    } catch {
      continue;
    }
    // data:/blob: URLs have no host and are not a network contact.
    if (!host) continue;
    const row = byHost.get(host) ?? {
      host,
      requests: 0,
      bytes: 0,
      thirdParty: host !== here,
    };
    row.requests++;
    row.bytes += timing.transferSize || 0;
    byHost.set(host, row);
  }

  return [...byHost.values()].sort(
    (a, b) => Number(a.thirdParty) - Number(b.thirdParty) || b.requests - a.requests,
  );
}

/** Total bytes this page has pulled over the network since it loaded. */
export function readTransferredBytes(): number {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return 0;
  return performance
    .getEntriesByType("resource")
    .reduce((sum, e) => sum + ((e as PerformanceResourceTiming).transferSize || 0), 0);
}

/**
 * What any page can read about this machine with no permission at all. Together
 * these are usually enough to recognise the same browser again.
 */
export function readIdentitySurface(): IdentityFact[] {
  const nav = navigator as MemoryNavigator;
  const dpr = window.devicePixelRatio || 1;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  const offset = -new Date().getTimezoneOffset() / 60;

  return [
    { label: "Browser", value: navigator.userAgent },
    { label: "Languages", value: navigator.languages?.join(", ") || navigator.language },
    { label: "Time zone", value: `${tz} (UTC${offset >= 0 ? "+" : ""}${offset})` },
    {
      label: "Screen",
      value: `${screen.width}×${screen.height} at ${dpr}×, ${screen.colorDepth}-bit`,
    },
    { label: "Window", value: `${window.innerWidth}×${window.innerHeight}` },
    { label: "CPU cores", value: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency}` : "Not reported" },
    { label: "Device memory", value: nav.deviceMemory ? `${nav.deviceMemory} GB (rounded)` : "Not reported" },
    { label: "Touch points", value: `${navigator.maxTouchPoints}` },
    {
      label: "Colour scheme",
      value: window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light",
    },
    {
      label: "Reduced motion",
      value: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "Requested" : "No preference",
    },
  ];
}
