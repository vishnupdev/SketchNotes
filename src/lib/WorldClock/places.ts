import { COUNTRIES, COUNTRY_BY_CODE } from "./countries";
import type { Country, PlaceWithCountry, Region, WorldPlace } from "./types";

/**
 * Cities on the clock board, each bound to an IANA time zone.
 *
 * A country can appear more than once: the US, Russia, Australia, Brazil and
 * others span several zones, and a world clock is only useful if you can pin
 * the specific city you care about. The zone strings are what `Intl` is handed
 * directly, so daylight saving is always the browser's current rules rather
 * than a fixed offset we'd have to maintain.
 */
export const WORLD_PLACES: WorldPlace[] = [
  /* Asia */
  { id: "in-new-delhi", city: "New Delhi", country: "IN", zone: "Asia/Kolkata", alt: ["Delhi"] },
  { id: "in-mumbai", city: "Mumbai", country: "IN", zone: "Asia/Kolkata", alt: ["Bombay"] },
  { id: "in-bengaluru", city: "Bengaluru", country: "IN", zone: "Asia/Kolkata", alt: ["Bangalore"] },
  { id: "in-kochi", city: "Kochi", country: "IN", zone: "Asia/Kolkata", alt: ["Cochin", "Kerala"] },
  { id: "jp-tokyo", city: "Tokyo", country: "JP", zone: "Asia/Tokyo" },
  { id: "jp-osaka", city: "Osaka", country: "JP", zone: "Asia/Tokyo" },
  { id: "cn-beijing", city: "Beijing", country: "CN", zone: "Asia/Shanghai", alt: ["Peking"] },
  { id: "cn-shanghai", city: "Shanghai", country: "CN", zone: "Asia/Shanghai" },
  { id: "kr-seoul", city: "Seoul", country: "KR", zone: "Asia/Seoul" },
  { id: "sg-singapore", city: "Singapore", country: "SG", zone: "Asia/Singapore" },
  { id: "ae-dubai", city: "Dubai", country: "AE", zone: "Asia/Dubai" },
  { id: "ae-abu-dhabi", city: "Abu Dhabi", country: "AE", zone: "Asia/Dubai" },
  { id: "sa-riyadh", city: "Riyadh", country: "SA", zone: "Asia/Riyadh" },
  { id: "qa-doha", city: "Doha", country: "QA", zone: "Asia/Qatar" },
  { id: "th-bangkok", city: "Bangkok", country: "TH", zone: "Asia/Bangkok" },
  { id: "id-jakarta", city: "Jakarta", country: "ID", zone: "Asia/Jakarta" },
  { id: "id-denpasar", city: "Denpasar", country: "ID", zone: "Asia/Makassar", alt: ["Bali"] },
  { id: "my-kuala-lumpur", city: "Kuala Lumpur", country: "MY", zone: "Asia/Kuala_Lumpur", alt: ["KL"] },
  { id: "vn-hanoi", city: "Hanoi", country: "VN", zone: "Asia/Ho_Chi_Minh" },
  { id: "vn-ho-chi-minh-city", city: "Ho Chi Minh City", country: "VN", zone: "Asia/Ho_Chi_Minh", alt: ["Saigon"] },
  { id: "ph-manila", city: "Manila", country: "PH", zone: "Asia/Manila" },
  { id: "pk-karachi", city: "Karachi", country: "PK", zone: "Asia/Karachi" },
  { id: "pk-islamabad", city: "Islamabad", country: "PK", zone: "Asia/Karachi" },
  { id: "bd-dhaka", city: "Dhaka", country: "BD", zone: "Asia/Dhaka" },
  { id: "lk-colombo", city: "Colombo", country: "LK", zone: "Asia/Colombo" },
  { id: "np-kathmandu", city: "Kathmandu", country: "NP", zone: "Asia/Kathmandu" },
  { id: "il-jerusalem", city: "Jerusalem", country: "IL", zone: "Asia/Jerusalem" },
  { id: "il-tel-aviv", city: "Tel Aviv", country: "IL", zone: "Asia/Jerusalem" },
  { id: "tr-istanbul", city: "Istanbul", country: "TR", zone: "Europe/Istanbul" },
  { id: "tr-ankara", city: "Ankara", country: "TR", zone: "Europe/Istanbul" },
  { id: "hk-hong-kong", city: "Hong Kong", country: "HK", zone: "Asia/Hong_Kong" },
  { id: "mv-male", city: "Malé", country: "MV", zone: "Indian/Maldives", alt: ["Male"] },
  { id: "kz-almaty", city: "Almaty", country: "KZ", zone: "Asia/Almaty" },
  { id: "kz-astana", city: "Astana", country: "KZ", zone: "Asia/Almaty", alt: ["Nur-Sultan"] },

  /* Europe */
  { id: "gb-london", city: "London", country: "GB", zone: "Europe/London" },
  { id: "gb-edinburgh", city: "Edinburgh", country: "GB", zone: "Europe/London" },
  { id: "ie-dublin", city: "Dublin", country: "IE", zone: "Europe/Dublin" },
  { id: "fr-paris", city: "Paris", country: "FR", zone: "Europe/Paris" },
  { id: "de-berlin", city: "Berlin", country: "DE", zone: "Europe/Berlin" },
  { id: "de-frankfurt", city: "Frankfurt", country: "DE", zone: "Europe/Berlin" },
  { id: "it-rome", city: "Rome", country: "IT", zone: "Europe/Rome", alt: ["Roma"] },
  { id: "it-milan", city: "Milan", country: "IT", zone: "Europe/Rome", alt: ["Milano"] },
  { id: "es-madrid", city: "Madrid", country: "ES", zone: "Europe/Madrid" },
  { id: "es-barcelona", city: "Barcelona", country: "ES", zone: "Europe/Madrid" },
  { id: "es-las-palmas", city: "Las Palmas", country: "ES", zone: "Atlantic/Canary", alt: ["Canary Islands"] },
  { id: "pt-lisbon", city: "Lisbon", country: "PT", zone: "Europe/Lisbon", alt: ["Lisboa"] },
  { id: "nl-amsterdam", city: "Amsterdam", country: "NL", zone: "Europe/Amsterdam" },
  { id: "be-brussels", city: "Brussels", country: "BE", zone: "Europe/Brussels" },
  { id: "ch-zurich", city: "Zurich", country: "CH", zone: "Europe/Zurich", alt: ["Zürich"] },
  { id: "ch-geneva", city: "Geneva", country: "CH", zone: "Europe/Zurich", alt: ["Genève"] },
  { id: "at-vienna", city: "Vienna", country: "AT", zone: "Europe/Vienna", alt: ["Wien"] },
  { id: "se-stockholm", city: "Stockholm", country: "SE", zone: "Europe/Stockholm" },
  { id: "no-oslo", city: "Oslo", country: "NO", zone: "Europe/Oslo" },
  { id: "dk-copenhagen", city: "Copenhagen", country: "DK", zone: "Europe/Copenhagen", alt: ["København"] },
  { id: "fi-helsinki", city: "Helsinki", country: "FI", zone: "Europe/Helsinki" },
  { id: "is-reykjavik", city: "Reykjavík", country: "IS", zone: "Atlantic/Reykjavik", alt: ["Reykjavik"] },
  { id: "pl-warsaw", city: "Warsaw", country: "PL", zone: "Europe/Warsaw", alt: ["Warszawa"] },
  { id: "cz-prague", city: "Prague", country: "CZ", zone: "Europe/Prague", alt: ["Praha"] },
  { id: "hu-budapest", city: "Budapest", country: "HU", zone: "Europe/Budapest" },
  { id: "gr-athens", city: "Athens", country: "GR", zone: "Europe/Athens" },
  { id: "ru-moscow", city: "Moscow", country: "RU", zone: "Europe/Moscow" },
  { id: "ru-yekaterinburg", city: "Yekaterinburg", country: "RU", zone: "Asia/Yekaterinburg" },
  { id: "ru-novosibirsk", city: "Novosibirsk", country: "RU", zone: "Asia/Novosibirsk" },
  { id: "ru-vladivostok", city: "Vladivostok", country: "RU", zone: "Asia/Vladivostok" },
  { id: "ua-kyiv", city: "Kyiv", country: "UA", zone: "Europe/Kyiv", alt: ["Kiev"] },
  { id: "ro-bucharest", city: "Bucharest", country: "RO", zone: "Europe/Bucharest", alt: ["București"] },

  /* Americas */
  { id: "us-new-york", city: "New York", country: "US", zone: "America/New_York", alt: ["NYC", "Eastern"] },
  { id: "us-washington", city: "Washington, D.C.", country: "US", zone: "America/New_York", alt: ["DC"] },
  { id: "us-chicago", city: "Chicago", country: "US", zone: "America/Chicago", alt: ["Central"] },
  { id: "us-denver", city: "Denver", country: "US", zone: "America/Denver", alt: ["Mountain"] },
  { id: "us-phoenix", city: "Phoenix", country: "US", zone: "America/Phoenix" },
  { id: "us-los-angeles", city: "Los Angeles", country: "US", zone: "America/Los_Angeles", alt: ["LA", "Pacific"] },
  { id: "us-san-francisco", city: "San Francisco", country: "US", zone: "America/Los_Angeles", alt: ["SF", "Bay Area"] },
  { id: "us-seattle", city: "Seattle", country: "US", zone: "America/Los_Angeles" },
  { id: "us-anchorage", city: "Anchorage", country: "US", zone: "America/Anchorage", alt: ["Alaska"] },
  { id: "us-honolulu", city: "Honolulu", country: "US", zone: "Pacific/Honolulu", alt: ["Hawaii"] },
  { id: "ca-toronto", city: "Toronto", country: "CA", zone: "America/Toronto" },
  { id: "ca-ottawa", city: "Ottawa", country: "CA", zone: "America/Toronto" },
  { id: "ca-halifax", city: "Halifax", country: "CA", zone: "America/Halifax" },
  { id: "ca-edmonton", city: "Edmonton", country: "CA", zone: "America/Edmonton", alt: ["Calgary"] },
  { id: "ca-vancouver", city: "Vancouver", country: "CA", zone: "America/Vancouver" },
  { id: "mx-mexico-city", city: "Mexico City", country: "MX", zone: "America/Mexico_City", alt: ["CDMX"] },
  { id: "mx-cancun", city: "Cancún", country: "MX", zone: "America/Cancun", alt: ["Cancun"] },
  { id: "mx-tijuana", city: "Tijuana", country: "MX", zone: "America/Tijuana" },
  { id: "br-sao-paulo", city: "São Paulo", country: "BR", zone: "America/Sao_Paulo", alt: ["Sao Paulo"] },
  { id: "br-rio-de-janeiro", city: "Rio de Janeiro", country: "BR", zone: "America/Sao_Paulo", alt: ["Rio"] },
  { id: "br-manaus", city: "Manaus", country: "BR", zone: "America/Manaus" },
  { id: "ar-buenos-aires", city: "Buenos Aires", country: "AR", zone: "America/Argentina/Buenos_Aires" },
  { id: "cl-santiago", city: "Santiago", country: "CL", zone: "America/Santiago" },
  { id: "co-bogota", city: "Bogotá", country: "CO", zone: "America/Bogota", alt: ["Bogota"] },
  { id: "pe-lima", city: "Lima", country: "PE", zone: "America/Lima" },
  { id: "cu-havana", city: "Havana", country: "CU", zone: "America/Havana", alt: ["La Habana"] },
  { id: "jm-kingston", city: "Kingston", country: "JM", zone: "America/Jamaica" },
  { id: "cr-san-jose", city: "San José", country: "CR", zone: "America/Costa_Rica", alt: ["San Jose"] },

  /* Africa */
  { id: "za-johannesburg", city: "Johannesburg", country: "ZA", zone: "Africa/Johannesburg" },
  { id: "za-cape-town", city: "Cape Town", country: "ZA", zone: "Africa/Johannesburg" },
  { id: "eg-cairo", city: "Cairo", country: "EG", zone: "Africa/Cairo" },
  { id: "ng-lagos", city: "Lagos", country: "NG", zone: "Africa/Lagos" },
  { id: "ng-abuja", city: "Abuja", country: "NG", zone: "Africa/Lagos" },
  { id: "ke-nairobi", city: "Nairobi", country: "KE", zone: "Africa/Nairobi" },
  { id: "ma-casablanca", city: "Casablanca", country: "MA", zone: "Africa/Casablanca" },
  { id: "ma-marrakesh", city: "Marrakesh", country: "MA", zone: "Africa/Casablanca", alt: ["Marrakech"] },
  { id: "et-addis-ababa", city: "Addis Ababa", country: "ET", zone: "Africa/Addis_Ababa" },
  { id: "gh-accra", city: "Accra", country: "GH", zone: "Africa/Accra" },
  { id: "tz-dar-es-salaam", city: "Dar es Salaam", country: "TZ", zone: "Africa/Dar_es_Salaam" },
  { id: "tz-zanzibar", city: "Zanzibar", country: "TZ", zone: "Africa/Dar_es_Salaam" },
  { id: "tn-tunis", city: "Tunis", country: "TN", zone: "Africa/Tunis" },

  /* Oceania */
  { id: "au-sydney", city: "Sydney", country: "AU", zone: "Australia/Sydney" },
  { id: "au-melbourne", city: "Melbourne", country: "AU", zone: "Australia/Melbourne" },
  { id: "au-brisbane", city: "Brisbane", country: "AU", zone: "Australia/Brisbane" },
  { id: "au-adelaide", city: "Adelaide", country: "AU", zone: "Australia/Adelaide" },
  { id: "au-darwin", city: "Darwin", country: "AU", zone: "Australia/Darwin" },
  { id: "au-perth", city: "Perth", country: "AU", zone: "Australia/Perth" },
  { id: "nz-auckland", city: "Auckland", country: "NZ", zone: "Pacific/Auckland" },
  { id: "nz-wellington", city: "Wellington", country: "NZ", zone: "Pacific/Auckland" },
  { id: "fj-suva", city: "Suva", country: "FJ", zone: "Pacific/Fiji" },
];

/** Places indexed by id, so a persisted pin list resolves in one pass. */
export const PLACE_BY_ID: Record<string, WorldPlace> = Object.fromEntries(
  WORLD_PLACES.map((p) => [p.id, p]),
);

/**
 * The board a first-time visitor sees: five cities spread right around the
 * clock, so the offsets are immediately legible rather than clustered.
 */
export const DEFAULT_PINS: string[] = [
  "us-new-york",
  "gb-london",
  "ae-dubai",
  "jp-tokyo",
  "au-sydney",
];

/** The country a place belongs to. */
export const countryOf = (place: WorldPlace): Country => COUNTRY_BY_CODE[place.country];

/** Join a place to its country, or null when the id is unknown/stale. */
export function resolvePlace(id: string): PlaceWithCountry | null {
  const place = PLACE_BY_ID[id];
  if (!place) return null;
  const country = COUNTRY_BY_CODE[place.country];
  return country ? { place, country } : null;
}

/** Every city we hold for a country, in catalog order. */
export function placesForCountry(code: string): WorldPlace[] {
  return WORLD_PLACES.filter((p) => p.country === code);
}

/** The first (most representative) city for a country — its clock stand-in. */
export function primaryPlaceFor(code: string): WorldPlace | undefined {
  return WORLD_PLACES.find((p) => p.country === code);
}

/**
 * Best-effort match of an IANA zone to a city we know, used to name the
 * visitor's own zone when it happens to be one of ours.
 */
export function placeForZone(zone: string): WorldPlace | undefined {
  return WORLD_PLACES.find((p) => p.zone === zone);
}

/** Fold accents and case so "Zürich" matches a plain-ASCII "zurich". */
const fold = (s: string): string =>
  s
    .normalize("NFD")
    // Strip the combining diacritical marks NFD just split off.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Pre-folded haystack per place, built once — search runs on every keystroke. */
const SEARCH_INDEX: Array<{ id: string; hay: string; city: string }> = WORLD_PLACES.map((p) => {
  const country = COUNTRY_BY_CODE[p.country];
  return {
    id: p.id,
    city: fold(p.city),
    hay: fold(
      [p.city, ...(p.alt ?? []), country?.name ?? "", country?.capital ?? "", p.country, p.zone]
        .join(" ")
        .replace(/[_/]/g, " "),
    ),
  };
});

/**
 * Find cities matching a free-text query across city name, former names,
 * country, capital, ISO code and time zone — so "bombay", "IN", "kerala" and
 * "asia/kolkata" all lead somewhere sensible.
 *
 * Results lead with cities whose own name starts with the query, which is what
 * someone typing "lon" is nearly always after.
 */
export function searchPlaces(query: string, limit = 24): PlaceWithCountry[] {
  const q = fold(query.trim());
  if (!q) return [];

  const starts: string[] = [];
  const contains: string[] = [];
  for (const entry of SEARCH_INDEX) {
    if (entry.city.startsWith(q)) starts.push(entry.id);
    else if (entry.hay.includes(q)) contains.push(entry.id);
    if (starts.length >= limit) break;
  }

  return [...starts, ...contains]
    .slice(0, limit)
    .map(resolvePlace)
    .filter((r): r is PlaceWithCountry => r !== null);
}

/** Countries grouped by continent, each sorted by name — for the browse list. */
export function countriesByRegion(): Array<{ region: Region; countries: Country[] }> {
  const order: Region[] = ["Africa", "Americas", "Asia", "Europe", "Oceania"];
  return order.map((region) => ({
    region,
    countries: COUNTRIES.filter((c) => c.region === region).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));
}
