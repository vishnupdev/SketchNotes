/**
 * Opening a real session with a discovered device.
 *
 * Discovery (`discovery.ts`) only ever *looks* at hardware — it reads the
 * descriptor the browser already holds and never touches the device. This module
 * is the deliberate other half: it opens the link, holds it, and closes it again
 * on request. Nothing here runs on its own; every connection starts from a click.
 *
 * "Connect" means something different on each transport, and the UI says so
 * rather than pretending they're the same thing:
 *
 * - **Bluetooth** — a GATT connection. Real radio work: it can wake a sleeping
 *   peripheral, takes seconds, and stops anything else pairing with it meanwhile.
 * - **USB** — a WebUSB session, and a configuration selected if the device has
 *   none. No interface is claimed: claiming would take the device away from the
 *   OS driver that owns it, which is both hostile and usually refused.
 * - **HID** — an open handle, which is what lets input reports flow. Chrome
 *   refuses this outright for keyboards, mice and security keys.
 * - **Serial** — the port opened at a chosen line speed. Opening reserves the
 *   port, so nothing else on the machine can use it until it's closed.
 *
 * No data is written to any device, on any transport.
 *
 * State lives at module scope, not in React, for two reasons: an open handle
 * outlives the component that opened it, and switching to another app and back
 * must not silently drop the user's connections.
 */

import { getBluetoothHandle, setGattHeld } from "./gatt";
import type {
  HidDeviceLike,
  PairableTransport,
  SerialPortLike,
  UsbDeviceLike,
} from "./types";

/** Where a device's link currently is. */
export type LinkState = "idle" | "connecting" | "connected" | "disconnecting";

export interface DeviceLink {
  state: LinkState;
  /** Why the last attempt failed, cleared as soon as a new one starts. */
  error: string | null;
  /** `Date.now()` when the link opened — drives the "connected for" readout. */
  since: number | null;
  /** One short live fact about the open link (line speed, GATT status). */
  info: string | null;
}

/** Line speeds offered for a serial port, slowest first. 9600 is the safe default. */
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600] as const;

export const DEFAULT_BAUD_RATE = 9600;

/** What opening this transport actually does, shown next to the button. */
export const CONNECT_MEANING: Record<PairableTransport, string> = {
  bluetooth: "Opens a GATT connection and holds it. The device stays awake while connected.",
  usb: "Starts a USB session and selects a configuration. No interface is claimed.",
  hid: "Opens the device so its input reports can flow. Keyboards and mice are blocked by the browser.",
  serial: "Opens the port at the chosen speed and reserves it from the rest of the system.",
};

/* --------------------------- live handle registry -------------------------- */

/*
 * A `NearbyDevice` is a plain snapshot — enough for a list, useless for opening
 * a link. Discovery files the real object here as it normalises each device, so
 * connecting later needs no second prompt. Per page load; nothing is persisted.
 */
const usbHandles = new Map<string, UsbDeviceLike>();
const hidHandles = new Map<string, HidDeviceLike>();
const serialHandles = new Map<string, SerialPortLike>();

export const rememberUsbDevice = (key: string, device: UsbDeviceLike): void => {
  usbHandles.set(key, device);
};
export const rememberHidDevice = (key: string, device: HidDeviceLike): void => {
  hidHandles.set(key, device);
};
export const rememberSerialPort = (key: string, port: SerialPortLike): void => {
  serialHandles.set(key, port);
};

/** The transport a device key was minted with. */
const transportOf = (key: string): string => key.slice(0, key.indexOf(":"));

/**
 * Whether this device can be opened from this page load. False for media and
 * gamepad devices (nothing to open), and for anything whose handle was lost to a
 * page reload — the key survives in the list, the live object doesn't.
 */
export function canConnect(key: string): boolean {
  switch (transportOf(key)) {
    case "bluetooth":
      return !!getBluetoothHandle(key)?.gatt;
    case "usb":
      return typeof usbHandles.get(key)?.open === "function";
    case "hid":
      return typeof hidHandles.get(key)?.open === "function";
    case "serial":
      return typeof serialHandles.get(key)?.open === "function";
    default:
      return false;
  }
}

/* -------------------------------- the store ------------------------------- */

const IDLE: DeviceLink = { state: "idle", error: null, since: null, info: null };
const EMPTY: ReadonlyMap<string, DeviceLink> = new Map();

let links: ReadonlyMap<string, DeviceLink> = EMPTY;
const listeners = new Set<() => void>();

/**
 * Replaced wholesale rather than mutated: `useSyncExternalStore` compares
 * snapshots by identity, so an in-place edit would render nothing.
 */
function patch(key: string, next: Partial<DeviceLink>): void {
  const merged = { ...(links.get(key) ?? IDLE), ...next };
  const map = new Map(links);
  // An idle link with nothing left to say is dropped, so the map only ever holds
  // links that are open, busy, or explaining a failure.
  if (merged.state === "idle" && !merged.error) map.delete(key);
  else map.set(key, merged);
  links = map;
  for (const listener of listeners) listener();
}

export function subscribeLinks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getLinks = (): ReadonlyMap<string, DeviceLink> => links;

/** The server render has no devices and no links — a stable empty map. */
export const getServerLinks = (): ReadonlyMap<string, DeviceLink> => EMPTY;

export const getLink = (key: string): DeviceLink => links.get(key) ?? IDLE;

/* ------------------------------ error wording ----------------------------- */

/**
 * Platform errors here are famously opaque — Windows in particular answers a
 * blocked `USBDevice.open()` with a bare "Access denied". Each is turned into
 * the sentence that tells the user what to actually do about it.
 */
function explain(err: unknown, transport: PairableTransport): string {
  const name = err instanceof DOMException ? err.name : "";
  const raw = err instanceof Error && err.message ? err.message : "";

  if (name === "InvalidStateError") return "The device is already open somewhere else.";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return transport === "hid"
      ? "The browser blocks this device — keyboards, mice and security keys can't be opened by a web page."
      : "Permission for this device was refused.";
  }
  if (name === "NetworkError" || name === "NotFoundError") {
    switch (transport) {
      case "bluetooth":
        return "Couldn't connect. The device may be out of range, asleep, or already paired elsewhere.";
      case "usb":
        return "The system driver already owns this device, so the browser can't open it.";
      case "serial":
        return "The port is in use by another program, or has been unplugged.";
      default:
        return "The device didn't respond.";
    }
  }
  return raw || "The device refused the connection.";
}

/* -------------------------------- connect --------------------------------- */

/** Bluetooth links that drop on their own must correct the UI without polling. */
const dropListeners = new Map<string, () => void>();

function watchGattDrop(key: string): void {
  const device = getBluetoothHandle(key);
  if (!device?.addEventListener || dropListeners.has(key)) return;
  const onDrop = () => {
    setGattHeld(key, false);
    unwatchGattDrop(key);
    patch(key, { state: "idle", since: null, info: null, error: "The device disconnected." });
  };
  device.addEventListener("gattserverdisconnected", onDrop);
  dropListeners.set(key, onDrop);
}

function unwatchGattDrop(key: string): void {
  const onDrop = dropListeners.get(key);
  if (!onDrop) return;
  getBluetoothHandle(key)?.removeEventListener?.("gattserverdisconnected", onDrop);
  dropListeners.delete(key);
}

/**
 * Open a link to a device. Resolves either way — the outcome is reported through
 * the store, since that's what the row is already rendering from. Must be called
 * from a user gesture.
 */
export async function connectDevice(
  key: string,
  options: { baudRate?: number } = {},
): Promise<void> {
  const transport = transportOf(key) as PairableTransport;
  if (getLink(key).state !== "idle") return;
  patch(key, { state: "connecting", error: null });

  try {
    switch (transport) {
      case "bluetooth": {
        const device = getBluetoothHandle(key);
        if (!device?.gatt) throw new Error("This device's handle is gone — pick it again.");
        const gatt = await device.gatt.connect();
        // Held before the listener is armed: the peripheral can drop the link in
        // the gap, and a stale `held` entry would leak a suppressed disconnect.
        setGattHeld(key, true);
        watchGattDrop(key);
        const services = await gatt.getPrimaryServices().catch(() => []);
        patch(key, {
          state: "connected",
          since: Date.now(),
          info: `GATT · ${services.length} service${services.length === 1 ? "" : "s"}`,
        });
        break;
      }

      case "usb": {
        const device = usbHandles.get(key);
        if (!device?.open) throw new Error("This device's handle is gone — pick it again.");
        await device.open();
        // An unconfigured device can't be talked to at all. Selecting the first
        // configuration is the standard wake-up and claims nothing.
        if (device.configuration == null && device.selectConfiguration) {
          const first = device.configurations?.[0]?.configurationValue ?? 1;
          await device.selectConfiguration(first).catch(() => {
            /* some devices expose exactly one and reject the call */
          });
        }
        const value = device.configuration?.configurationValue;
        patch(key, {
          state: "connected",
          since: Date.now(),
          info: value != null ? `Session open · configuration ${value}` : "Session open",
        });
        break;
      }

      case "hid": {
        const device = hidHandles.get(key);
        if (!device?.open) throw new Error("This device's handle is gone — pick it again.");
        await device.open();
        patch(key, { state: "connected", since: Date.now(), info: "Open · reports flowing" });
        break;
      }

      case "serial": {
        const port = serialHandles.get(key);
        if (!port?.open) throw new Error("This port's handle is gone — pick it again.");
        const baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;
        await port.open({ baudRate });
        patch(key, {
          state: "connected",
          since: Date.now(),
          info: `Open · ${baudRate.toLocaleString()} baud`,
        });
        break;
      }

      default:
        throw new Error("This kind of device can't be connected to.");
    }
  } catch (err) {
    if (transport === "bluetooth") {
      setGattHeld(key, false);
      unwatchGattDrop(key);
    }
    patch(key, { state: "idle", since: null, info: null, error: explain(err, transport) });
  }
}

/** Close a link. Best-effort: a device that has already gone still ends idle. */
export async function disconnectDevice(key: string): Promise<void> {
  const transport = transportOf(key) as PairableTransport;
  if (getLink(key).state !== "connected") return;
  patch(key, { state: "disconnecting", error: null });

  try {
    switch (transport) {
      case "bluetooth": {
        setGattHeld(key, false);
        unwatchGattDrop(key);
        getBluetoothHandle(key)?.gatt?.disconnect();
        break;
      }
      case "usb":
        await usbHandles.get(key)?.close?.();
        break;
      case "hid":
        await hidHandles.get(key)?.close?.();
        break;
      case "serial": {
        const port = serialHandles.get(key);
        // `close()` hangs forever on a locked stream. Nothing here reads from the
        // port, so a lock means someone else owns it and closing isn't ours to do.
        if (port?.readable?.locked) throw new Error("The port is busy — try again in a moment.");
        await port?.close?.();
        break;
      }
    }
    patch(key, { state: "idle", since: null, info: null, error: null });
  } catch (err) {
    // The link is genuinely still open, so it stays reported as connected.
    patch(key, { state: "connected", error: explain(err, transport) });
  }
}

/** Close every open link, in parallel. Used by "Disconnect all" and on unload. */
export async function disconnectAllDevices(): Promise<void> {
  const open = [...links.entries()]
    .filter(([, link]) => link.state === "connected")
    .map(([key]) => key);
  await Promise.all(open.map((key) => disconnectDevice(key)));
}

/**
 * Drop links whose device is no longer reporting itself as open — something
 * unplugged, or a peripheral that vanished without firing an event. Cheap and
 * synchronous, so the caller can run it after every device sweep.
 */
export function reconcileLinks(): void {
  for (const [key, link] of links) {
    if (link.state !== "connected") continue;
    const alive = (() => {
      switch (transportOf(key)) {
        case "bluetooth":
          return getBluetoothHandle(key)?.gatt?.connected ?? false;
        case "usb":
          return usbHandles.get(key)?.opened ?? false;
        case "hid":
          return hidHandles.get(key)?.opened ?? false;
        // Web Serial reports no `opened` flag, so an open port is taken at its
        // word until close() or an explicit disconnect event says otherwise.
        default:
          return true;
      }
    })();
    if (!alive) {
      if (transportOf(key) === "bluetooth") {
        setGattHeld(key, false);
        unwatchGattDrop(key);
      }
      patch(key, { state: "idle", since: null, info: null, error: "The device disconnected." });
    }
  }
}

// Leaving the page should hand every device back rather than relying on the
// browser's own teardown. `pagehide` fires on navigation and on tab close, which
// `beforeunload` does not reliably do on mobile.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void disconnectAllDevices();
  });
}
