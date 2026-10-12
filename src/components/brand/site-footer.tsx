import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { BrandButterfly } from "./headers";

/**
 * Site footer. "forest": the green gradient of the member and joining views.
 * "neutral": soft sand, for pages that already carry a lot of green (home, /qr).
 */
export function SiteFooter({ wide = false, tone = "forest" }: { wide?: boolean; tone?: "forest" | "neutral" }) {
  const column = wide ? "admin-column" : "nav-column";
  const neutral = tone === "neutral";
  const link = neutral ? "!text-arena-700 hover:!text-forest" : "!text-white/85 hover:!text-white";
  return (
    <footer
      className={
        neutral
          ? "page-gutter border-t border-arena-200 bg-arena-50 py-10 text-foreground"
          : "page-gutter border-t border-white/10 bg-[linear-gradient(118deg,var(--hoja-900)_0%,var(--hoja-800)_50%,var(--hoja-700)_100%)] py-10 text-white"
      }
    >
      <div className={`${column} flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left`}>
        <div className="space-y-2">
          <span className="flex items-center justify-center gap-2 sm:justify-start">
            <BrandButterfly onPhoto={!neutral} className="!h-8" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src={neutral ? "/brand/wordmark-bold.svg" : "/brand/wordmark-bold-cream.svg"} alt={BRAND.name} className="!h-6 !w-auto" />
          </span>
          <p className={`text-xs tracking-[0.2em] uppercase ${neutral ? "text-arena-700" : "text-white/75"}`}>Asociación civil</p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap justify-center gap-x-6 text-sm">
          <Link href="/" className={`inline-flex min-h-11 items-center ${link}`}>
            Sitio institucional
          </Link>
          <Link href="/qr#preguntas" className={`inline-flex min-h-11 items-center ${link}`}>
            Preguntas frecuentes
          </Link>
          <Link href="/qr/login" className={`inline-flex min-h-11 items-center ${link}`}>
            Acceso socios
          </Link>
        </nav>
      </div>
      <p className={`${column} mt-6 border-t pt-5 text-center text-xs sm:text-left ${neutral ? "border-arena-200 text-arena-700" : "border-white/20 text-white/70"}`}>
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}
