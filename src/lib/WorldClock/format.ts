import type { Country } from "./types";

/**
 * Presentation helpers for country facts. These exist so a figure is written
 * the same way everywhere it appears — a population that reads "1.44 billion"
 * on a card and "1441000000" in a detail row would look like two facts.
 */

/** Compact population: "1.44 billion", "129 million", "930 thousand". */
export function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} billion`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} million`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} thousand`;
  return String(n);
}

/** Area with thousands separators and a unit, e.g. "3,287,263 km²". */
export function formatArea(km2: number): string {
  return `${km2.toLocaleString("en-US")} km²`;
}

/** People per km², rounded — a quick read on how crowded a place is. */
export function populationDensity(country: Country): string {
  return `${Math.round(country.population / country.area).toLocaleString("en-US")} / km²`;
}

/** "Left-hand side" / "Right-hand side", spelled out for the details grid. */
export function drivingLabel(country: Country): string {
  return country.driving === "left" ? "Left-hand side" : "Right-hand side";
}

/** Languages as a readable sentence fragment: "Hindi, English and 4 more". */
export function languageSummary(languages: string[], max = 3): string {
  if (languages.length <= max) {
    if (languages.length <= 1) return languages[0] ?? "—";
    return `${languages.slice(0, -1).join(", ")} and ${languages[languages.length - 1]}`;
  }
  return `${languages.slice(0, max).join(", ")} and ${languages.length - max} more`;
}
