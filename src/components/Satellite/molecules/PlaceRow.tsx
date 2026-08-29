"use client";

import type { ReactNode } from "react";
import type { Place } from "@/lib/Satellite/geocode";
import { formatDecimal } from "@/lib/Satellite/mercator";

/**
 * One place, in a list of them — a search result or a saved one.
 *
 * The whole row is the button that flies the map there, because that is the only
 * thing anyone wants from a row of search results; the trailing control is
 * whatever the list needs on top (keep it, or forget it) and stays out of the
 * main hit area so a thumb aiming for the row never lands on it.
 */
export function PlaceRow({
  place,
  onOpen,
  action,
  distance,
}: {
  place: Place;
  onOpen: () => void;
  /** Trailing control — a save or remove button. */
  action?: ReactNode;
  /** How far it is from here, when the device's position is known. */
  distance?: string;
}) {
  return (
    <li className="flex items-center gap-1 border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className="tint min-w-0 flex-1 rounded-[10px] px-2 py-2.5 text-left hover:text-accent"
      >
        <span className="block truncate text-[13.5px] font-semibold">{place.name}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{place.detail}</span>
        <span className="mt-0.5 block font-mono text-[10px] text-ink-soft">
          {formatDecimal(place, 4)}
          {distance ? ` · ${distance} away` : ""}
        </span>
      </button>
      {action}
    </li>
  );
}
