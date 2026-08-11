/** Continental grouping used to filter the place picker. */
export type Region = "Africa" | "Americas" | "Asia" | "Europe" | "Oceania";

/** Which side of the road a country drives on. */
export type DrivingSide = "left" | "right";

/**
 * A country profile. Everything here is bundled rather than fetched: the facts
 * are slow-moving, and shipping them means the clock, the country details and
 * the specialities all work with no connection — only the headlines need one.
 *
 * Population and area are approximate reference figures (see
 * {@link POPULATION_YEAR}); they're presented as such in the UI.
 */
export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "JP". Also the id used across the app. */
  code: string;
  name: string;
  capital: string;
  region: Region;
  /** Finer-grained placement, e.g. "Eastern Asia". */
  subregion: string;
  currency: string;
  /** ISO 4217 code, e.g. "JPY". */
  currencyCode: string;
  currencySymbol: string;
  /** Official / most widely spoken languages, most prominent first. */
  languages: string[];
  /** International dialling prefix, e.g. "+81". */
  dialCode: string;
  /** Approximate population. */
  population: number;
  /** Total area in km². */
  area: number;
  driving: DrivingSide;
  /** Country-code top-level domain, e.g. ".jp". */
  tld: string;
  /**
   * Google News query string for this country's edition. Defaults to the
   * English edition for the country (see `countryNewsQuery`); set only where a
   * different locale returns a fuller feed.
   */
  newsQuery?: string;
  /**
   * Search term used when this country has no usable English news edition and
   * headlines are found by searching for it instead. Defaults to `name`; set
   * where the endonym we display isn't what English coverage calls it.
   */
  newsSearch?: string;
  /** Two or three sentences of orientation — geography, character, standing. */
  about: string;
  /** What the country is known for: short noun phrases, shown as chips. */
  known: string[];
}

/** A city on the clock board. Several may map to one country (e.g. the US). */
export interface WorldPlace {
  /** Stable id used in the pinned list and the URL, e.g. "jp-tokyo". */
  id: string;
  city: string;
  /** ISO 3166-1 alpha-2 code of the country this city belongs to. */
  country: string;
  /** IANA time zone, e.g. "Asia/Tokyo". */
  zone: string;
  /** Extra search terms — former names, abbreviations, local spellings. */
  alt?: string[];
}

/** A country profile joined to one of its cities, as the UI consumes it. */
export interface PlaceWithCountry {
  place: WorldPlace;
  country: Country;
}
