/**
 * Turning the catalogue's stored values into the strings the UI draws.
 *
 * Kept apart from the components for the usual reason — the same release date
 * is drawn on a list row, a sheet header and a saved item, and three
 * independent `toLocaleDateString` calls is three chances for them to disagree
 * — and tested directly, because date and currency formatting is exactly the
 * kind of code that looks obviously correct and is off by one month.
 */

/**
 * `YYYY-MM` as a reader would say it: "September 2025".
 *
 * Parsed by hand rather than through `new Date("2025-09")`. That string is
 * parsed as **UTC midnight** on the 1st, so anyone west of Greenwich renders it
 * as the previous month — a whole timezone's worth of users seeing every
 * release date shifted by one. Building the date from its parts in local time
 * removes the question entirely.
 */
export function releaseLabel(released: string): string {
  const [year, month] = released.split("-").map(Number);
  if (!year || !month) return released;

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Just the year, for the compact list rows where the month is noise. */
export const releaseYear = (released: string): string => released.slice(0, 4);

/**
 * How long ago, in the coarsest unit that is still true.
 *
 * "This month" rather than "0 months ago", and years once past twelve months,
 * because the point of the line is to say whether a product is current — and
 * "23 months ago" makes a reader do arithmetic to learn "nearly two years".
 */
export function ageLabel(released: string, now = new Date()): string {
  const [year, month] = released.split("-").map(Number);
  if (!year || !month) return "";

  const months = (now.getFullYear() - year) * 12 + (now.getMonth() - (month - 1));

  if (months < 0) return "Not yet released";
  if (months === 0) return "This month";
  if (months === 1) return "Last month";
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 1 && rest === 0) return "1 year ago";
  if (rest === 0) return `${years} years ago`;
  return `${years} yr ${rest} mo ago`;
}

/**
 * A launch price in US dollars.
 *
 * Always "from", never a bare figure: every product here is sold in several
 * configurations and the stored number is the cheapest of them, so a bare
 * "$1,299" would be a claim the catalogue cannot support. Null is a real
 * answer — a chip sold only inside a finished machine has no list price, and
 * saying so is better than showing nothing.
 */
export function priceLabel(priceUsd: number | null): string {
  if (priceUsd === null) return "No list price";
  return `From ${priceUsd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })}`;
}

/** The host of a source URL, for a link that shows where it actually goes. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** `YYYY-MM-DD` as a reader would say it — used for the catalogue's review date. */
export function reviewedLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
