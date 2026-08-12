import { cx } from "@/lib/utils";
import type { NearbySupport } from "@/lib/nearby/discovery";
import { CheckIcon, CloseIcon } from "@/components/SketchNotes/atoms/icons";

/** Every discovery route, what it finds, and the key into {@link NearbySupport}. */
const ROUTES: { key: keyof NearbySupport; api: string; finds: string }[] = [
  { key: "bluetooth", api: "Web Bluetooth", finds: "Bluetooth LE devices and their GATT services" },
  { key: "leScan", api: "BLE advertisement scan", finds: "anything broadcasting nearby, without pairing" },
  { key: "usb", api: "WebUSB", finds: "USB devices, down to interfaces and endpoints" },
  { key: "hid", api: "WebHID", finds: "keyboards, mice, controllers and their report layouts" },
  { key: "serial", api: "Web Serial", finds: "serial and USB-serial ports" },
  { key: "media", api: "Media Devices", finds: "microphones, speakers and cameras" },
  { key: "gamepad", api: "Gamepad", finds: "game controllers and their live input" },
  { key: "cast", api: "Presentation", finds: "cast-capable screens on this network" },
];

/**
 * Which discovery routes this browser actually offers.
 *
 * Worth showing rather than hiding: the reason a device is missing from the list
 * is usually that the browser has no API to find it, and that is a fact about
 * the browser rather than about the room.
 */
export function ApiMatrix({
  support,
  mediaConstraints,
}: {
  support: NearbySupport;
  mediaConstraints: number;
}) {
  const available = ROUTES.filter((r) => support[r.key]).length;

  return (
    <section className="rounded-2xl border border-border bg-panel p-4">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-bold tracking-tight">What this browser can discover</h3>
        <span className="font-mono text-[11px] font-semibold text-ink-soft">
          {available} of {ROUTES.length} APIs
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-1.5 min-[740px]:grid-cols-2">
        {ROUTES.map((route) => {
          const on = support[route.key];
          return (
            <li
              key={route.key}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-paper px-2.5 py-2"
            >
              <span
                className={cx(
                  "mt-px grid size-5 flex-none place-items-center rounded-md",
                  on ? "bg-success/15 text-success" : "bg-border text-ink-soft",
                )}
              >
                {on ? <CheckIcon size={13} /> : <CloseIcon size={13} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] font-semibold">{route.api}</span>
                <span className="text-[11px] leading-snug text-ink-soft">
                  {on ? `Finds ${route.finds}.` : "Not available in this browser."}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {mediaConstraints > 0 && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft">
          This browser reports {mediaConstraints} media-track constraints, so cameras and
          microphones can list their own resolutions, frame rates and sample rates once you grant
          access.
        </p>
      )}
    </section>
  );
}
