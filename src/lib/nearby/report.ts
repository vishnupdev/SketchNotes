/**
 * Plain-text export of a nearby-device scan.
 *
 * A device inventory is the kind of thing that gets pasted into a support
 * ticket, a bug report or a note about which dongle is which — so the whole
 * sheet, spec groups included, is rendered as text rather than only being
 * readable on screen.
 */

import type { NearbyDevice, NearbySupport } from "./types";

const TRANSPORT_LABEL: Record<NearbyDevice["transport"], string> = {
  bluetooth: "Bluetooth",
  usb: "USB",
  hid: "HID",
  serial: "Serial",
  mic: "Microphone",
  speaker: "Speaker",
  camera: "Camera",
  gamepad: "Gamepad",
};

const SUPPORT_LABEL: Record<keyof Omit<NearbySupport, "any">, string> = {
  bluetooth: "Web Bluetooth",
  leScan: "BLE advertisement scan",
  usb: "WebUSB",
  hid: "WebHID",
  serial: "Web Serial",
  media: "Media devices",
  gamepad: "Gamepad",
  cast: "Presentation (cast)",
};

/** Render one scan as a copy-pasteable report. */
export function nearbyReportToText(
  devices: NearbyDevice[],
  support: NearbySupport,
  extras: { adapter: boolean | null; castAvailable: boolean | null },
): string {
  const lines: string[] = ["NEARBY DEVICES", "=".repeat(40), ""];

  lines.push("DISCOVERY");
  lines.push(
    `  Bluetooth radio: ${
      !support.bluetooth
        ? "not supported"
        : extras.adapter === true
          ? "available"
          : extras.adapter === false
            ? "off or absent"
            : "unknown"
    }`,
  );
  lines.push(
    `  Cast-capable displays: ${
      !support.cast
        ? "not supported"
        : extras.castAvailable === true
          ? "found on this network"
          : extras.castAvailable === false
            ? "none found"
            : "unknown"
    }`,
  );
  lines.push(`  Devices detected: ${devices.length}`);
  lines.push("");

  lines.push("BROWSER SUPPORT");
  for (const [key, label] of Object.entries(SUPPORT_LABEL)) {
    const on = support[key as keyof NearbySupport];
    lines.push(`  ${label}: ${on ? "yes" : "no"}`);
  }
  lines.push("");

  for (const device of devices) {
    lines.push(`${TRANSPORT_LABEL[device.transport].toUpperCase()} — ${device.name}`);
    lines.push("-".repeat(40));
    if (device.detail) lines.push(`  ${device.detail}`);
    if (device.connected != null) lines.push(`  Connected: ${device.connected ? "yes" : "no"}`);
    if (device.rssi != null) lines.push(`  Signal: ${device.rssi} dBm`);
    for (const group of device.spec ?? []) {
      lines.push(`  [${group.title}]`);
      for (const f of group.fields) lines.push(`    ${f.label}: ${f.value}`);
      for (const row of group.rows ?? []) lines.push(`    · ${row}`);
    }
    lines.push("");
  }

  if (devices.length === 0) lines.push("No devices detected.", "");

  lines.push(
    "Read locally in the browser through the Web Bluetooth, WebUSB, WebHID, Web Serial,",
    "Media Devices, Gamepad and Presentation APIs. Nothing was transmitted.",
  );

  return lines.join("\n");
}
