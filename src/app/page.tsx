import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <Hero />

        {/* Presentación */}
        <section className="pb-12 sm:pb-20 lg:pb-24 px-4">
          <div className="content-column border-t border-border pt-12 sm:pt-20 lg:pt-24 space-y-5 sm:space-y-6">
            <p className="text-body text-text-muted">
              [Párrafo 1: Descripción breve de Amarí Dul como asociación civil,
              su propósito y valores. Pendiente de contenido aprobado.]
            </p>
            <p className="text-body text-text-muted">
              [Párrafo 2: Información sobre productos o servicios. Pendiente de
              contenido aprobado.]
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 lg:py-24 px-4">
          <div className="content-column">
            <Link
              href="/qr"
              className="block py-3 sm:py-4 px-4 bg-[#3f6043] !text-white text-center font-light text-lg sm:text-xl tracking-wide hover:bg-[#4f7053] transition-colors"
            >
              Más información
            </Link>
          </div>
        </section>

        <div className="px-4 pb-8 sm:pb-12">
          <div className="content-column">
            <Contact />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
