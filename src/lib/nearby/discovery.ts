/**
 * Nearby-device discovery — shared by the Nearby Devices app and the compact
 * panel in System Info.
 *
 * A web page can't sweep the local network or the airwaves the way a native
 * scanner does — the platform deliberately puts a user-consent step in front of
 * every peripheral. What it *can* do is exactly what's implemented here:
 *
 * - enumerate devices this site was already granted (Bluetooth, USB, HID, serial),
 * - list attached audio/video hardware and connected gamepads,
 * - ask whether a Bluetooth radio and cast-capable displays are present,
 * - open the browser's own device chooser, which itself scans and shows what's
 *   around, and hand back whichever device the user picks,
 * - stream live BLE advertisements (name + signal strength) where Chrome's
 *   experimental scanning API is enabled.
 *
 * Each normalised device also carries the full spec sheet `inspect.ts` can build
 * from the descriptor the API returned — no extra permission, no open session.
 * Bluetooth is the exception: its features need a GATT connection, so they live
 * behind the explicit action in `gatt.ts`.
 *
 * Every probe is guarded and returns empty/null rather than throwing, so a
 * missing API only shrinks the result. All are browser-only.
 */

import {
  rememberHidDevice,
  rememberSerialPort,
  rememberUsbDevice,
} from "./connect";
import { GATT_OPTIONAL_SERVICES, rememberBluetoothDevice } from "./gatt";
import {
  bluetoothSpec,
  gamepadSpec,
  hidSpec,
  mediaSpec,
  serialSpec,
  usbSpec,
} from "./inspect";
import { hexId, hidKind, joinDetail } from "./labels";
import type {
  AdvertisementEventLike,
  BluetoothDeviceLike,
  HidDeviceLike,
  MediaDeviceInfoLike,
  NearbyDevice,
  NearbyScan,
  NearbySupport,
  PairResult,
  PairableTransport,
  PresentationRequestCtor,
  NearbyNavigator,
  SerialPortLike,
  Transport,
  UsbDeviceLike,
} from "./types";

export type {
  NearbyDevice,
  NearbyScan,
  NearbySupport,
  PairResult,
  PairableTransport,
  SpecField,
  SpecGroup,
  Transport,
} from "./types";

const nav = (): NearbyNavigator | null =>
  typeof navigator === "undefined" ? null : (navigator as unknown as NearbyNavigator);

const presentationCtor = (): PresentationRequestCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { PresentationRequest?: PresentationRequestCtor };
  return w.PresentationRequest ?? null;
};

/**
 * A cancelled chooser is the normal way to close a picker, so it's reported as
 * `cancelled` rather than as a failure the UI should complain about.
 */
function toPairFailure(err: unknown): PairResult {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotFoundError" || name === "AbortError") {
    return { ok: false, cancelled: true, message: "" };
  }
  const message =
    name === "SecurityError"
      ? "Blocked by the page's permissions policy."
      : err instanceof Error && err.message
        ? err.message
        : "The browser refused the request.";
  return { ok: false, cancelled: false, message };
}

/* ------------------------------ normalisers ------------------------------ */

function btDevice(
  d: BluetoothDeviceLike,
  ad?: { rssi?: number; txPower?: number },
): NearbyDevice {
  const key = `bluetooth:${d.id}`;
  // File the live object away so a detail view can walk its GATT table later.
  rememberBluetoothDevice(key, d);
  return {
    key,
    name: d.name?.trim() || "Unnamed Bluetooth device",
    transport: "bluetooth",
    detail: joinDetail(ad?.rssi != null && `${ad.rssi} dBm`, `ID ${d.id.slice(0, 12)}`),
    connected: d.gatt?.connected ?? undefined,
    rssi: ad?.rssi,
    spec: bluetoothSpec(d, ad),
  };
}

const usbDevice = (d: UsbDeviceLike): NearbyDevice => {
  const key = `usb:${d.vendorId}:${d.productId}:${d.serialNumber ?? ""}`;
  // Keep the live object so `connect.ts` can open a session without re-prompting.
  rememberUsbDevice(key, d);
  return {
    key,
    name: d.productName?.trim() || `USB device ${hexId(d.vendorId)}:${hexId(d.productId)}`,
    transport: "usb",
    detail: joinDetail(
      d.manufacturerName,
      `VID ${hexId(d.vendorId)}`,
      `PID ${hexId(d.productId)}`,
      d.serialNumber && `SN ${d.serialNumber}`,
    ),
    connected: d.opened ?? undefined,
    spec: usbSpec(d),
  };
};

const hidDevice = (d: HidDeviceLike): NearbyDevice => {
  const key = `hid:${d.vendorId}:${d.productId}:${d.productName ?? ""}`;
  rememberHidDevice(key, d);
  return {
    key,
    name: d.productName?.trim() || `HID device ${hexId(d.vendorId)}:${hexId(d.productId)}`,
    transport: "hid",
    detail: joinDetail(
      hidKind(d.collections ?? []),
      `VID ${hexId(d.vendorId)}`,
      `PID ${hexId(d.productId)}`,
    ),
    connected: d.opened ?? undefined,
    spec: hidSpec(d),
  };
};

const serialPort = (p: SerialPortLike, index: number): NearbyDevice => {
  const info = (() => {
    try {
      return p.getInfo?.() ?? {};
    } catch {
      return {};
    }
  })();
  const usb =
    info.usbVendorId != null
      ? `VID ${hexId(info.usbVendorId)}${info.usbProductId != null ? ` · PID ${hexId(info.usbProductId)}` : ""}`
      : "Platform serial port";
  const key = `serial:${info.usbVendorId ?? "x"}:${info.usbProductId ?? "x"}:${index}`;
  rememberSerialPort(key, p);
  return {
    key,
    name: info.usbVendorId != null ? "USB serial port" : "Serial port",
    transport: "serial",
    detail: usb,
    spec: serialSpec(info),
  };
};

/** `MediaDeviceKind` → the transport it's filed under and its generic name. */
const MEDIA_KINDS: Record<string, { transport: Transport; fallback: string }> = {
  audioinput: { transport: "mic", fallback: "Microphone" },
  audiooutput: { transport: "speaker", fallback: "Speaker / headset" },
  videoinput: { transport: "camera", fallback: "Camera" },
};

/* -------------------------------- probes -------------------------------- */

/** Which discovery routes exist in this browser. Cheap, synchronous. */
export function getNearbySupport(): NearbySupport {
  const n = nav();
  const support = {
    bluetooth: !!n?.bluetooth,
    leScan: typeof n?.bluetooth?.requestLEScan === "function",
    usb: !!n?.usb,
    hid: !!n?.hid,
    serial: !!n?.serial,
    media: !!n?.mediaDevices?.enumerateDevices,
    gamepad: typeof n?.getGamepads === "function",
    cast: !!presentationCtor(),
  };
  return { ...support, any: Object.values(support).some(Boolean) };
}

/**
 * Whether a Bluetooth radio is present and switched on. `null` means the
 * browser wouldn't say (older Chrome, or Web Bluetooth missing entirely).
 */
export async function getBluetoothAvailability(): Promise<boolean | null> {
  const bt = nav()?.bluetooth;
  if (!bt?.getAvailability) return null;
  try {
    return await bt.getAvailability();
  } catch {
    return null;
  }
}

/**
 * Watch for cast-capable displays on the local network. Resolves to a stop
 * function, or null when the Presentation API isn't usable here. `onChange`
 * fires immediately with the current answer and again whenever it changes.
 */
export async function watchCastAvailability(
  onChange: (available: boolean) => void,
): Promise<(() => void) | null> {
  const Ctor = presentationCtor();
  if (!Ctor || typeof window === "undefined") return null;
  try {
    const request = new Ctor([window.location.href]);
    const availability = await request.getAvailability();
    const sync = () => onChange(availability.value);
    sync();
    availability.addEventListener("change", sync);
    return () => availability.removeEventListener("change", sync);
  } catch {
    // Unsupported presentation URL, or discovery disabled by the platform.
    return null;
  }
}

/**
 * List everything visible without prompting: devices this site was already
 * granted, attached audio/video hardware, and connected gamepads. Nothing here
 * shows a dialog, so it's safe to run on mount and on every device-change event.
 */
export async function scanNearbyDevices(): Promise<NearbyScan> {
  const n = nav();
  if (!n) return { devices: [], namesHidden: false };

  const [bt, usb, hid, serial, media] = await Promise.all([
    n.bluetooth?.getDevices?.().catch(() => []) ?? Promise.resolve([]),
    n.usb?.getDevices().catch(() => []) ?? Promise.resolve([]),
    n.hid?.getDevices().catch(() => []) ?? Promise.resolve([]),
    n.serial?.getPorts().catch(() => []) ?? Promise.resolve([]),
    n.mediaDevices?.enumerateDevices?.().catch(() => []) ?? Promise.resolve([]),
  ]);

  const devices: NearbyDevice[] = [
    ...bt.map((d) => btDevice(d)),
    ...usb.map(usbDevice),
    ...hid.map(hidDevice),
    ...serial.map(serialPort),
  ];

  // Windows repeats each audio endpoint as "default" and "communications";
  // those aren't separate devices, so they're dropped.
  const realMedia = (media as MediaDeviceInfoLike[]).filter(
    (d) => d.deviceId && d.deviceId !== "default" && d.deviceId !== "communications",
  );
  let namesHidden = false;
  for (const d of realMedia) {
    const kind = MEDIA_KINDS[d.kind];
    if (!kind) continue;
    if (!d.label) namesHidden = true;
    devices.push({
      key: `media:${d.kind}:${d.deviceId}`,
      name: d.label?.trim() || kind.fallback,
      transport: kind.transport,
      // The badge already names the kind, so the detail line is only used when
      // there's something extra to say.
      detail: !d.label ? "name hidden until permission is granted" : undefined,
      connected: true,
      spec: mediaSpec(d),
    });
  }

  for (const pad of n.getGamepads?.() ?? []) {
    if (!pad) continue;
    devices.push({
      key: `gamepad:${pad.index}`,
      name: pad.id || `Gamepad ${pad.index + 1}`,
      transport: "gamepad",
      detail: joinDetail(`${pad.buttons.length} buttons`, `${pad.axes.length} axes`),
      connected: pad.connected,
      padIndex: pad.index,
      spec: gamepadSpec(pad),
    });
  }

  return { devices, namesHidden };
}

/** Whether this browser reports per-track capabilities for media hardware. */
export function getSupportedMediaConstraints(): string[] {
  try {
    const supported = nav()?.mediaDevices?.getSupportedConstraints?.() ?? {};
    return Object.entries(supported)
      .filter(([, on]) => on)
      .map(([name]) => name);
  } catch {
    return [];
  }
}

/**
 * Ask for camera/mic access purely so `enumerateDevices` starts returning real
 * device names, then release the tracks immediately. Falls back to audio-only,
 * then video-only, for machines that have just one. Returns whether it worked.
 */
export async function revealDeviceNames(): Promise<boolean> {
  const md = nav()?.mediaDevices;
  if (!md?.getUserMedia) return false;
  const attempts: MediaStreamConstraints[] = [
    { audio: true, video: true },
    { audio: true },
    { video: true },
  ];
  for (const constraints of attempts) {
    try {
      const stream = await md.getUserMedia(constraints);
      for (const track of stream.getTracks()) track.stop();
      return true;
    } catch (err) {
      // A denied permission won't be fixed by a narrower request — stop asking.
      if (err instanceof DOMException && err.name === "NotAllowedError") return false;
    }
  }
  return false;
}

/**
 * Open the browser's own chooser for a transport. The chooser is what actually
 * scans — it lists what's in range and returns only the device the user picks,
 * which is then permanently visible to {@link scanNearbyDevices}. Must be called
 * from a user gesture.
 *
 * Bluetooth requests the standard GATT services up front: permission for those
 * can only be granted at pick time, and without it a device's own features stay
 * unreadable for the rest of the session.
 */
export async function pairDevice(transport: PairableTransport): Promise<PairResult> {
  const n = nav();
  try {
    switch (transport) {
      case "bluetooth": {
        if (!n?.bluetooth) throw new Error("Web Bluetooth isn't available.");
        const d = await n.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: GATT_OPTIONAL_SERVICES,
        });
        return { ok: true, devices: [btDevice(d)] };
      }
      case "usb": {
        if (!n?.usb) throw new Error("WebUSB isn't available.");
        const d = await n.usb.requestDevice({ filters: [] });
        return { ok: true, devices: [usbDevice(d)] };
      }
      case "hid": {
        if (!n?.hid) throw new Error("WebHID isn't available.");
        const list = await n.hid.requestDevice({ filters: [] });
        return { ok: true, devices: list.map(hidDevice) };
      }
      case "serial": {
        if (!n?.serial) throw new Error("Web Serial isn't available.");
        const port = await n.serial.requestPort();
        return { ok: true, devices: [serialPort(port, 0)] };
      }
    }
  } catch (err) {
    return toPairFailure(err);
  }
}

/**
 * Start passive BLE advertisement scanning — the one route that sees devices
 * without the user picking each one. Chrome only: it needs
 * `chrome://flags/#enable-experimental-web-platform-features` plus a scanning
 * permission prompt. Resolves to a stop function; throws if it can't start, so
 * the caller can explain why.
 */
export async function startLeScan(
  onDevice: (device: NearbyDevice) => void,
): Promise<() => void> {
  const bt = nav()?.bluetooth;
  if (!bt?.requestLEScan) throw new Error("Live BLE scanning isn't supported in this browser.");

  const onAdvertisement = (event: Event) => {
    const ad = event as AdvertisementEventLike;
    if (!ad.device) return;
    const device = btDevice(ad.device, { rssi: ad.rssi, txPower: ad.txPower });
    // The advertisement's own name beats the paired-device record's.
    if (ad.name?.trim()) device.name = ad.name.trim();
    onDevice(device);
  };

  const scan = await bt.requestLEScan({ acceptAllAdvertisements: true });
  bt.addEventListener("advertisementreceived", onAdvertisement);

  return () => {
    bt.removeEventListener("advertisementreceived", onAdvertisement);
    try {
      scan.stop();
    } catch {
      /* already stopped */
    }
  };
}

/**
 * Subscribe to every transport's connect/disconnect signal. `onChange` fires
 * whenever the set of attached devices could have changed; returns an unsubscribe.
 */
export function watchDeviceChanges(onChange: () => void): () => void {
  const n = nav();
  const offs: (() => void)[] = [];

  const on = (target: EventTarget | undefined, types: string[]) => {
    if (!target) return;
    for (const type of types) {
      target.addEventListener(type, onChange);
      offs.push(() => target.removeEventListener(type, onChange));
    }
  };

  on(n?.usb, ["connect", "disconnect"]);
  on(n?.hid, ["connect", "disconnect"]);
  on(n?.serial, ["connect", "disconnect"]);
  on(n?.bluetooth, ["availabilitychanged"]);
  on(n?.mediaDevices, ["devicechange"]);
  if (typeof window !== "undefined") {
    on(window, ["gamepadconnected", "gamepaddisconnected"]);
  }

  return () => {
    for (const off of offs) off();
  };
}
