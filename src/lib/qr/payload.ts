import type { QrKind, QrReading } from "./types";

/**
 * Turning form fields into a QR payload, and a scanned payload back into
 * something the app can describe and act on.
 *
 * The formats here are the de-facto ones phone cameras understand — `WIFI:`,
 * `mailto:`, `tel:`, `SMSTO:`, `geo:`, vCard — so a code made here behaves the
 * same in any scanner, not only in this app. That is the whole point of writing
 * them properly rather than dumping text in.
 *
 * Reading is deliberately forgiving and *never* trusts what it read: a scanned
 * code is untrusted input from a sticker on a wall, so only `http(s)`, `mailto:`
 * and `tel:` are ever offered as something to open (see {@link safeHref}).
 */

/* ------------------------------- building ----------------------------- */

/** Escape the reserved characters in a `WIFI:`/vCard field value. */
const escapeField = (value: string): string => value.replace(/([\\;,:"])/g, "\\$1");

export interface QrFields {
  text?: string;
  url?: string;
  /** Wi-Fi. */
  ssid?: string;
  password?: string;
  security?: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
  /** Email. */
  email?: string;
  subject?: string;
  body?: string;
  /** Phone / SMS. */
  phone?: string;
  message?: string;
  /** Location. */
  lat?: string;
  lon?: string;
  /** Contact. */
  name?: string;
  org?: string;
  title?: string;
}

/** Build the payload string for a kind. Empty when the essentials are missing. */
export function buildPayload(kind: QrKind, f: QrFields): string {
  switch (kind) {
    case "text":
      return (f.text ?? "").trim();

    case "link": {
      const raw = (f.url ?? "").trim();
      if (!raw) return "";
      // A typed link rarely includes the scheme; assume https rather than
      // producing a code that scanners treat as plain text.
      return /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    }

    case "wifi": {
      const ssid = (f.ssid ?? "").trim();
      if (!ssid) return "";
      const security = f.security ?? "WPA";
      const parts = [`T:${security}`, `S:${escapeField(ssid)}`];
      if (security !== "nopass" && f.password) parts.push(`P:${escapeField(f.password)}`);
      if (f.hidden) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }

    case "email": {
      const to = (f.email ?? "").trim();
      if (!to) return "";
      const query = new URLSearchParams();
      if (f.subject) query.set("subject", f.subject);
      if (f.body) query.set("body", f.body);
      const tail = query.toString();
      return `mailto:${to}${tail ? `?${tail}` : ""}`;
    }

    case "phone": {
      const number = cleanNumber(f.phone ?? "");
      return number ? `tel:${number}` : "";
    }

    case "sms": {
      const number = cleanNumber(f.phone ?? "");
      if (!number) return "";
      // SMSTO: is the format Android's camera and most scanners act on.
      return f.message ? `SMSTO:${number}:${f.message}` : `SMSTO:${number}`;
    }

    case "geo": {
      const lat = Number((f.lat ?? "").trim());
      const lon = Number((f.lon ?? "").trim());
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
      return `geo:${lat},${lon}`;
    }

    case "contact": {
      const name = (f.name ?? "").trim();
      if (!name) return "";
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeField(name)}`];
      if (f.org) lines.push(`ORG:${escapeField(f.org)}`);
      if (f.title) lines.push(`TITLE:${escapeField(f.title)}`);
      if (f.phone) lines.push(`TEL;TYPE=CELL:${cleanNumber(f.phone)}`);
      if (f.email) lines.push(`EMAIL:${f.email.trim()}`);
      if (f.url) lines.push(`URL:${f.url.trim()}`);
      lines.push("END:VCARD");
      // vCard is CRLF-delimited by spec; scanners are stricter about this than
      // they look.
      return lines.join("\r\n");
    }
  }
}

/** Keep only what can be dialled: digits, a leading +, and separators. */
const cleanNumber = (raw: string): string => raw.trim().replace(/[^\d+]/g, "");

/* -------------------------------- reading ----------------------------- */

/**
 * Only these schemes are ever offered as a link. A QR code is untrusted input
 * — anyone can print one — so `javascript:`, `data:`, `file:` and the rest are
 * shown as text and never made clickable.
 */
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Split a `WIFI:`/vCard body on unescaped separators. */
function splitEscaped(body: string, separator: string): string[] {
  const out: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && i + 1 < body.length) {
      current += body[++i];
      continue;
    }
    if (ch === separator) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** Work out what a scanned payload is, and what can be done with it. */
export function readPayload(text: string): QrReading {
  const value = text.trim();
  const lower = value.toLowerCase();

  if (lower.startsWith("wifi:")) {
    const map = new Map<string, string>();
    for (const pair of splitEscaped(value.slice(5), ";")) {
      const at = pair.indexOf(":");
      if (at > 0) map.set(pair.slice(0, at).toUpperCase(), pair.slice(at + 1));
    }
    const ssid = map.get("S") ?? "";
    const security = map.get("T") || "nopass";
    return {
      kind: "wifi",
      label: ssid ? `Wi-Fi network “${ssid}”` : "Wi-Fi network",
      fields: [
        { name: "Network", value: ssid },
        { name: "Security", value: security === "nopass" ? "Open" : security },
        { name: "Password", value: map.get("P") ?? "—" },
        ...(map.get("H") === "true" ? [{ name: "Hidden", value: "Yes" }] : []),
      ],
    };
  }

  if (lower.startsWith("begin:vcard")) {
    const get = (tag: string) => {
      const line = value
        .split(/\r?\n/)
        .find((l) => l.toUpperCase().startsWith(tag.toUpperCase()));
      return line ? line.slice(line.indexOf(":") + 1).replace(/\\([\\;,:"])/g, "$1") : "";
    };
    const name = get("FN") || get("N");
    return {
      kind: "contact",
      label: name ? `Contact: ${name}` : "Contact card",
      fields: [
        { name: "Name", value: name },
        { name: "Organisation", value: get("ORG") },
        { name: "Title", value: get("TITLE") },
        { name: "Phone", value: get("TEL") },
        { name: "Email", value: get("EMAIL") },
        { name: "Website", value: get("URL") },
      ].filter((f) => f.value),
    };
  }

  if (lower.startsWith("mailto:")) {
    const href = safeHref(value);
    const [address, query = ""] = value.slice(7).split("?");
    const params = new URLSearchParams(query);
    return {
      kind: "email",
      label: `Email ${address}`,
      fields: [
        { name: "To", value: address },
        ...(params.get("subject") ? [{ name: "Subject", value: params.get("subject")! }] : []),
        ...(params.get("body") ? [{ name: "Message", value: params.get("body")! }] : []),
      ],
      action: href ? { href, label: "Write email" } : undefined,
    };
  }

  if (lower.startsWith("tel:")) {
    const href = safeHref(value);
    const number = value.slice(4);
    return {
      kind: "phone",
      label: `Call ${number}`,
      fields: [{ name: "Number", value: number }],
      action: href ? { href, label: "Call" } : undefined,
    };
  }

  if (lower.startsWith("smsto:") || lower.startsWith("sms:")) {
    const body = value.slice(value.indexOf(":") + 1);
    const at = body.indexOf(":");
    const number = at > -1 ? body.slice(0, at) : body;
    const message = at > -1 ? body.slice(at + 1) : "";
    return {
      kind: "sms",
      label: `Text ${number}`,
      fields: [
        { name: "Number", value: number },
        ...(message ? [{ name: "Message", value: message }] : []),
      ],
    };
  }

  if (lower.startsWith("geo:")) {
    const [lat = "", lon = ""] = value.slice(4).split(/[,;]/);
    return {
      kind: "geo",
      label: `Location ${lat}, ${lon}`,
      fields: [
        { name: "Latitude", value: lat },
        { name: "Longitude", value: lon },
      ],
      // A map link is built rather than trusted from the code, so the
      // destination is one this app chose.
      action:
        Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
          ? {
              href: `https://www.openstreetmap.org/?mlat=${Number(lat)}&mlon=${Number(lon)}#map=15/${Number(lat)}/${Number(lon)}`,
              label: "Open map",
            }
          : undefined,
    };
  }

  const href = safeHref(value);
  if (href && (lower.startsWith("http://") || lower.startsWith("https://"))) {
    let host = "";
    try {
      host = new URL(href).host;
    } catch {
      /* already validated; host is a nicety */
    }
    return {
      kind: "link",
      label: host ? `Link to ${host}` : "Link",
      fields: [{ name: "Address", value: value }],
      action: { href, label: "Open link" },
    };
  }

  return {
    kind: "text",
    label: value.length > 60 ? `${value.slice(0, 57)}…` : value || "Empty code",
    fields: [{ name: "Text", value }],
  };
}
