import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Excel Cabs — Private Shuttle Bus Service",
    template: "%s · Excel Cabs",
  },
  description: "Book seats on Excel Cabs private shuttle buses.",
};

export const viewport: Viewport = {
  themeColor: "#0f2b8c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={GeistSans.variable}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
