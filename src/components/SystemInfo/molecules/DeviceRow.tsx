import { cx } from "@/lib/utils";
import type { NearbyDevice, Transport } from "@/lib/nearby/discovery";
import {
  BluetoothIcon,
  CameraIcon,
  GamepadIcon,
  KeyboardIcon,
  MicIcon,
  PortIcon,
  SignalIcon,
  SpeakerIcon,
  UsbIcon,
} from "@/components/SketchNotes/atoms/deviceIcons";

const TRANSPORT_META: Record<Transport, { label: string; Icon: typeof UsbIcon }> = {
  bluetooth: { label: "Bluetooth", Icon: BluetoothIcon },
  usb: { label: "USB", Icon: UsbIcon },
  hid: { label: "HID", Icon: KeyboardIcon },
  serial: { label: "Serial", Icon: PortIcon },
  gamepad: { label: "Gamepad", Icon: GamepadIcon },
  mic: { label: "Mic", Icon: MicIcon },
  speaker: { label: "Speaker", Icon: SpeakerIcon },
  camera: { label: "Camera", Icon: CameraIcon },
};

/** dBm → a 0–4 bar count. −50 or better is excellent, −100 is the noise floor. */
function bars(rssi: number): number {
  if (rssi >= -55) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -85) return 2;
  return 1;
}

/**
 * One discovered device: transport icon, name, class badge and — for devices
 * found by a live BLE scan — the advertised signal strength.
 */
export function DeviceRow({ device }: { device: NearbyDevice }) {
  const { label, Icon } = TRANSPORT_META[device.transport];

  return (
    <li className="flex items-center gap-3 border-b border-border px-1 py-2.5 last:border-b-0">
      <span className="grid size-9 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon size={17} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[13.5px] font-semibold">{device.name}</span>
          {device.connected && (
            <span
              className="size-2 flex-none rounded-full bg-success"
              role="img"
              aria-label="Connected"
            />
          )}
        </span>
        {device.detail && (
          <span className="truncate font-mono text-[11px] text-ink-soft">{device.detail}</span>
        )}
      </span>

      {device.rssi != null && (
        <span
          className={cx(
            "flex flex-none items-center gap-1 text-[11px] font-semibold tabular-nums",
            bars(device.rssi) >= 3 ? "text-success" : bars(device.rssi) === 2 ? "text-prio-med" : "text-ink-soft",
          )}
          title={`Signal strength ${device.rssi} dBm`}
        >
          <SignalIcon size={14} />
          {device.rssi}
        </span>
      )}

      <span className="flex-none rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.08em] text-ink-soft">
        {label}
      </span>
    </li>
  );
}
