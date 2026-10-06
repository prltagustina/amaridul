import Link from "next/link";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Nav />

      <main className="flex-1">
        <Hero />

        <About />

        {/* CTA */}
        <section className="pb-12 sm:pb-16 page-gutter">
          <div className="content-column">
            <Link
              href="/qr"
              className="block py-3 sm:py-4 px-4 bg-[#3f6043] !text-white text-center font-light text-lg sm:text-xl tracking-wide hover:bg-[#4f7053] transition-colors"
            >
              Más información
            </Link>
          </div>
        </section>

        <div className="border-t border-border page-gutter pb-8 sm:pb-12">
          <div className="content-column">
            <Contact divider={false} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
