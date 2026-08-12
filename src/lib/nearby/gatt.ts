/**
 * Bluetooth GATT inspection — the one route to a BLE device's actual features.
 *
 * Discovery can only report a Bluetooth device's name, id and link state.
 * Everything that describes what it *does* — battery level, firmware revision,
 * a heart-rate service, which characteristics can be subscribed to — lives
 * behind a GATT connection. So this module connects on request, walks the
 * primary services, reads the handful of standard characteristics that carry
 * plain identity/telemetry values, and disconnects again.
 *
 * Two platform rules shape the design:
 *
 * 1. A service is only reachable if it was listed in `optionalServices` when the
 *    device was picked — hence {@link GATT_OPTIONAL_SERVICES}, requested up
 *    front by `pairDevice`.
 * 2. Chrome maintains a blocklist of services and characteristics a web page may
 *    never touch (HID, firmware-update services, serial numbers). Passing a
 *    blocklisted UUID to `requestDevice` fails the whole call, so the request
 *    list is filtered through {@link BLOCKLISTED_SERVICES} and the read set
 *    deliberately excludes the blocklisted identity characteristics.
 *
 * Connecting is a real radio operation: it can wake a sleeping device and it
 * takes seconds. It only ever happens from an explicit user action.
 */

import type { BluetoothDeviceLike, SpecField } from "./types";

/** Expand a 16-bit GATT id into the full base-UUID form the API uses. */
const uuid16 = (id: number): string =>
  `0000${id.toString(16).padStart(4, "0")}-0000-1000-8000-00805f9b34fb`;

/** Standard services, by 16-bit id. */
const SERVICE_NAMES: Record<number, string> = {
  0x1800: "Generic access",
  0x1801: "Generic attribute",
  0x1802: "Immediate alert",
  0x1803: "Link loss",
  0x1804: "Tx power",
  0x1805: "Current time",
  0x1808: "Glucose",
  0x1809: "Health thermometer",
  0x180a: "Device information",
  0x180d: "Heart rate",
  0x180e: "Phone alert status",
  0x180f: "Battery",
  0x1810: "Blood pressure",
  0x1811: "Alert notification",
  0x1812: "Human interface device",
  0x1813: "Scan parameters",
  0x1814: "Running speed and cadence",
  0x1815: "Automation IO",
  0x1816: "Cycling speed and cadence",
  0x1818: "Cycling power",
  0x1819: "Location and navigation",
  0x181a: "Environmental sensing",
  0x181b: "Body composition",
  0x181c: "User data",
  0x181d: "Weight scale",
  0x181e: "Bond management",
  0x181f: "Continuous glucose monitoring",
  0x1820: "Internet protocol support",
  0x1821: "Indoor positioning",
  0x1822: "Pulse oximeter",
  0x1826: "Fitness machine",
  0x1827: "Mesh provisioning",
  0x1828: "Mesh proxy",
  0x183a: "Insulin delivery",
  0x1843: "Audio input control",
  0x1844: "Volume control",
  0x1846: "Coordinated set identification",
  0x184e: "Audio stream control",
  0x1850: "Published audio capabilities",
  0x1854: "Hearing access",
};

/** Standard characteristics, by 16-bit id. */
const CHARACTERISTIC_NAMES: Record<number, string> = {
  0x2a00: "Device name",
  0x2a01: "Appearance",
  0x2a04: "Preferred connection parameters",
  0x2a05: "Service changed",
  0x2a06: "Alert level",
  0x2a07: "Tx power level",
  0x2a19: "Battery level",
  0x2a1c: "Temperature measurement",
  0x2a23: "System ID",
  0x2a24: "Model number",
  0x2a25: "Serial number",
  0x2a26: "Firmware revision",
  0x2a27: "Hardware revision",
  0x2a28: "Software revision",
  0x2a29: "Manufacturer name",
  0x2a2a: "IEEE regulatory certification",
  0x2a37: "Heart rate measurement",
  0x2a38: "Body sensor location",
  0x2a39: "Heart rate control point",
  0x2a49: "Blood pressure feature",
  0x2a53: "Running speed and cadence measurement",
  0x2a5b: "Cycling speed and cadence measurement",
  0x2a63: "Cycling power measurement",
  0x2a6d: "Pressure",
  0x2a6e: "Temperature",
  0x2a6f: "Humidity",
  0x2a76: "UV index",
  0x2a77: "Irradiance",
  0x2a7e: "Aerobic heart rate lower limit",
  0x2a98: "Weight",
  0x2a9d: "Weight measurement",
  0x2a9e: "Weight scale feature",
  0x2ad2: "Indoor bike data",
  0x2acc: "Fitness machine feature",
};

/**
 * Services Chrome refuses to expose to a web page. Requesting one of these in
 * `optionalServices` rejects the entire `requestDevice()` call, so they are
 * filtered out of the request list rather than merely skipped when reading.
 */
const BLOCKLISTED_SERVICES = new Set<string>([
  uuid16(0x1812), // human interface device
  uuid16(0x1530), // Nordic device-firmware-update
  uuid16(0xfe59), // Nordic secure DFU
  uuid16(0xfffd), // FIDO U2F
  "f000ffc0-0451-4000-b000-000000000000", // TI over-the-air download
  "00060000-0000-1000-8000-00805f9b34fb",
]);

/**
 * The services a device chooser asks permission for, so that a later GATT walk
 * can actually see them. Optional services never add anything to the chooser's
 * own prompt — they only widen what this origin may read from the device the
 * user picks.
 */
export const GATT_OPTIONAL_SERVICES: string[] = Object.keys(SERVICE_NAMES)
  .map((id) => uuid16(Number(id)))
  .filter((u) => !BLOCKLISTED_SERVICES.has(u));

/**
 * Characteristics safe and useful to read: short strings and single numbers with
 * a standard meaning. Serial number (0x2A25) and system id (0x2A23) are
 * deliberately absent — Chrome blocklists both as device fingerprints.
 */
const READABLE = new Set([0x2a00, 0x2a01, 0x2a07, 0x2a19, 0x2a24, 0x2a26, 0x2a27, 0x2a28, 0x2a29]);

/** Characteristics whose value belongs in the device's summary sheet. */
const SUMMARY_ORDER = [0x2a29, 0x2a24, 0x2a26, 0x2a27, 0x2a28, 0x2a00, 0x2a01, 0x2a19, 0x2a07];

/** BLE appearance categories (the top 10 bits of the appearance value). */
const APPEARANCE: Record<number, string> = {
  0: "Unknown",
  1: "Phone",
  2: "Computer",
  3: "Watch",
  4: "Clock",
  5: "Display",
  6: "Remote control",
  7: "Eye glasses",
  8: "Tag",
  9: "Keyring",
  10: "Media player",
  11: "Barcode scanner",
  12: "Thermometer",
  13: "Heart rate sensor",
  14: "Blood pressure monitor",
  15: "Human interface device",
  16: "Glucose meter",
  17: "Running / walking sensor",
  18: "Cycling",
  19: "Control device",
  20: "Network device",
  21: "Sensor",
  22: "Light fixture",
  23: "Fan",
  24: "HVAC",
  25: "Air conditioning",
  26: "Humidifier",
  27: "Heating",
  28: "Access control",
  29: "Motorized device",
  30: "Power device",
  31: "Light source",
  32: "Window covering",
  33: "Audio sink",
  34: "Audio source",
  35: "Motorized vehicle",
  36: "Domestic appliance",
  37: "Wearable audio device",
  38: "Aircraft",
  39: "AV equipment",
  40: "Display equipment",
  41: "Hearing aid",
  42: "Gaming",
  43: "Signage",
  49: "Pulse oximeter",
  50: "Weight scale",
  51: "Personal mobility device",
  52: "Continuous glucose monitor",
  53: "Insulin pump",
  81: "Outdoor sports activity",
};

/** The 16-bit id inside a standard UUID, or null for a vendor-specific one. */
function shortId(uuid: string): number | null {
  const match = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid);
  return match ? parseInt(match[1], 16) : null;
}

/** Name a service/characteristic UUID, falling back to its own short form. */
function uuidName(uuid: string, table: Record<number, string>): string {
  const id = shortId(uuid);
  if (id != null) return table[id] ?? `Unknown (0x${id.toString(16).toUpperCase()})`;
  return "Vendor-specific";
}

/** `0x180A` for standard UUIDs, the first block of a vendor UUID otherwise. */
function uuidLabel(uuid: string): string {
  const id = shortId(uuid);
  return id != null ? `0x${id.toString(16).toUpperCase().padStart(4, "0")}` : uuid;
}

export interface GattCharacteristicInfo {
  uuid: string;
  /** `0x2A19`-style short form for display. */
  label: string;
  name: string;
  /** read / write / notify … — what the peripheral allows. */
  properties: string[];
  /** Decoded value, for the standard characteristics that carry one. */
  value?: string;
}

export interface GattServiceInfo {
  uuid: string;
  label: string;
  name: string;
  characteristics: GattCharacteristicInfo[];
}

export interface GattReport {
  services: GattServiceInfo[];
  /** Identity and telemetry values, ready to render as a spec group. */
  details: SpecField[];
  /** Battery percentage, when the device publishes the battery service. */
  battery: number | null;
}

/** Which of the nine GATT flags the characteristic actually supports. */
function propertyList(p: {
  read: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
  indicate: boolean;
  broadcast: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}): string[] {
  const flags: [boolean, string][] = [
    [p.read, "read"],
    [p.write, "write"],
    [p.writeWithoutResponse, "write (no ack)"],
    [p.notify, "notify"],
    [p.indicate, "indicate"],
    [p.broadcast, "broadcast"],
    [p.authenticatedSignedWrites, "signed write"],
    [p.reliableWrite, "reliable write"],
    [p.writableAuxiliaries, "writable aux"],
  ];
  return flags.filter(([on]) => on).map(([, name]) => name);
}

const utf8 = (view: DataView): string =>
  new TextDecoder()
    .decode(view)
    // Fixed-length string fields are NUL-padded on plenty of devices.
    .replace(/\0+$/, "")
    .trim();

/** Turn a raw characteristic value into something readable, by its UUID. */
function decode(id: number, view: DataView): string | undefined {
  try {
    switch (id) {
      case 0x2a19:
        return `${view.getUint8(0)}%`;
      case 0x2a07:
        return `${view.getInt8(0)} dBm`;
      case 0x2a01: {
        const value = view.getUint16(0, true);
        const category = APPEARANCE[value >> 6];
        return category ? `${category} (${value})` : String(value);
      }
      default:
        return utf8(view) || undefined;
    }
  } catch {
    // Truncated or unexpected payload — better to show the characteristic with
    // no value than to fail the whole walk.
    return undefined;
  }
}

/* --------------------------- device handle registry --------------------- */

/**
 * Live `BluetoothDevice` objects, keyed by the {@link NearbyDevice} key.
 *
 * A normalised device is a plain snapshot, which is all the list needs — but a
 * GATT connection has to be made on the real object the API returned. Discovery
 * files each one here as it is seen, so a detail view can connect later without
 * re-prompting. The map is per-page-load; nothing is persisted.
 */
const handles = new Map<string, BluetoothDeviceLike>();

export function rememberBluetoothDevice(key: string, device: BluetoothDeviceLike): void {
  handles.set(key, device);
}

/** Whether a GATT walk is possible for this device in this page load. */
export const canInspectGatt = (key: string): boolean => !!handles.get(key)?.gatt;

/**
 * Connect to a device, read its services, characteristics and standard values,
 * then disconnect. Rejects with a message worth showing when the device is out
 * of range, refuses the link, or exposes nothing this origin may read.
 */
export async function readGatt(key: string): Promise<GattReport> {
  const device = handles.get(key);
  if (!device?.gatt) {
    throw new Error("This device can't be inspected — pick it from the scanner again.");
  }

  const gatt = await device.gatt.connect().catch(() => {
    throw new Error("Couldn't connect. The device may be out of range, asleep or already paired elsewhere.");
  });

  try {
    const services = await gatt.getPrimaryServices().catch(() => []);
    if (services.length === 0) {
      throw new Error(
        "Connected, but this device exposes no services this browser is allowed to read.",
      );
    }

    const values = new Map<number, string>();
    const out: GattServiceInfo[] = [];

    for (const service of services) {
      const characteristics = await service.getCharacteristics().catch(() => []);
      const list: GattCharacteristicInfo[] = [];

      for (const characteristic of characteristics) {
        const id = shortId(characteristic.uuid);
        const info: GattCharacteristicInfo = {
          uuid: characteristic.uuid,
          label: uuidLabel(characteristic.uuid),
          name: uuidName(characteristic.uuid, CHARACTERISTIC_NAMES),
          properties: propertyList(characteristic.properties),
        };
        if (id != null && READABLE.has(id) && characteristic.properties.read) {
          const view = await characteristic.readValue().catch(() => null);
          const decoded = view ? decode(id, view) : undefined;
          if (decoded) {
            info.value = decoded;
            values.set(id, decoded);
          }
        }
        list.push(info);
      }

      out.push({
        uuid: service.uuid,
        label: uuidLabel(service.uuid),
        name: uuidName(service.uuid, SERVICE_NAMES),
        characteristics: list,
      });
    }

    const details: SpecField[] = SUMMARY_ORDER.filter((id) => values.has(id)).map((id) => ({
      label: CHARACTERISTIC_NAMES[id],
      value: values.get(id) as string,
    }));

    const batteryText = values.get(0x2a19);
    const battery = batteryText ? Number.parseInt(batteryText, 10) : null;

    return {
      services: out,
      details,
      battery: battery != null && Number.isFinite(battery) ? battery : null,
    };
  } finally {
    // The link is only needed for the read. Holding it open would keep the
    // peripheral awake (and block whatever else wants to pair with it).
    try {
      gatt.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}
