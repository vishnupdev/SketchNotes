import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

// "V" monogram on a teal rounded square.
const ICON =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%230f7b6c%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2234%22%20font-family%3D%22Helvetica%2CArial%2Csans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22700%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22central%22%3EV%3C%2Ftext%3E%3C%2Fsvg%3E";

export const metadata: Metadata = {
  title: "OneApp",
  description: "Every tool in one place — sketch notes and a full PDF editor, 100% offline.",
  icons: { icon: ICON, apple: ICON },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#141a21",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-theme="dark" data-dark="">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
