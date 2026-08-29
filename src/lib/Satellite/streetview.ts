/**
 * Ground-level view of a point, handed off to Google Street View.
 *
 * This is a link, not an embed, and that is a deliberate trade rather than a
 * shortcut. The workspace uses no API keys anywhere, and every keyless source of
 * street-level imagery was measured before this was written: KartaView, the open
 * one, returns nothing within five kilometres of Kochi, Trivandrum, Bengaluru,
 * Delhi, Mumbai, Berlin or New York, and only decade-old shots in Paris and
 * London. An in-app viewer built on it would answer "no imagery here" almost
 * everywhere, which is a worse feature than no feature. Mapillary has the
 * coverage but requires a client token.
 *
 * So the app does the part it can do honestly — pinpoint the spot, on imagery,
 * with coordinates — and hands the panorama to the service that actually has
 * one. The URL below is Google's documented Maps URLs API: no key, no SDK, no
 * script, and nothing about this page is sent along beyond the coordinates in
 * the address.
 */

import { wrapLon, type LatLon } from "./mercator";

/**
 * Address of Google Street View's panorama nearest a position.
 *
 * `map_action=pano` with a `viewpoint` asks for the closest panorama rather than
 * a specific one, which is the only form that can be built from coordinates
 * alone. Six decimal places is about 10cm — more than the imagery can resolve,
 * and enough that the pin and the panorama agree.
 */
export function streetViewUrl(point: LatLon, heading?: number | null): string {
  const params = new URLSearchParams({
    api: "1",
    map_action: "pano",
    viewpoint: `${point.lat.toFixed(6)},${wrapLon(point.lon).toFixed(6)}`,
  });
  // Where the device knows which way it is facing, open the panorama looking the
  // same way — so what is on screen matches what is in front of you.
  if (heading != null && Number.isFinite(heading)) {
    params.set("heading", String(Math.round(((heading % 360) + 360) % 360)));
  }
  return `https://www.google.com/maps/@?${params.toString()}`;
}

/** Copy for the link, kept in one place so every entry point says the same thing. */
export const STREET_VIEW_LABEL = "Street View";

export const STREET_VIEW_NOTE =
  "Opens Google Street View at this point in a new tab. Only the coordinates go with the link — no imagery service is contacted from this page.";
