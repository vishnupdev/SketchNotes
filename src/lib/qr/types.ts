/**
 * Domain types for QR codes — shared by the QR app and by Handoff, which sends
 * data between devices over the same codes.
 *
 * Kept in a shared `lib/qr/` rather than under one app because two apps read and
 * write them (rule #5): the QR tool is the user-facing reader/writer, Handoff
 * uses the same encoder and the same camera scanner as a transport.
 */

/** The kinds of payload the app can build. Scanning recognises all of them. */
export type QrKind = "text" | "link" | "wifi" | "email" | "phone" | "sms" | "geo" | "contact";

export const QR_KINDS: QrKind[] = [
  "text",
  "link",
  "wifi",
  "email",
  "phone",
  "sms",
  "geo",
  "contact",
];

export const QR_KIND_LABEL: Record<QrKind, string> = {
  text: "Text",
  link: "Link",
  wifi: "Wi-Fi",
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  geo: "Location",
  contact: "Contact",
};

/**
 * Error-correction level. Higher levels survive more damage but hold less data,
 * so a long payload at "H" needs a physically bigger code to stay readable.
 */
export type QrEcc = "L" | "M" | "Q" | "H";
export const QR_ECCS: QrEcc[] = ["L", "M", "Q", "H"];

/** Full explanation, for a tooltip or a help line. */
export const QR_ECC_HINT: Record<QrEcc, string> = {
  L: "Smallest code, least damage tolerance (~7%)",
  M: "Balanced — the usual choice (~15%)",
  Q: "Tolerates more wear (~25%)",
  H: "Most robust, largest code (~30%)",
};

/** Two words, for a `<select>` option that has to fit a phone. */
export const QR_ECC_SHORT: Record<QrEcc, string> = {
  L: "smallest",
  M: "balanced",
  Q: "sturdier",
  H: "toughest",
};

/** One remembered code: something scanned, or something made. */
export interface QrEntry {
  id: string;
  origin: "scanned" | "created";
  /** The payload exactly as encoded or read. */
  text: string;
  kind: QrKind;
  ts: number;
}

/** What a scanned payload turns out to be, ready to describe and act on. */
export interface QrReading {
  kind: QrKind;
  /** One-line summary for a list row. */
  label: string;
  /** The useful fields, in display order. */
  fields: Array<{ name: string; value: string }>;
  /** A safe `http(s)` (or `mailto:`/`tel:`) URL this reading can open, if any. */
  action?: { href: string; label: string };
}
