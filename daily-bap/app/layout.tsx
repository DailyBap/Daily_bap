import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/brand";
import { ChatWidget } from "@/components/ChatWidget";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display-var",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Korean Cloud Kitchen, Guwahati`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Korean food Guwahati",
    "Bibimbap Guwahati",
    "Korean cloud kitchen",
    "pre-order Korean food",
    "Daily Bap",
    "Bento box Guwahati",
    "Korean delivery Guwahati",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: `${siteConfig.name} — Authentic Korean Food, Guwahati`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-body antialiased bg-white text-gray-800">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
