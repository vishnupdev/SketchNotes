/**
 * The makers whose products this app lists.
 *
 * A flat table rather than a string on each product, for the reason every
 * normalised table exists: "LG" and "LG Electronics" written into forty product
 * records is forty chances to disagree with itself, and the Brands tab groups
 * by exactly this id. The country is here because it costs nothing and a brand
 * row with nothing under the name reads like a placeholder.
 *
 * Only brands that actually have products in `products/` belong here —
 * {@link brandsWithProducts} derives the tab's list from the catalogue rather
 * than from this table, so a brand listed here with nothing under it can never
 * render as an empty group.
 */

import type { Brand } from "./types";

export const BRANDS: Brand[] = [
  { id: "apple", name: "Apple", country: "United States" },
  { id: "samsung", name: "Samsung", country: "South Korea" },
  { id: "google", name: "Google", country: "United States" },
  { id: "lg", name: "LG", country: "South Korea" },
  { id: "sony", name: "Sony", country: "Japan" },
  { id: "nvidia", name: "Nvidia", country: "United States" },
  { id: "amd", name: "AMD", country: "United States" },
  { id: "intel", name: "Intel", country: "United States" },
  { id: "qualcomm", name: "Qualcomm", country: "United States" },
  { id: "dell", name: "Dell", country: "United States" },
  { id: "hp", name: "HP", country: "United States" },
  { id: "lenovo", name: "Lenovo", country: "China" },
  { id: "asus", name: "Asus", country: "Taiwan" },
  { id: "acer", name: "Acer", country: "Taiwan" },
  { id: "msi", name: "MSI", country: "Taiwan" },
  { id: "razer", name: "Razer", country: "Singapore" },
  { id: "framework", name: "Framework", country: "United States" },
  { id: "microsoft", name: "Microsoft", country: "United States" },
  { id: "oneplus", name: "OnePlus", country: "China" },
  { id: "xiaomi", name: "Xiaomi", country: "China" },
  { id: "nothing", name: "Nothing", country: "United Kingdom" },
  { id: "motorola", name: "Motorola", country: "United States" },
  { id: "tcl", name: "TCL", country: "China" },
  { id: "hisense", name: "Hisense", country: "China" },
  { id: "panasonic", name: "Panasonic", country: "Japan" },
  { id: "benq", name: "BenQ", country: "Taiwan" },
  { id: "nintendo", name: "Nintendo", country: "Japan" },
  { id: "valve", name: "Valve", country: "United States" },
  { id: "bose", name: "Bose", country: "United States" },
  { id: "sennheiser", name: "Sennheiser", country: "Germany" },
  { id: "garmin", name: "Garmin", country: "Switzerland" },
  { id: "canon", name: "Canon", country: "Japan" },
  { id: "nikon", name: "Nikon", country: "Japan" },
  { id: "fujifilm", name: "Fujifilm", country: "Japan" },
];

const BY_ID = new Map(BRANDS.map((b) => [b.id, b]));

/**
 * A brand by id.
 *
 * Falls back to a brand built from the id rather than to `undefined`, so a
 * product referring to a brand that is not in the table above renders under its
 * own name instead of crashing a list. That is a real possibility — the two
 * files are edited separately — and losing one row's country is a much smaller
 * failure than losing the tab.
 */
export const brandById = (id: string): Brand =>
  BY_ID.get(id) ?? { id, name: id.charAt(0).toUpperCase() + id.slice(1), country: "" };
