import type { Metadata } from "next";
import { Jost } from "next/font/google";
import { BRAND, SHARE_DESCRIPTION, SHARE_IMAGE, SITE_URL } from "@/lib/constants";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  weight: ["300", "500"],
  subsets: ["latin"],
  display: "swap",
});

const title = `${BRAND.name} | ${BRAND.tagline}`;
const description = SHARE_DESCRIPTION;
const ogImage = SHARE_IMAGE;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/`,
    siteName: BRAND.name,
    locale: "es_AR",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
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
      data-scroll-behavior="smooth"
      className={`${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
