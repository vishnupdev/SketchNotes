import type { ComponentType } from "react";
import type { GlyphKey } from "@/lib/Resources/catalog";
import {
  BellIcon,
  BluetoothIcon,
  CameraIcon,
  ChipIcon,
  ClipboardIcon,
  ClockIcon,
  CookieIcon,
  DriveIcon,
  FontIcon,
  KeyboardIcon,
  LocationIcon,
  LockIcon,
  MicIcon,
  MidiIcon,
  ScreenShareIcon,
  SensorIcon,
  UsbIcon,
  VolumeIcon,
  WindowIcon,
} from "@/components/SketchNotes/atoms/icons";

/**
 * The one place a resource's glyph key becomes a drawn icon.
 *
 * The catalog stays pure data (no JSX in `lib/`), and every surface that lists a
 * resource — the access rows, the app chips, the live cards — draws it the same
 * way by going through here.
 */
const GLYPHS: Record<GlyphKey, ComponentType<{ size?: number }>> = {
  camera: CameraIcon,
  mic: MicIcon,
  screen: ScreenShareIcon,
  speaker: VolumeIcon,
  location: LocationIcon,
  bell: BellIcon,
  clipboard: ClipboardIcon,
  lock: LockIcon,
  idle: ClockIcon,
  window: WindowIcon,
  font: FontIcon,
  sensor: SensorIcon,
  midi: MidiIcon,
  bluetooth: BluetoothIcon,
  usb: UsbIcon,
  hid: KeyboardIcon,
  serial: ChipIcon,
  drive: DriveIcon,
  cookie: CookieIcon,
};

export function ResourceGlyph({ glyph, size = 18 }: { glyph: GlyphKey; size?: number }) {
  const Icon = GLYPHS[glyph];
  return <Icon size={size} />;
}
