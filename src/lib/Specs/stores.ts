/**
 * Where to go and buy the thing, and what to read before you do.
 *
 * ## Why there are no prices in this file
 *
 * This app shows **links to stores, not prices**, and that is a deliberate
 * refusal rather than an unfinished feature.
 *
 * No retailer publishes live prices without a credential. Amazon's Product
 * Advertising API needs an affiliate account with qualifying sales behind it;
 * eBay, Best Buy, Walmart and Flipkart all need registered developer keys;
 * Google's Shopping data needs a Merchant Center account. The only keyless way
 * to get a number is to scrape the storefront, which breaks within days (they
 * block datacenter addresses and render prices in JavaScript), violates the
 * terms of every site listed here, and — the part that actually matters —
 * produces a number this app cannot stand behind.
 *
 * A wrong price is worse than no price. Someone deciding on a ₹70,000 purchase
 * from a figure that is a week stale, the wrong variant, or a marketplace
 * seller's inflated listing has been actively misled by a feature that looked
 * helpful. So the panel sends you to the store and lets the store quote itself,
 * which is always current and always right — and it says in as many words why
 * it works that way, so "no prices here" reads as a decision rather than a bug.
 *
 * The one price the app *does* state is the launch price, because that comes
 * off the spec sheet with a date attached (`price` in the infobox) and is a
 * historical fact rather than a live claim.
 *
 * ## The shape of a store
 *
 * Each entry is a URL template over a search term. Deep-linking to a *search
 * result* rather than a product page is the only approach that cannot rot:
 * product-page identifiers (ASINs, Flipkart's `pid`) differ per store, per
 * region and per variant, and there is no keyless way to resolve one. A search
 * link for "Samsung Galaxy S24" lands on the right page at every store on this
 * list, today and in five years.
 */

/** A country whose shops are worth listing, with the currency they quote in. */
export interface Region {
  /** ISO 3166-1 alpha-2, lower-cased — also the persisted value. */
  id: string;
  name: string;
  /** Flag emoji, for the chooser. */
  flag: string;
  /** Amazon's domain for this country, where it has one. */
  amazon?: string;
  /** eBay's domain, where it has a local one. */
  ebay?: string;
  /** Shops specific to this country, in the order they are worth trying. */
  local: StoreTemplate[];
}

/** One shop, as a pair of URL builders over a search term. */
export interface StoreTemplate {
  id: string;
  name: string;
  /** What the shop is, in three or four words. */
  note: string;
  /** Search results for a product name. */
  search: (query: string) => string;
  /**
   * Where that shop's customer reviews live. Usually the same search — reviews
   * sit on the product page a search leads to — but a few sites have a review
   * surface of their own worth going to directly.
   */
  reviews?: (query: string) => string;
}

const q = (term: string): string => encodeURIComponent(term.trim());

/** Amazon, parameterised by domain — the one shop on nearly every list. */
const amazon = (domain: string): StoreTemplate => ({
  id: `amazon-${domain}`,
  name: `Amazon`,
  note: domain,
  search: (term) => `https://www.${domain}/s?k=${q(term)}`,
});

const ebay = (domain: string): StoreTemplate => ({
  id: `ebay-${domain}`,
  name: "eBay",
  note: `${domain} · new and used`,
  search: (term) => `https://www.${domain}/sch/i.html?_nkw=${q(term)}`,
});

/**
 * Shops available in every region, after the local ones.
 *
 * Google Shopping earns its place by being the closest thing to the comparison
 * this panel cannot do itself: it lists many sellers' prices for one product on
 * one page. It is a link rather than a data source for exactly the reason at the
 * top of this file — the underlying feed needs a Merchant Center account.
 */
const WORLDWIDE: StoreTemplate[] = [
  {
    id: "google-shopping",
    name: "Google Shopping",
    note: "many sellers, one page",
    search: (term) => `https://www.google.com/search?tbm=shop&q=${q(term)}`,
  },
  {
    id: "pricerunner",
    name: "PriceRunner",
    note: "price history across shops",
    search: (term) => `https://www.pricerunner.com/search?q=${q(term)}`,
  },
];

/**
 * Review surfaces that are not shops.
 *
 * Kept apart from the store list because they answer a different question:
 * a shop's reviews are from people who bought it there, and these are from
 * people testing it for a living. Both are worth reading and neither replaces
 * the other.
 */
export const REVIEW_SITES: StoreTemplate[] = [
  {
    id: "trustpilot",
    name: "Trustpilot",
    note: "buyers on the seller",
    search: (term) => `https://www.trustpilot.com/search?query=${q(term)}`,
  },
  {
    id: "reddit",
    name: "Reddit",
    note: "owners, months later",
    search: (term) => `https://www.reddit.com/search/?q=${q(`${term} review`)}`,
  },
  {
    id: "youtube",
    name: "YouTube",
    note: "hands-on video reviews",
    search: (term) => `https://www.youtube.com/results?search_query=${q(`${term} review`)}`,
  },
];

/**
 * The regions offered, alphabetically after the first.
 *
 * India leads because it is this workspace's home market, not because the list
 * is India-shaped — every region below carries its own real retailers, and the
 * chooser is one tap.
 */
export const REGIONS: Region[] = [
  {
    id: "in",
    name: "India",
    flag: "🇮🇳",
    amazon: "amazon.in",
    ebay: "ebay.com",
    local: [
      {
        id: "flipkart",
        name: "Flipkart",
        note: "flipkart.com",
        search: (term) => `https://www.flipkart.com/search?q=${q(term)}`,
      },
      {
        id: "croma",
        name: "Croma",
        note: "electronics chain",
        search: (term) => `https://www.croma.com/searchB?q=${q(term)}`,
      },
      {
        id: "reliance-digital",
        name: "Reliance Digital",
        note: "electronics chain",
        search: (term) => `https://www.reliancedigital.in/search?q=${q(term)}`,
      },
      {
        id: "vijay-sales",
        name: "Vijay Sales",
        note: "electronics chain",
        search: (term) => `https://www.vijaysales.com/search/${q(term)}`,
      },
    ],
  },
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    amazon: "amazon.com",
    ebay: "ebay.com",
    local: [
      {
        id: "bestbuy",
        name: "Best Buy",
        note: "electronics chain",
        search: (term) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q(term)}`,
      },
      {
        id: "walmart",
        name: "Walmart",
        note: "walmart.com",
        search: (term) => `https://www.walmart.com/search?q=${q(term)}`,
      },
      {
        id: "bhphoto",
        name: "B&H",
        note: "cameras and computing",
        search: (term) => `https://www.bhphotovideo.com/c/search?q=${q(term)}`,
      },
      {
        id: "newegg",
        name: "Newegg",
        note: "components and PCs",
        search: (term) => `https://www.newegg.com/p/pl?d=${q(term)}`,
      },
    ],
  },
  {
    id: "gb",
    name: "United Kingdom",
    flag: "🇬🇧",
    amazon: "amazon.co.uk",
    ebay: "ebay.co.uk",
    local: [
      {
        id: "currys",
        name: "Currys",
        note: "electronics chain",
        search: (term) => `https://www.currys.co.uk/search?q=${q(term)}`,
      },
      {
        id: "argos",
        name: "Argos",
        note: "argos.co.uk",
        search: (term) => `https://www.argos.co.uk/search/${q(term)}/`,
      },
      {
        id: "johnlewis",
        name: "John Lewis",
        note: "longer warranties",
        search: (term) => `https://www.johnlewis.com/search?search-term=${q(term)}`,
      },
    ],
  },
  {
    id: "de",
    name: "Germany",
    flag: "🇩🇪",
    amazon: "amazon.de",
    ebay: "ebay.de",
    local: [
      {
        id: "mediamarkt",
        name: "MediaMarkt",
        note: "electronics chain",
        search: (term) => `https://www.mediamarkt.de/de/search.html?query=${q(term)}`,
      },
      {
        id: "saturn",
        name: "Saturn",
        note: "electronics chain",
        search: (term) => `https://www.saturn.de/de/search.html?query=${q(term)}`,
      },
      {
        id: "idealo",
        name: "idealo",
        note: "German price comparison",
        search: (term) => `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${q(term)}`,
      },
    ],
  },
  {
    id: "fr",
    name: "France",
    flag: "🇫🇷",
    amazon: "amazon.fr",
    ebay: "ebay.fr",
    local: [
      {
        id: "fnac",
        name: "Fnac",
        note: "fnac.com",
        search: (term) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q(term)}`,
      },
      {
        id: "darty",
        name: "Darty",
        note: "electronics chain",
        search: (term) => `https://www.darty.com/nav/recherche?text=${q(term)}`,
      },
      {
        id: "cdiscount",
        name: "Cdiscount",
        note: "cdiscount.com",
        search: (term) => `https://www.cdiscount.com/search/10/${q(term)}.html`,
      },
    ],
  },
  {
    id: "ca",
    name: "Canada",
    flag: "🇨🇦",
    amazon: "amazon.ca",
    ebay: "ebay.ca",
    local: [
      {
        id: "bestbuy-ca",
        name: "Best Buy",
        note: "bestbuy.ca",
        search: (term) => `https://www.bestbuy.ca/en-ca/search?search=${q(term)}`,
      },
      {
        id: "canadacomputers",
        name: "Canada Computers",
        note: "components and PCs",
        search: (term) => `https://www.canadacomputers.com/en/search?s=${q(term)}`,
      },
    ],
  },
  {
    id: "au",
    name: "Australia",
    flag: "🇦🇺",
    amazon: "amazon.com.au",
    ebay: "ebay.com.au",
    local: [
      {
        id: "jbhifi",
        name: "JB Hi-Fi",
        note: "electronics chain",
        search: (term) => `https://www.jbhifi.com.au/pages/search-results?query=${q(term)}`,
      },
      {
        id: "harveynorman",
        name: "Harvey Norman",
        note: "electronics chain",
        search: (term) => `https://www.harveynorman.com.au/catalogsearch/result/?q=${q(term)}`,
      },
    ],
  },
  {
    id: "jp",
    name: "Japan",
    flag: "🇯🇵",
    amazon: "amazon.co.jp",
    local: [
      {
        id: "kakaku",
        name: "Kakaku.com",
        note: "Japan's price comparison",
        search: (term) => `https://kakaku.com/search_results/${q(term)}/`,
      },
      {
        id: "rakuten",
        name: "Rakuten",
        note: "rakuten.co.jp",
        search: (term) => `https://search.rakuten.co.jp/search/mall/${q(term)}/`,
      },
      {
        id: "yodobashi",
        name: "Yodobashi",
        note: "electronics chain",
        search: (term) => `https://www.yodobashi.com/?word=${q(term)}`,
      },
    ],
  },
  {
    id: "ae",
    name: "UAE",
    flag: "🇦🇪",
    amazon: "amazon.ae",
    local: [
      {
        id: "noon",
        name: "noon",
        note: "noon.com",
        search: (term) => `https://www.noon.com/uae-en/search?q=${q(term)}`,
      },
      {
        id: "sharafdg",
        name: "Sharaf DG",
        note: "electronics chain",
        search: (term) => `https://uae.sharafdg.com/?s=${q(term)}`,
      },
    ],
  },
  {
    id: "sg",
    name: "Singapore",
    flag: "🇸🇬",
    amazon: "amazon.sg",
    ebay: "ebay.com",
    local: [
      {
        id: "lazada",
        name: "Lazada",
        note: "lazada.sg",
        search: (term) => `https://www.lazada.sg/catalog/?q=${q(term)}`,
      },
      {
        id: "shopee",
        name: "Shopee",
        note: "shopee.sg",
        search: (term) => `https://shopee.sg/search?keyword=${q(term)}`,
      },
      {
        id: "courts",
        name: "Courts",
        note: "electronics chain",
        search: (term) => `https://www.courts.com.sg/catalogsearch/result/?q=${q(term)}`,
      },
    ],
  },
  {
    id: "br",
    name: "Brazil",
    flag: "🇧🇷",
    amazon: "amazon.com.br",
    local: [
      {
        id: "mercadolivre",
        name: "Mercado Livre",
        note: "mercadolivre.com.br",
        search: (term) => `https://lista.mercadolivre.com.br/${q(term)}`,
      },
      {
        id: "magazineluiza",
        name: "Magazine Luiza",
        note: "magazineluiza.com.br",
        search: (term) => `https://www.magazineluiza.com.br/busca/${q(term)}/`,
      },
    ],
  },
  {
    id: "za",
    name: "South Africa",
    flag: "🇿🇦",
    local: [
      {
        id: "takealot",
        name: "Takealot",
        note: "takealot.com",
        search: (term) => `https://www.takealot.com/all?qsearch=${q(term)}`,
      },
      {
        id: "makro",
        name: "Makro",
        note: "makro.co.za",
        search: (term) => `https://www.makro.co.za/search/?text=${q(term)}`,
      },
    ],
  },
];

/** The region this app opens on when nothing has been chosen. */
export const DEFAULT_REGION = "in";

/** A region by id, falling back to the default rather than to nothing. */
export const regionById = (id: string): Region =>
  REGIONS.find((r) => r.id === id) ?? REGIONS.find((r) => r.id === DEFAULT_REGION) ?? REGIONS[0];

/**
 * The shops to list for one region, in the order they are worth trying:
 * Amazon and eBay where that country has them, then the country's own
 * retailers, then the worldwide comparison sites.
 */
export function storesFor(region: Region): StoreTemplate[] {
  return [
    ...(region.amazon ? [amazon(region.amazon)] : []),
    ...region.local,
    ...(region.ebay ? [ebay(region.ebay)] : []),
    ...WORLDWIDE,
  ];
}

/**
 * The search term a store link is built from.
 *
 * The maker's name is prepended when the product's own name does not already
 * contain it, because a bare "Model 3" or "Classic 350" is ambiguous in a shop's
 * search box in a way it never is in an encyclopedia. Anything in brackets goes:
 * an article disambiguator like "(Apple silicon)" is not something a retailer
 * has ever heard of.
 */
export function storeQuery(name: string, maker: string | null): string {
  const product = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!maker) return product;

  // The maker as a shopper would type it: the first word or two, without the
  // legal suffix an encyclopedia keeps ("Tesla, Inc." → "Tesla").
  const brand = maker
    .split(/[·,(]/)[0]
    .replace(/\b(?:Inc|Ltd|LLC|GmbH|Co|Corp|Corporation|Company|Electronics|Motors|Group)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!brand) return product;
  return product.toLowerCase().includes(brand.toLowerCase()) ? product : `${brand} ${product}`;
}
