import type { Transport } from "@/lib/nearby/discovery";
import {
  BluetoothIcon,
  CameraIcon,
  GamepadIcon,
  KeyboardIcon,
  MicIcon,
  PortIcon,
  SpeakerIcon,
  UsbIcon,
} from "@/components/SketchNotes/atoms/deviceIcons";

export interface TransportMeta {
  /** Short badge text. */
  label: string;
  /** Full name, used in filter chips and group headings. */
  long: string;
  Icon: typeof UsbIcon;
  /** The platform API this transport comes through. */
  api: string;
}

/**
 * One place naming every transport, so the list badge, the filter chip, the
 * detail header and the support matrix can never disagree about what a
 * Bluetooth device is called or which API found it.
 */
export const TRANSPORTS: Record<Transport, TransportMeta> = {
  bluetooth: { label: "BT", long: "Bluetooth", Icon: BluetoothIcon, api: "Web Bluetooth" },
  usb: { label: "USB", long: "USB", Icon: UsbIcon, api: "WebUSB" },
  hid: { label: "HID", long: "Human interface", Icon: KeyboardIcon, api: "WebHID" },
  serial: { label: "COM", long: "Serial", Icon: PortIcon, api: "Web Serial" },
  gamepad: { label: "PAD", long: "Controller", Icon: GamepadIcon, api: "Gamepad" },
  mic: { label: "MIC", long: "Microphone", Icon: MicIcon, api: "Media Devices" },
  speaker: { label: "OUT", long: "Audio output", Icon: SpeakerIcon, api: "Media Devices" },
  camera: { label: "CAM", long: "Camera", Icon: CameraIcon, api: "Media Devices" },
};

/** Display order — wireless first, then wired, then built-in hardware. */
export const TRANSPORT_ORDER: Transport[] = [
  "bluetooth",
  "usb",
  "hid",
  "serial",
  "gamepad",
  "mic",
  "speaker",
  "camera",
];
