import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { BrandButterfly } from "./headers";

/** Footer of the new views, in the Amarí Dul forest palette. The home keeps its own footer. */
export function SiteFooter({ wide = false }: { wide?: boolean }) {
  const column = wide ? "admin-column" : "nav-column";
  return (
    <footer className="page-gutter bg-[linear-gradient(118deg,var(--forest)_0%,#3a5f41_60%,var(--accent)_100%)] py-10 text-white">
      <div className={`${column} flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left`}>
        <div className="space-y-2">
          <span className="flex items-center justify-center gap-2 sm:justify-start">
            <BrandButterfly onPhoto className="!h-8" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src="/brand/wordmark-bold-cream.svg" alt={BRAND.name} className="!h-6 !w-auto" />
          </span>
          <p className="text-xs tracking-[0.2em] text-white/75 uppercase">Asociación civil</p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap justify-center gap-x-6 text-sm">
          <Link href="/" className="inline-flex min-h-11 items-center !text-white/85 hover:!text-white">
            Sitio institucional
          </Link>
          <Link href="/qr#preguntas" className="inline-flex min-h-11 items-center !text-white/85 hover:!text-white">
            Preguntas frecuentes
          </Link>
          <Link href="/qr/login" className="inline-flex min-h-11 items-center !text-white/85 hover:!text-white">
            Acceso socios
          </Link>
        </nav>
      </div>
      <p className={`${column} mt-6 border-t border-white/20 pt-5 text-center text-xs text-white/70 sm:text-left`}>
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}
