import { Metadata } from "next";
import Link from "next/link";
import { BRAND, SITE_URL } from "@/lib/constants";

const title = BRAND.name;
const description = "Información del producto y contacto.";
const ogImage = {
  url: `${SITE_URL}/og/qr.png`,
  width: 1200,
  height: 630,
  alt: `${BRAND.name} — Información del producto y contacto`,
};

export const metadata: Metadata = {
  title: `${BRAND.name} | Información del producto`,
  description,
  alternates: {
    canonical: `${SITE_URL}/qr`,
  },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/qr`,
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

export default function QRPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 pt-6 sm:pt-8">
        <Link href="/" className="inline-flex items-center gap-2 py-2 px-3 text-lg sm:text-xl text-text-muted hover:text-[#3f6043] border-b border-b-transparent hover:border-b-[#3f6043] transition-all">
          <span className="text-xl">←</span> <span>Volver al inicio</span>
        </Link>
      </header>

      <main className="flex-1 px-4 pt-8 sm:pt-12 lg:pt-24 pb-8 sm:pb-12">
        <div className="max-w-md sm:max-w-lg lg:max-w-2xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12">
          {/* Bienvenida */}
          <div className="space-y-3 sm:space-y-4 text-center">
            <div className="flex justify-center -mb-3 sm:-mb-4">
              <div className="w-32 h-32 sm:w-56 sm:h-56 lg:w-72 lg:h-72">
                <img
                  src="/brand/logo.svg"
                  alt=""
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="font-medium leading-tight text-[#3f6043] whitespace-nowrap" style={{fontSize: "clamp(1.75rem, 5vw, 2.5rem)"}}>Bienvenido a Amarí Dul</h1>
            <p className="text-lg sm:text-lg text-text-muted leading-relaxed font-light">
              Asociación civil dedicada a [propósito pendiente de aprobación]
            </p>
          </div>

          {/* Información del producto/asociación */}
          <section className="space-y-3 sm:space-y-4 border-t border-border pt-6 sm:pt-8">
            <h2 className="font-medium text-[#3f6043]" style={{fontSize: "clamp(1.25rem, 4vw, 1.875rem)"}}>Sobre este producto</h2>
            <div className="space-y-3 text-lg text-text-muted leading-relaxed">
              <p>
                [Información sobre el producto / asociación que corresponde a
                este packaging. Pendiente de contenido aprobado.]
              </p>
              <p>
                Aquí irán detalles como origen, proceso, características o
                recomendaciones según corresponda.
              </p>
            </div>
          </section>

          {/* Trazabilidad - placeholder para expansión futura */}
          <section className="border-t border-border pt-6 sm:pt-8 opacity-50">
            <p className="text-sm sm:text-base text-text-muted italic leading-relaxed">
              [Futuro: Información de trazabilidad, QR de producto específico,
              documentación, etc.]
            </p>
          </section>

          {/* CTA principal */}
          <div className="space-y-3 border-t border-border pt-6 sm:pt-8">
            <Link
              href="/"
              className="block py-3 sm:py-4 px-4 bg-[#3f6043] !text-white text-center font-light text-lg sm:text-xl tracking-wide hover:bg-[#4f7053] transition-colors"
            >
              Conocer más
            </Link>
            <a
              href="#contacto"
              className="block py-3 sm:py-4 px-4 border-2 border-[#3f6043] text-[#3f6043] text-center font-light text-lg sm:text-xl tracking-wide hover:bg-[#3f6043] hover:!text-white transition-colors"
            >
              Contacto
            </a>
          </div>

          {/* Contacto */}
          <section id="contacto" className="border-t border-border pt-6 sm:pt-8">
            <h3 className="font-light mb-3 sm:mb-4 text-[#3f6043]" style={{fontSize: "clamp(1.125rem, 3.5vw, 1.5rem)"}}>Contáctanos</h3>
            <div className="space-y-2 text-base sm:text-lg">
              <p>
                <span className="text-text-muted">Instagram:</span>{" "}
                <span className="text-brand-hover">[Por confirmar]</span>
              </p>
              <p>
                <span className="text-text-muted">WhatsApp:</span>{" "}
                <span className="text-brand-hover">[Por confirmar]</span>
              </p>
              <p>
                <span className="text-text-muted">Email:</span>{" "}
                <span className="text-brand-hover">[Por confirmar]</span>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 border-t border-border text-center">
        <p className="text-sm sm:text-base text-text-muted">
          © {new Date().getFullYear()} Amarí Dul
        </p>
      </footer>
    </div>
  );
}
