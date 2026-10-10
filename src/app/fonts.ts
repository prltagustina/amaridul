import { Cormorant_Garamond } from "next/font/google";

// Editorial serif for titles and public CTAs only (matches the wordmark's letterforms).
// Applied per layout so the home page does not preload it.
export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500"],
  subsets: ["latin"],
  display: "swap",
});
