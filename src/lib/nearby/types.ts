/**
 * Shared vocabulary for nearby-device discovery — used by both the Nearby
 * Devices app (`components/Nearby`) and the compact panel inside System Info.
 *
 * Every peripheral API is typed locally here (and read through a single
 * `unknown` cast in `discovery.ts`) so the codebase needs no DOM lib that ships
 * WebUSB/WebHID/Web Bluetooth definitions, and no `any` leaks into the app.
 */

/** Which platform API a discovered device came through. */
export type Transport =
  | "bluetooth"
  | "usb"
  | "hid"
  | "serial"
  | "mic"
  | "speaker"
  | "camera"
  | "gamepad";

/** Transports that surface a picker the user can pair a new device from. */
export type PairableTransport = "bluetooth" | "usb" | "hid" | "serial";

/** One label/value pair in a device's spec sheet. */
export interface SpecField {
  label: string;
  value: string;
  /** Ids, codes and version strings read better in the mono face. */
  mono?: boolean;
}

/**
 * One titled block of a device's spec sheet. `rows` carries free-form lines
 * (USB endpoints, HID reports) that are lists rather than label/value pairs.
 */
export interface SpecGroup {
  title: string;
  fields: SpecField[];
  rows?: string[];
}

/** One discovered device, normalised across every transport. */
export interface NearbyDevice {
  /** Stable list key — transport plus the API's own identifier. */
  key: string;
  name: string;
  transport: Transport;
  /** Secondary line: vendor/product ids, port info, device class. */
  detail?: string;
  /** Live link state, when the transport reports one. */
  connected?: boolean;
  /** Advertised signal strength in dBm — live BLE scan only. */
  rssi?: number;
  /**
   * Everything else the platform will say about this device, grouped for
   * display. Built by `inspect.ts` at discovery time, so it needs no second
   * permission and no open connection.
   */
  spec?: SpecGroup[];
  /** Index into `navigator.getGamepads()`, for the live controller view. */
  padIndex?: number;
}

/** Which discovery routes this browser offers. */
export interface NearbySupport {
  bluetooth: boolean;
  /** Experimental passive BLE advertisement scanning. */
  leScan: boolean;
  usb: boolean;
  hid: boolean;
  serial: boolean;
  media: boolean;
  gamepad: boolean;
  cast: boolean;
  /** False when the browser exposes no discovery API at all. */
  any: boolean;
}

/** Outcome of opening a device chooser. */
export type PairResult =
  | { ok: true; devices: NearbyDevice[] }
  | { ok: false; cancelled: boolean; message: string };

/** Result of one permission-free sweep. */
export interface NearbyScan {
  devices: NearbyDevice[];
  /** True when media devices exist but the browser is withholding their names. */
  namesHidden: boolean;
}

/* ------------------------------------------------------------------ *
 * Minimal typings for the peripheral APIs.
 * ------------------------------------------------------------------ */

export interface BluetoothCharacteristicPropertiesLike {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}
export interface BluetoothCharacteristicLike {
  uuid: string;
  properties: BluetoothCharacteristicPropertiesLike;
  readValue: () => Promise<DataView>;
}
export interface BluetoothServiceLike {
  uuid: string;
  isPrimary?: boolean;
  getCharacteristics: () => Promise<BluetoothCharacteristicLike[]>;
}
export interface BluetoothGattLike {
  connected: boolean;
  connect: () => Promise<BluetoothGattLike>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothServiceLike[]>;
}
export interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothGattLike;
  /**
   * `BluetoothDevice` is an `EventTarget`, but only `gattserverdisconnected` is
   * used here — a peripheral that drops the link (out of range, powered off)
   * must be able to correct the UI without being polled.
   */
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}
export interface BluetoothLEScanLike {
  active: boolean;
  stop: () => void;
}
export interface AdvertisementEventLike extends Event {
  device: BluetoothDeviceLike;
  name?: string;
  rssi?: number;
  txPower?: number;
  appearance?: number;
}
export interface BluetoothLike extends EventTarget {
  getAvailability?: () => Promise<boolean>;
  getDevices?: () => Promise<BluetoothDeviceLike[]>;
  requestDevice: (opts: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDeviceLike>;
  requestLEScan?: (opts: { acceptAllAdvertisements?: boolean }) => Promise<BluetoothLEScanLike>;
}

export interface UsbEndpointLike {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
  packetSize: number;
}
export interface UsbAlternateLike {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName?: string;
  endpoints?: UsbEndpointLike[];
}
export interface UsbInterfaceLike {
  interfaceNumber: number;
  claimed?: boolean;
  alternate?: UsbAlternateLike;
  alternates?: UsbAlternateLike[];
}
export interface UsbConfigurationLike {
  configurationValue: number;
  configurationName?: string;
  interfaces?: UsbInterfaceLike[];
}
export interface UsbDeviceLike {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  opened?: boolean;
  deviceClass?: number;
  deviceSubclass?: number;
  deviceProtocol?: number;
  usbVersionMajor?: number;
  usbVersionMinor?: number;
  usbVersionSubminor?: number;
  deviceVersionMajor?: number;
  deviceVersionMinor?: number;
  deviceVersionSubminor?: number;
  configuration?: UsbConfigurationLike | null;
  configurations?: UsbConfigurationLike[];
  /** Opening starts a session with the device; it claims no interface on its own. */
  open?: () => Promise<void>;
  close?: () => Promise<void>;
  selectConfiguration?: (configurationValue: number) => Promise<void>;
}
export interface UsbLike extends EventTarget {
  getDevices: () => Promise<UsbDeviceLike[]>;
  requestDevice: (opts: { filters: unknown[] }) => Promise<UsbDeviceLike>;
}

export interface HidReportItemLike {
  reportSize?: number;
  reportCount?: number;
  usages?: number[];
  isAbsolute?: boolean;
  logicalMinimum?: number;
  logicalMaximum?: number;
  unitExponent?: number;
}
export interface HidReportLike {
  reportId?: number;
  items?: HidReportItemLike[];
}
export interface HidCollectionLike {
  usagePage?: number;
  usage?: number;
  type?: number;
  inputReports?: HidReportLike[];
  outputReports?: HidReportLike[];
  featureReports?: HidReportLike[];
  children?: HidCollectionLike[];
}
export interface HidDeviceLike {
  vendorId: number;
  productId: number;
  productName?: string;
  opened?: boolean;
  collections?: HidCollectionLike[];
  open?: () => Promise<void>;
  close?: () => Promise<void>;
}
export interface HidLike extends EventTarget {
  getDevices: () => Promise<HidDeviceLike[]>;
  requestDevice: (opts: { filters: unknown[] }) => Promise<HidDeviceLike[]>;
}

export interface SerialPortInfoLike {
  usbVendorId?: number;
  usbProductId?: number;
}
export interface SerialPortLike {
  getInfo?: () => SerialPortInfoLike;
  /** A serial port can't be opened without a line speed, so one is always passed. */
  open?: (options: { baudRate: number }) => Promise<void>;
  close?: () => Promise<void>;
  /** Present once open. Only checked for a stream lock before closing. */
  readable?: { locked?: boolean } | null;
}
export interface SerialLike extends EventTarget {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: (opts?: { filters?: unknown[] }) => Promise<SerialPortLike>;
}

/** A capability value as `getCapabilities()` reports it. */
export type CapabilityValue =
  | string
  | number
  | boolean
  | string[]
  | boolean[]
  | { min?: number; max?: number; exact?: number };

/** `MediaDeviceInfo`, plus the `getCapabilities()` Chromium adds to inputs. */
export interface MediaDeviceInfoLike {
  deviceId: string;
  groupId: string;
  kind: string;
  label: string;
  getCapabilities?: () => Record<string, CapabilityValue>;
}

/** `navigator.mediaDevices`, narrowed to the parts discovery uses. */
export interface MediaDevicesLike extends EventTarget {
  enumerateDevices?: () => Promise<MediaDeviceInfoLike[]>;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getSupportedConstraints?: () => Record<string, boolean>;
}

export interface PresentationAvailabilityLike extends EventTarget {
  value: boolean;
}
export interface PresentationRequestCtor {
  new (urls: string[]): { getAvailability: () => Promise<PresentationAvailabilityLike> };
}

export interface NearbyNavigator {
  bluetooth?: BluetoothLike;
  usb?: UsbLike;
  hid?: HidLike;
  serial?: SerialLike;
  mediaDevices?: MediaDevicesLike;
  getGamepads?: () => (Gamepad | null)[];
}
