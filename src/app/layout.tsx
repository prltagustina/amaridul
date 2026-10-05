import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { BRAND, SITE_URL } from "@/lib/constants";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  weight: ["300"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: BRAND.name,
  description: BRAND.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    url: "/",
    siteName: BRAND.name,
    locale: "es_AR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
