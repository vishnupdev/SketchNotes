import { APPS, SITE_ALIASES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * JSON-LD structured data injected into the initial HTML. This is how search
 * engines learn the brand identity ("OneApp", alternate name "One App") and
 * that the site is a free web application — improving brand-term ranking and
 * enabling rich results. Rendered server-side in the root layout.
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: SITE_ALIASES,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        alternateName: SITE_ALIASES,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web browser (Any)",
        browserRequirements: "Requires a modern web browser. Works offline as a PWA.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: APPS.map((a) => `${a.name}: ${a.blurb}`),
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        alternateName: SITE_ALIASES,
        url: `${SITE_URL}/`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user data is included.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
