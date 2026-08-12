/**
 * Spec-sheet builders — everything a transport will tell us about a device
 * *without* opening it, claiming an interface or asking for a second permission.
 *
 * This is the difference between the one-line summary the System Info panel
 * shows and the full page the Nearby Devices app shows: USB descriptors down to
 * endpoints, HID collections and report layouts, media-track capabilities and
 * controller layout. All of it is already in the object the discovery API handed
 * back, so reading it costs nothing and prompts for nothing.
 *
 * Every builder is defensive: a browser that omits a field (or a device that
 * lies about one) drops that row instead of breaking the sheet.
 */

import {
  MEDIA_CAPABILITY_LABELS,
  SKIPPED_CAPABILITIES,
  formatCapability,
  hexByte,
  hexId,
  hidCollectionName,
  usbClassName,
  usbGeneration,
  usbVersion,
} from "./labels";
import type {
  CapabilityValue,
  HidCollectionLike,
  HidDeviceLike,
  HidReportLike,
  MediaDeviceInfoLike,
  SerialPortInfoLike,
  SpecField,
  SpecGroup,
  UsbAlternateLike,
  UsbConfigurationLike,
  UsbDeviceLike,
  UsbEndpointLike,
} from "./types";

/** Drop the rows whose value never arrived, so no "—" placeholders are shown. */
const fields = (...rows: (SpecField | false | null | undefined)[]): SpecField[] =>
  rows.filter(Boolean) as SpecField[];

const field = (
  label: string,
  value: string | number | undefined | null,
  mono = false,
): SpecField | undefined =>
  value == null || value === "" ? undefined : { label, value: String(value), mono };

/** Keep a group only when it has something in it. */
const groups = (...list: (SpecGroup | false | null | undefined)[]): SpecGroup[] =>
  (list.filter(Boolean) as SpecGroup[]).filter((g) => g.fields.length > 0 || g.rows?.length);

const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;

/* --------------------------------- USB ---------------------------------- */

const ENDPOINT_DIRECTION: Record<string, string> = { in: "IN", out: "OUT" };

/** `IN interrupt · 8 B` — direction, transfer type and max packet size. */
const endpointLine = (e: UsbEndpointLike): string =>
  `EP${e.endpointNumber} ${ENDPOINT_DIRECTION[e.direction] ?? e.direction} ${e.type} · ${e.packetSize} B`;

/** One interface alternate, named by its class rather than its numbers. */
function alternateLine(ifaceNumber: number, alt: UsbAlternateLike): string {
  const cls = usbClassName(alt.interfaceClass, alt.interfaceSubclass, alt.interfaceProtocol);
  const endpoints = alt.endpoints ?? [];
  const head = `Interface ${ifaceNumber}${alt.alternateSetting ? `.${alt.alternateSetting}` : ""} — ${
    alt.interfaceName?.trim() || cls || "unnamed"
  }`;
  if (endpoints.length === 0) return `${head} · no endpoints`;
  return `${head} · ${endpoints.map(endpointLine).join(", ")}`;
}

function configurationGroup(
  config: UsbConfigurationLike,
  active: boolean,
  index: number,
): SpecGroup {
  const interfaces = config.interfaces ?? [];
  const rows: string[] = [];
  for (const iface of interfaces) {
    // The active alternate is what the device is actually presenting; the rest
    // are listed too, since they're a real part of what the hardware can do.
    const alternates = iface.alternates?.length
      ? iface.alternates
      : iface.alternate
        ? [iface.alternate]
        : [];
    for (const alt of alternates) rows.push(alternateLine(iface.interfaceNumber, alt));
  }

  return {
    title: `Configuration ${config.configurationValue ?? index + 1}${active ? " (active)" : ""}`,
    fields: fields(
      field("Name", config.configurationName?.trim()),
      field("Interfaces", interfaces.length ? String(interfaces.length) : "0"),
    ),
    rows,
  };
}

/** Full USB descriptor read: identity, class, bus version and every interface. */
export function usbSpec(d: UsbDeviceLike): SpecGroup[] {
  const configs = d.configurations ?? [];
  const activeValue = d.configuration?.configurationValue;

  return groups(
    {
      title: "Identity",
      fields: fields(
        field("Manufacturer", d.manufacturerName?.trim()),
        field("Product", d.productName?.trim()),
        field("Serial number", d.serialNumber?.trim(), true),
        field("Vendor ID", hexId(d.vendorId), true),
        field("Product ID", hexId(d.productId), true),
      ),
    },
    {
      title: "Class & bus",
      fields: fields(
        field("Device class", usbClassName(d.deviceClass, d.deviceSubclass, d.deviceProtocol)),
        d.deviceClass != null &&
          field(
            "Class code",
            `${hexByte(d.deviceClass)} / ${hexByte(d.deviceSubclass ?? 0)} / ${hexByte(d.deviceProtocol ?? 0)}`,
            true,
          ),
        field("USB version", usbVersion(d.usbVersionMajor, d.usbVersionMinor, d.usbVersionSubminor), true),
        field("Bus generation", usbGeneration(d.usbVersionMajor, d.usbVersionMinor)),
        field(
          "Device revision",
          usbVersion(d.deviceVersionMajor, d.deviceVersionMinor, d.deviceVersionSubminor),
          true,
        ),
        field("Configurations", configs.length ? String(configs.length) : undefined),
        field("Session", d.opened ? "Open in this tab" : "Not opened"),
      ),
    },
    ...configs.map((c, i) => configurationGroup(c, c.configurationValue === activeValue, i)),
  );
}

/* --------------------------------- HID ---------------------------------- */

/** Total items across a set of reports — a rough measure of how much it sends. */
const countItems = (reports: HidReportLike[]): number =>
  reports.reduce((sum, r) => sum + (r.items?.length ?? 0), 0);

/** Flatten a collection tree; nested collections are where the detail lives. */
function flattenCollections(
  list: HidCollectionLike[],
  depth = 0,
  out: { collection: HidCollectionLike; depth: number }[] = [],
): { collection: HidCollectionLike; depth: number }[] {
  for (const c of list) {
    out.push({ collection: c, depth });
    if (c.children?.length && depth < 2) flattenCollections(c.children, depth + 1, out);
  }
  return out;
}

/** One report's shape: `Report 1 · 3 items · 8×1 bit`. */
function reportLine(kind: string, r: HidReportLike): string {
  const items = r.items ?? [];
  const bits = items.reduce((sum, i) => sum + (i.reportSize ?? 0) * (i.reportCount ?? 0), 0);
  const parts = [
    `${kind} report${r.reportId ? ` ${r.reportId}` : ""}`,
    plural(items.length, "item"),
    bits > 0 && `${bits} bits`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** HID identity plus the collection tree and report layout it declares. */
export function hidSpec(d: HidDeviceLike): SpecGroup[] {
  const collections = d.collections ?? [];
  const flat = flattenCollections(collections);
  const inputs = collections.flatMap((c) => c.inputReports ?? []);
  const outputs = collections.flatMap((c) => c.outputReports ?? []);
  const features = collections.flatMap((c) => c.featureReports ?? []);

  const collectionRows = flat.map(({ collection, depth }) => {
    const name = hidCollectionName(collection.usagePage, collection.usage) ?? "Unknown collection";
    const counts = [
      collection.inputReports?.length && plural(collection.inputReports.length, "input report"),
      collection.outputReports?.length && plural(collection.outputReports.length, "output report"),
      collection.featureReports?.length &&
        plural(collection.featureReports.length, "feature report"),
    ].filter(Boolean);
    return `${"— ".repeat(depth)}${name}${counts.length ? ` · ${counts.join(", ")}` : ""}`;
  });

  const reportRows = [
    ...inputs.map((r) => reportLine("Input", r)),
    ...outputs.map((r) => reportLine("Output", r)),
    ...features.map((r) => reportLine("Feature", r)),
  ];

  return groups(
    {
      title: "Identity",
      fields: fields(
        field("Product", d.productName?.trim()),
        field("Vendor ID", hexId(d.vendorId), true),
        field("Product ID", hexId(d.productId), true),
        field("Session", d.opened ? "Open in this tab" : "Not opened"),
      ),
    },
    {
      title: "Collections",
      fields: fields(field("Top-level collections", collections.length || undefined)),
      rows: collectionRows,
    },
    {
      title: "Reports",
      fields: fields(
        field("Input", inputs.length ? `${inputs.length} (${countItems(inputs)} items)` : undefined),
        field(
          "Output",
          outputs.length ? `${outputs.length} (${countItems(outputs)} items)` : undefined,
        ),
        field(
          "Feature",
          features.length ? `${features.length} (${countItems(features)} items)` : undefined,
        ),
      ),
      // The per-report breakdown is only interesting on devices with a handful;
      // a 40-report gaming keyboard would bury the rest of the sheet.
      rows: reportRows.length <= 12 ? reportRows : undefined,
    },
  );
}

/* -------------------------------- serial -------------------------------- */

export function serialSpec(info: SerialPortInfoLike): SpecGroup[] {
  return groups({
    title: "Port",
    fields: fields(
      field(
        "Kind",
        info.usbVendorId != null ? "USB-attached serial port" : "Platform serial port",
      ),
      info.usbVendorId != null && field("Vendor ID", hexId(info.usbVendorId), true),
      info.usbProductId != null && field("Product ID", hexId(info.usbProductId), true),
    ),
  });
}

/* --------------------------------- media -------------------------------- */

const MEDIA_KIND_LABEL: Record<string, string> = {
  audioinput: "Audio input",
  audiooutput: "Audio output",
  videoinput: "Video input",
};

/**
 * Media identity plus, on Chromium, the track capabilities the hardware
 * advertises — resolutions and frame rates for a camera, sample rate and
 * channel count for a microphone. `getCapabilities()` only returns values once
 * the site holds a camera/mic permission, so this group is often empty until
 * "Reveal names" has been used.
 */
export function mediaSpec(d: MediaDeviceInfoLike): SpecGroup[] {
  let caps: Record<string, CapabilityValue> = {};
  try {
    caps = d.getCapabilities?.() ?? {};
  } catch {
    /* older Chromium throws when no permission is held */
  }

  const capabilityFields = Object.entries(caps)
    .filter(([name]) => !SKIPPED_CAPABILITIES.has(name))
    .map(([name, value]) => {
      const formatted = formatCapability(name, value);
      return formatted
        ? { label: MEDIA_CAPABILITY_LABELS[name] ?? name, value: formatted }
        : undefined;
    })
    .filter(Boolean) as SpecField[];

  return groups(
    {
      title: "Identity",
      fields: fields(
        field("Kind", MEDIA_KIND_LABEL[d.kind] ?? d.kind),
        field("Label", d.label?.trim() || "hidden until permission is granted"),
        // The group id is what ties a headset's mic and speaker together.
        field("Group", d.groupId ? `${d.groupId.slice(0, 12)}…` : undefined, true),
        field("Device ID", d.deviceId ? `${d.deviceId.slice(0, 12)}…` : undefined, true),
      ),
    },
    {
      title: "Track capabilities",
      fields: capabilityFields,
    },
  );
}

/* -------------------------------- gamepad ------------------------------- */

/** Controller layout: how the browser maps it, and what it has to press. */
export function gamepadSpec(pad: Gamepad): SpecGroup[] {
  const haptics = (pad as Gamepad & { vibrationActuator?: { type?: string } }).vibrationActuator;
  return groups({
    title: "Controller",
    fields: fields(
      field("Id", pad.id),
      field("Slot", `${pad.index + 1}`),
      field("Mapping", pad.mapping === "standard" ? "Standard layout" : pad.mapping || "Vendor"),
      field("Buttons", pad.buttons.length),
      field("Axes", pad.axes.length),
      field("Haptics", haptics ? (haptics.type ?? "supported") : "not reported"),
      field("Connected", pad.connected ? "Yes" : "No"),
    ),
  });
}

/* ------------------------------- bluetooth ------------------------------ */

/** dBm → plain words, so the number means something without a chart. */
export function signalQuality(rssi: number): string {
  if (rssi >= -55) return "Excellent";
  if (rssi >= -70) return "Good";
  if (rssi >= -85) return "Fair";
  return "Weak";
}

/**
 * What is knowable about a Bluetooth device before connecting: its site-scoped
 * id, the link state, and — for a device seen by the live advertisement scan —
 * its broadcast strength. Services need a GATT connection (see `gatt.ts`).
 */
export function bluetoothSpec(
  d: { id: string; name?: string; gatt?: { connected: boolean } },
  ad?: { rssi?: number; txPower?: number },
): SpecGroup[] {
  return groups({
    title: "Radio",
    fields: fields(
      field("Advertised name", d.name?.trim()),
      field("Device ID", d.id, true),
      field("GATT link", d.gatt?.connected ? "Connected" : "Not connected"),
      ad?.rssi != null && field("Signal", `${ad.rssi} dBm · ${signalQuality(ad.rssi)}`),
      ad?.txPower != null && field("Transmit power", `${ad.txPower} dBm`),
      ad?.rssi != null &&
        ad?.txPower != null &&
        // Path loss is the honest version of "how far away is it" — the raw
        // difference, with no attempt to convert it into metres.
        field("Path loss", `${ad.txPower - ad.rssi} dB`),
    ),
  });
}
