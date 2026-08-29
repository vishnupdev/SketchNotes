"use client";

import { STREET_VIEW_LABEL, streetViewUrl } from "@/lib/Satellite/streetview";
import { StreetViewIcon } from "@/components/SketchNotes/atoms/icons";
import type { LatLon } from "@/lib/Satellite/mercator";

/**
 * The one control in this app that leaves it: a ground-level look at a point,
 * handed to Google Street View.
 *
 * A real `<a target="_blank">` rather than a button that calls `window.open`, so
 * it can be middle-clicked, opened in a background tab, and announced as a link.
 * `rel="noopener noreferrer"` is not decoration: `noopener` denies the opened
 * page a handle on this one, and `noreferrer` keeps this app's URL out of the
 * request — the coordinates in the address are all it needs to know.
 */
export function StreetViewLink({
  point,
  heading,
  label = STREET_VIEW_LABEL,
}: {
  point: LatLon;
  /** Open the panorama facing this way, where the direction is known. */
  heading?: number | null;
  label?: string;
}) {
  return (
    <a
      href={streetViewUrl(point, heading)}
      target="_blank"
      rel="noopener noreferrer"
      className="tint inline-flex flex-none items-center gap-1.5 rounded-full border border-border bg-paper px-3 py-1.5 text-[12px] font-semibold hover:border-accent hover:text-accent"
    >
      <StreetViewIcon size={13} />
      {label}
    </a>
  );
}
