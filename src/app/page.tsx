import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />

      <main className="flex-1">
        <Hero />

        {/* Presentación */}
        <section className="py-12 sm:py-20 lg:py-24 px-4 sm:px-8 border-t border-border">
          <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6">
            <p className="text-lg sm:text-xl lg:text-xl leading-relaxed text-text-muted">
              [Párrafo 1: Descripción breve de Amarí Dul como asociación civil,
              su propósito y valores. Pendiente de contenido aprobado.]
            </p>
            <p className="text-lg sm:text-xl lg:text-xl leading-relaxed text-text-muted">
              [Párrafo 2: Información sobre productos o servicios. Pendiente de
              contenido aprobado.]
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 lg:py-24 px-4 sm:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <a
              href="/qr"
              className="inline-block px-8 sm:px-10 py-3 sm:py-4 bg-[#3f6043] !text-white font-light text-lg sm:text-xl tracking-wide hover:bg-[#4f7053] transition-colors"
            >
              Más información
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
