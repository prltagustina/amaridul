import { Metadata } from "next";
import { ArrowRight, ChevronDown, UserRound } from "lucide-react";
import { BRAND, SITE_URL } from "@/lib/constants";
import Footer from "@/components/Footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";
import { BotanicalBranch, LavenderSprig, PhotoPlaceholder } from "@/components/brand/placeholders";
import { Accordion } from "@/components/ui/accordion";
import { LinkButton } from "@/components/ui/button";
import { DevTag } from "@/components/ui/display";
import { faqClosingPhrase, faqPlaceholderAnswer, faqQuestions, institutionalPhrase } from "@/demo/content";

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
    <>
      {/* Portada: photograph first, circular lockup, institutional phrase. */}
      <section aria-label="Portada" className="relative isolate flex min-h-[100svh] flex-col">
        <PhotoPlaceholder className="absolute inset-0 -z-10" label="Foto pendiente · portada" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/25 via-transparent to-foreground/45" />
        <MinimalHeader tone="over-photo" right={<MemberAccessLink tone="over-photo" />} />
        <h1 className="sr-only">Amarí Dul, asociación civil</h1>
        <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-8 pt-20 pb-24 text-center">
          <CircleLogo className="w-[min(74vw,22rem)]" />
          <div className="space-y-2">
            <p className="mx-auto max-w-[18ch] text-h2 text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.35)] sm:max-w-[22ch]">{institutionalPhrase}</p>
            <DevTag>Frase pendiente</DevTag>
          </div>
        </div>
        <a
          href="#comunidad"
          className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center !rounded-full !text-white hover:bg-white/10"
        >
          <span className="sr-only">Ir al contenido</span>
          <ChevronDown aria-hidden className="size-7 animate-bounce motion-safe-only" strokeWidth={1.25} />
        </a>
      </section>

      <main className="relative overflow-hidden page-gutter pt-14 pb-20 sm:pt-20">
        <section id="comunidad" aria-label="Sumate a Amarí Dul" className="content-column relative scroll-mt-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/logo.svg" alt="" className="mx-auto !h-auto w-14" />
          <p className="mx-auto mt-6 max-w-[30ch] text-h2 text-foreground">{faqClosingPhrase}</p>
          <DevTag className="mt-3">Frase pendiente</DevTag>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <LinkButton href="/qr/login" editorial size="lg" full>
                <UserRound aria-hidden className="size-5" strokeWidth={1.5} /> Acceso socios
              </LinkButton>
              <p className="text-small text-text-muted">Tu espacio personal</p>
            </div>
            <div className="space-y-2">
              <LinkButton href="/sumate" variant="accent" editorial size="lg" full>
                Sumate a la comunidad <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
              </LinkButton>
              <p className="text-small text-text-muted">Solicitud de preadmisión</p>
            </div>
          </div>
          <div className="mt-8">
            <LinkButton href="/" variant="ghost">
              Conocé más sobre Amarí Dul <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
            </LinkButton>
          </div>
        </section>

        <div className="content-column mt-14 flex justify-center sm:mt-16">
          <BotanicalBranch flip className="pointer-events-none w-32 text-brand/50 sm:w-40" />
        </div>

        <section id="preguntas" aria-labelledby="preguntas-title" className="content-column relative mt-8 scroll-mt-6">
          <div className="flex items-center gap-4">
            <h2 id="preguntas-title" className="text-h1 text-brand">
              Preguntas frecuentes
            </h2>
            <span aria-hidden className="mt-2 h-px flex-1 bg-accent/40" />
          </div>

          <Accordion
            className="relative mt-8"
            items={faqQuestions.map((q) => ({
              id: q.id,
              title: q.title,
              content: (
                <div className="space-y-3">
                  <DevTag>Respuesta pendiente</DevTag>
                  <p>{faqPlaceholderAnswer}</p>
                </div>
              ),
            }))}
          />
        </section>
        <LavenderSprig className="pointer-events-none absolute -bottom-6 -left-4 h-44 w-20 text-brand/60 sm:h-56 sm:w-24" />
      </main>

      <Footer />
    </>
  );
}
