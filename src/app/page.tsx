import { systemType } from "@/app/fonts";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Contact from "@/components/Contact";
import { SiteFooter } from "@/components/brand/site-footer";
import { demoAttr, isDemoEnabled } from "@/lib/demo";
import { contactAvailable } from "@/lib/features";

export default function Home() {
  const showContact = contactAvailable();
  return (
    <div className={`${systemType} theme-hueso flex flex-col min-h-screen bg-background text-foreground`} {...demoAttr()}>
      <Nav showContact={showContact} />

      <main className="flex-1">
        <Hero />
        <About />
        {showContact && <Contact demo={isDemoEnabled()} />}
      </main>

      <SiteFooter tone="neutral" />
    </div>
  );
}
