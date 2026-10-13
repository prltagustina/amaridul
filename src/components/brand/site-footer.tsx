import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { faqAvailable } from "@/lib/features";
import { BrandLockup } from "./headers";

/** Footer links. The FAQ link appears once the FAQ is published. */
function FooterLinks({ link, className }: { link: string; className?: string }) {
  return (
    <nav aria-label="Pie de página" className={className}>
      <Link href="/" className={`inline-flex min-h-11 items-center ${link}`}>
        Sitio institucional
      </Link>
      <Link href="/qr" className={`inline-flex min-h-11 items-center ${link}`}>
        Producto
      </Link>
      {faqAvailable() && (
        <Link href="/qr#preguntas" className={`inline-flex min-h-11 items-center ${link}`}>
          Preguntas frecuentes
        </Link>
      )}
      <Link href="/qr/login" className={`inline-flex min-h-11 items-center ${link}`}>
        Acceso socios
      </Link>
    </nav>
  );
}

/**
 * Site footer. "forest": the green gradient. "neutral": soft sand, for pages that already carry a
 * lot of green (home, /qr). `compact`: a single slim line for task views (access, portal, forms),
 * so short pages fit the screen without scrolling (links from `sm` up).
 */
export function SiteFooter({ wide = false, tone = "forest", compact = false }: { wide?: boolean; tone?: "forest" | "neutral"; compact?: boolean }) {
  const column = wide ? "admin-column" : "nav-column";
  if (compact) {
    return (
      <footer className="page-gutter border-t border-arena-200 bg-arena-50 text-xs text-arena-700">
        <div className={`${column} flex flex-wrap items-center justify-center gap-x-5 sm:justify-between`}>
          <p className="inline-flex min-h-11 items-center">© {new Date().getFullYear()} {BRAND.name}</p>
          {/* On phones the header already carries the navigation; keep the strip to one line. */}
          <FooterLinks link="!text-arena-700 hover:!text-forest" className="hidden flex-wrap justify-center gap-x-5 sm:flex" />
        </div>
      </footer>
    );
  }
  const neutral = tone === "neutral";
  const link = neutral ? "!text-arena-700 hover:!text-forest" : "!text-white/85 hover:!text-white";
  return (
    <footer
      className={
        neutral
          ? "page-gutter border-t border-arena-200 bg-arena-50 py-10 text-foreground"
          : "page-gutter border-t border-white/10 bg-[linear-gradient(118deg,var(--hoja-800)_0%,var(--hoja-700)_50%,var(--hoja-600)_100%)] py-10 text-white"
      }
    >
      <div className={`${column} flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left`}>
        <BrandLockup tone={neutral ? "forest" : "cream"} size="footer" alt={BRAND.name} />
        <FooterLinks link={link} className="flex flex-wrap justify-center gap-x-6 text-sm" />
      </div>
      <p className={`${column} mt-6 border-t pt-5 text-center text-xs sm:text-left ${neutral ? "border-arena-200 text-arena-700" : "border-white/20 text-white/70"}`}>
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}
