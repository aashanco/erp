import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "../components/PWARegister";

export const metadata: Metadata = {
  title: "Aashan & Co LLC",
  description: "Aashan & Co LLC ERP mobile app for quotes, invoices, receipts, jobs, reports, and field service.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Aashan & Co LLC",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#083344",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Aashan & Co LLC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aashan & Co LLC" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#083344" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}<PWARegister /></body>
    </html>
  );
}
