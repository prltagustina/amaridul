import { Cormorant_Garamond, Inter, Inter_Tight } from "next/font/google";

// Type system for the new views (applied per layout so the home page keeps Jost and does not preload these).
// Cormorant: brand phrases and page titles. Inter Tight: functional titles, figures and CTAs. Inter: text and data.
export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500"],
  subsets: ["latin"],
  display: "swap",
});

export const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

/** Font variables plus the scoped `tipo-sistema` class that switches the text face. */
export const systemType = `${cormorant.variable} ${interTight.variable} ${inter.variable} tipo-sistema`;
