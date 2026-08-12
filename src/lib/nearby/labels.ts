/**
 * Code → human name tables for the peripheral buses, plus the small formatters
 * the spec sheets share.
 *
 * USB and HID describe what a device *is* numerically: a base class byte, a
 * usage page and usage. Those numbers are the difference between "USB device
 * 0x046D:0xC52B" and "wireless receiver — HID + audio + mass storage", so they
 * are translated here rather than shown raw.
 */

import type { CapabilityValue } from "./types";

/** `0x1D6B`-style id, the form vendor/product ids are usually quoted in. */
export const hexId = (n: number): string => `0x${n.toString(16).toUpperCase().padStart(4, "0")}`;

/** `0x03`-style byte, for class/subclass/protocol codes. */
export const hexByte = (n: number): string => `0x${n.toString(16).toUpperCase().padStart(2, "0")}`;

export const joinDetail = (...parts: (string | false | null | undefined)[]): string | undefined =>
  parts.filter(Boolean).join(" · ") || undefined;

/* ------------------------------- USB ------------------------------------ */

/** USB-IF base class codes. */
const USB_CLASS: Record<number, string> = {
  0x00: "Defined per interface",
  0x01: "Audio",
  0x02: "Communications (CDC)",
  0x03: "Human interface (HID)",
  0x05: "Physical",
  0x06: "Still imaging (PTP)",
  0x07: "Printer",
  0x08: "Mass storage",
  0x09: "Hub",
  0x0a: "CDC data",
  0x0b: "Smart card",
  0x0d: "Content security",
  0x0e: "Video",
  0x0f: "Personal healthcare",
  0x10: "Audio / video",
  0x11: "Billboard",
  0x12: "USB-C bridge",
  0x3c: "I3C",
  0xdc: "Diagnostic",
  0xe0: "Wireless controller",
  0xef: "Miscellaneous",
  0xfe: "Application specific",
  0xff: "Vendor specific",
};

/** Subclass/protocol pairs worth spelling out, keyed `class:subclass`. */
const USB_SUBCLASS: Record<string, string> = {
  "0x08:0x06": "SCSI transparent",
  "0x08:0x05": "SFF-8070i",
  "0x08:0x01": "Reduced block commands",
  "0x02:0x02": "Abstract control model",
  "0x02:0x0c": "Ethernet emulation",
  "0x03:0x01": "Boot interface",
  "0x0e:0x01": "Video control",
  "0x0e:0x02": "Video streaming",
  "0x0e:0x03": "Video interface collection",
  "0x01:0x01": "Audio control",
  "0x01:0x02": "Audio streaming",
  "0x01:0x03": "MIDI streaming",
  "0xe0:0x01": "Bluetooth / RF controller",
  "0xef:0x02": "Interface association",
  "0xfe:0x01": "Device firmware upgrade",
};

/** HID boot protocols — the two the USB spec singles out. */
const USB_HID_PROTOCOL: Record<number, string> = { 0x01: "Keyboard", 0x02: "Mouse" };

/** Name a USB class triplet, e.g. `Mass storage · SCSI transparent`. */
export function usbClassName(cls?: number, sub?: number, proto?: number): string | undefined {
  if (cls == null) return undefined;
  const base = USB_CLASS[cls] ?? `Class ${hexByte(cls)}`;
  const extra =
    (sub != null ? USB_SUBCLASS[`${hexByte(cls)}:${hexByte(sub)}`] : undefined) ??
    (cls === 0x03 && proto != null ? USB_HID_PROTOCOL[proto] : undefined);
  return extra ? `${base} · ${extra}` : base;
}

/** `1.10`-style version from the major/minor/subminor triplet USB reports. */
export function usbVersion(major?: number, minor?: number, sub?: number): string | undefined {
  if (major == null) return undefined;
  return `${major}.${minor ?? 0}${sub ? `.${sub}` : ""}`;
}

/** The generation a `usbVersionMajor` corresponds to, in words people use. */
export function usbGeneration(major?: number, minor?: number): string | undefined {
  if (major == null) return undefined;
  if (major >= 3) return minor && minor >= 1 ? "USB 3.1+ (SuperSpeed+)" : "USB 3.x (SuperSpeed)";
  if (major === 2) return "USB 2.0 (Hi-Speed)";
  if (major === 1) return minor && minor >= 1 ? "USB 1.1 (Full-Speed)" : "USB 1.0 (Low-Speed)";
  return undefined;
}

/* ------------------------------- HID ------------------------------------ */

/** HID usage pages (the ones a browser realistically sees). */
const HID_PAGE: Record<number, string> = {
  0x01: "Generic desktop",
  0x02: "Simulation",
  0x03: "Virtual reality",
  0x04: "Sport",
  0x05: "Game",
  0x06: "Generic device",
  0x07: "Keyboard / keypad",
  0x08: "LED",
  0x09: "Button",
  0x0a: "Ordinal",
  0x0b: "Telephony",
  0x0c: "Consumer control",
  0x0d: "Digitizer",
  0x0e: "Haptics",
  0x0f: "Physical input (force feedback)",
  0x10: "Unicode",
  0x12: "Eye and head tracker",
  0x14: "Alphanumeric display",
  0x20: "Sensor",
  0x40: "Medical instrument",
  0x41: "Braille display",
  0x84: "Power device",
  0x85: "Battery system",
  0x8c: "Barcode scanner",
  0x8d: "Weighing device",
  0x8e: "Magnetic stripe reader",
  0xf1d0: "FIDO alliance",
};

/** Generic-desktop usages — the top-level "what kind of thing is this". */
const HID_DESKTOP_USAGE: Record<number, string> = {
  0x01: "Pointer",
  0x02: "Mouse",
  0x04: "Joystick",
  0x05: "Gamepad",
  0x06: "Keyboard",
  0x07: "Keypad",
  0x08: "Multi-axis controller",
  0x09: "Tablet PC controls",
  0x0d: "Portable device control",
  0x0e: "System multi-axis controller",
  0x80: "System control",
};

const HID_DIGITIZER_USAGE: Record<number, string> = {
  0x01: "Digitizer",
  0x02: "Pen",
  0x04: "Touch screen",
  0x05: "Touch pad",
  0x0e: "Device configuration",
};

/** Name one HID collection, e.g. `Generic desktop · Keyboard`. */
export function hidCollectionName(page?: number, usage?: number): string | undefined {
  if (page == null) return undefined;
  const pageName = HID_PAGE[page] ?? (page >= 0xff00 ? "Vendor defined" : `Page ${hexId(page)}`);
  const usageName =
    page === 0x01 && usage != null
      ? HID_DESKTOP_USAGE[usage]
      : page === 0x0d && usage != null
        ? HID_DIGITIZER_USAGE[usage]
        : undefined;
  return usageName ? `${pageName} · ${usageName}` : pageName;
}

/**
 * The single best label for a HID device — the first recognised top-level
 * collection, which is what a person means by "it's a keyboard".
 */
export function hidKind(collections: { usagePage?: number; usage?: number }[]): string | undefined {
  for (const c of collections) {
    if (c.usagePage === 0x01 && c.usage != null) {
      const named = HID_DESKTOP_USAGE[c.usage];
      if (named) return named === "Joystick" ? "Gamepad / joystick" : named;
    }
    if (c.usagePage === 0x0c) return "Consumer control";
    if (c.usagePage === 0x0d) return "Pen / digitizer";
    if (c.usagePage === 0xf1d0) return "Security key";
  }
  return undefined;
}

/* --------------------------- media capabilities -------------------------- */

/** Constraint names as `getCapabilities()` spells them → readable labels. */
export const MEDIA_CAPABILITY_LABELS: Record<string, string> = {
  width: "Width",
  height: "Height",
  aspectRatio: "Aspect ratio",
  frameRate: "Frame rate",
  facingMode: "Facing",
  resizeMode: "Resize mode",
  torch: "Torch",
  zoom: "Zoom",
  focusMode: "Focus mode",
  exposureMode: "Exposure mode",
  whiteBalanceMode: "White balance",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  sharpness: "Sharpness",
  sampleRate: "Sample rate",
  sampleSize: "Sample size",
  channelCount: "Channels",
  latency: "Latency",
  echoCancellation: "Echo cancellation",
  noiseSuppression: "Noise suppression",
  autoGainControl: "Auto gain control",
  voiceIsolation: "Voice isolation",
};

/** Units for the numeric capabilities where the bare number is ambiguous. */
const CAPABILITY_UNITS: Record<string, string> = {
  frameRate: " fps",
  sampleRate: " Hz",
  sampleSize: "-bit",
  latency: " s",
  width: " px",
  height: " px",
};

/**
 * Render one capability value: a `{min,max}` range as `min–max`, a list of
 * allowed settings as a comma list, a lone boolean pair as "yes / no".
 */
export function formatCapability(name: string, value: CapabilityValue): string | undefined {
  const unit = CAPABILITY_UNITS[name] ?? "";
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    const items = value.map((v) => (typeof v === "boolean" ? (v ? "yes" : "no") : String(v)));
    return items.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    const { min, max, exact } = value;
    if (exact != null) return `${round(exact)}${unit}`;
    if (min != null && max != null) {
      return min === max ? `${round(max)}${unit}` : `${round(min)}–${round(max)}${unit}`;
    }
    if (max != null) return `up to ${round(max)}${unit}`;
    if (min != null) return `from ${round(min)}${unit}`;
    return undefined;
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return `${round(value)}${unit}`;
  return value || undefined;
}

/** Trim float noise (`29.999999`) without flattening genuinely small values. */
const round = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);

/** Capabilities that only restate identity, so they add nothing to a spec sheet. */
export const SKIPPED_CAPABILITIES = new Set(["deviceId", "groupId"]);
