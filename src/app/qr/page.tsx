import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Amarí Dul | QR",
  description: "Asociación civil",
  alternates: {
    canonical: "https://amaridul.com/qr",
  },
  openGraph: {
    title: "Amarí Dul",
    description: "Asociación civil",
    url: "https://amaridul.com/qr",
    type: "website",
  },
};

export default function QRPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 pt-6 sm:pt-8">
        <Link href="/" className="inline-flex items-center gap-2 py-2 px-3 text-lg sm:text-xl text-[#3f6043] hover:text-[#3f6043] border-b border-b-transparent hover:border-b-[#3f6043] transition-all">
          <span className="text-[#3f6043] text-xl">←</span> <span>Volver al inicio</span>
        </Link>
      </header>

      <main className="flex-1 px-4 pt-8 sm:pt-12 lg:pt-24 pb-8 sm:pb-12">
        <div className="max-w-md sm:max-w-lg lg:max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Bienvenida */}
          <div className="space-y-2 sm:space-y-3 text-center bg-[#F2EBDD] px-6 sm:px-8 py-16 sm:py-24 lg:py-32 -mx-4 sm:-mx-8 lg:-mx-auto rounded-lg">
            <div className="flex justify-center -mb-4 sm:-mb-5 lg:-mb-12">
              <div className="w-48 h-48 sm:w-80 sm:h-80 lg:w-[32rem] lg:h-[32rem]">
                <img
                  src="/brand/logo.svg"
                  alt="Amarí Dul"
                  className="w-full h-full"
                />
              </div>
            </div>
            <h1 className="font-bold leading-tight text-[#3f6043] whitespace-nowrap" style={{fontSize: "clamp(1.75rem, 5vw, 2.5rem)"}}>Bienvenido a Amarí Dul</h1>
            <p className="text-lg sm:text-lg text-[#3f6043] leading-relaxed">
              Asociación civil dedicada a [propósito pendiente de aprobación]
            </p>
          </div>

          {/* Información del producto/asociación */}
          <section className="space-y-3 sm:space-y-4 border-t border-border pt-2 sm:pt-3">
            <h2 className="font-light text-[#3f6043]" style={{fontSize: "clamp(1.25rem, 4vw, 1.875rem)"}}>Sobre este producto</h2>
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
            <a
              href="https://amaridul.com"
              className="block py-3 sm:py-4 px-4 bg-[#3f6043] !text-white text-center font-light text-lg sm:text-xl tracking-wide hover:bg-[#4f7053] transition-colors"
            >
              Conocer más
            </a>
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
