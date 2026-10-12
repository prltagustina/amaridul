import { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, ChevronDown, UserRound } from "lucide-react";
import { BRAND, SITE_URL } from "@/lib/constants";
import Footer from "@/components/Footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";
import { CannabisSprig, CornerLeaves, LeafMark } from "@/components/brand/botanicals";
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
      <section aria-label="Portada" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        {/* Provisional photo taken from the visual reference; replace with the commissioned shoot. */}
        <Image src="/demo/qr-portada-provisoria-2.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center md:scale-110 md:blur-md" />
        {/* Wide screens: the portrait photo frames both sides, soft focus in the middle. */}
        <div aria-hidden className="absolute inset-y-0 left-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_right,black_45%,transparent)] md:block">
          <Image src="/demo/qr-portada-provisoria-2.jpg" alt="" fill sizes="40vw" className="object-cover object-bottom" />
        </div>
        <div aria-hidden className="absolute inset-y-0 right-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_left,black_45%,transparent)] md:block">
          <Image src="/demo/qr-portada-provisoria-2.jpg" alt="" fill sizes="40vw" className="object-cover object-top" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-foreground/30 via-foreground/5 to-foreground/50" />
        <DevTag className="absolute right-3 bottom-3 z-10">Foto provisoria del mockup</DevTag>
        <MinimalHeader tone="over-photo" right={<MemberAccessLink tone="over-photo" />} />
        <h1 className="sr-only">Amarí Dul, asociación civil</h1>
        <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-6 pt-18 pb-20 text-center sm:gap-8 sm:pt-20 sm:pb-24">
          <CircleLogo className="w-[min(86vw,54svh,26rem)] lg:w-[min(56svh,30rem)]" />
          <div className="space-y-2">
            <p className="mx-auto max-w-[17ch] font-display text-[clamp(2rem,1.45rem+2.6vw,3.25rem)] leading-[1.1] font-medium text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.4)] sm:max-w-[22ch]">{institutionalPhrase}</p>
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

      <main className="relative isolate overflow-hidden page-gutter pt-14 pb-36 sm:pt-20 sm:pb-44">
        <section id="comunidad" aria-label="Sumate a Amarí Dul" className="content-column relative scroll-mt-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/logo.svg" alt="" className="butterfly-flutter mx-auto !h-auto w-14" />
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

        <CannabisSprig className="pointer-events-none absolute top-1/2 hidden h-[30rem] w-auto -translate-y-1/2 text-brand/60 xl:right-[calc(50%-40rem)] xl:block" />

        <section id="preguntas" aria-labelledby="preguntas-title" className="content-column relative mt-20 scroll-mt-6 sm:mt-24">
          <CannabisSprig className="pointer-events-none absolute -top-48 -right-20 -z-10 h-60 w-auto text-brand/45 sm:-right-6 xl:hidden" />
          <LeafMark className="mb-3 w-9 text-accent" />
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
        <CornerLeaves className="pointer-events-none absolute -bottom-3 -left-8 w-52 text-brand/50 sm:w-72" />
        <CornerLeaves flip className="pointer-events-none absolute -right-8 -bottom-3 w-40 text-brand/40 sm:w-60" />
      </main>

      <Footer />
    </>
  );
}
