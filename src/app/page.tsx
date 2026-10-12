import { systemType } from "@/app/fonts";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Contact from "@/components/Contact";
import { SiteFooter } from "@/components/brand/site-footer";

export default function Home() {
  return (
    <div className={`${systemType} theme-hueso flex flex-col min-h-screen bg-background text-foreground`}>
      <Nav />

      <main className="flex-1">
        <Hero />
        <About />
        <Contact />
      </main>

      <SiteFooter tone="neutral" />
    </div>
  );
}
