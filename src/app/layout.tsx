import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const ICON =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%230f7b6c%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2249%22%20r%3D%223%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M14%2045%20L40%2019%20a4.2%204.2%200%200%201%206%206%20L20%2051%20L11%2054%20Z%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M37%2022%20l5%205%22%20stroke%3D%22%230f7b6c%22%20stroke-width%3D%222.4%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E";

export const metadata: Metadata = {
  title: "Sketchnotes — draw & jot",
  description: "A fast, offline-first canvas for sketching ideas and jotting notes.",
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
      <body data-theme="dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
