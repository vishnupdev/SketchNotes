import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { StructuredData } from "@/components/StructuredData";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = SITE_NAME;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  manifest: "/manifest.webmanifest",
  // Reference the real /icon.svg file, not a data: URI — Chrome/Edge only
  // render SVG favicons served from a URL, never from an inline data URI.
  icons: {
    icon: [{ url: "/icon.svg?v=2", type: "image/svg+xml" }],
    apple: "/icon.svg?v=2",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: SITE_NAME },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom is left enabled: disabling it (user-scalable=no / maximum-scale=1)
  // fails Lighthouse's accessibility "users can zoom and scale" audit.
  viewportFit: "cover",
  themeColor: "#141a21",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-theme="dark" data-dark="">
        <StructuredData />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
