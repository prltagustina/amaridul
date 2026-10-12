import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/demo/qr-portada-provisoria.jpg";
import { ArrowRight, ChevronDown, Info, UserRound } from "lucide-react";
import { BRAND, SITE_URL } from "@/lib/constants";
import { SiteFooter } from "@/components/brand/site-footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";
import { Accordion } from "@/components/ui/accordion";
import { LinkButton } from "@/components/ui/button";
import { DevTag } from "@/components/ui/display";
import { FolderTabs } from "@/components/ui/technical";
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

const JOURNEY = [
  { meta: "Online · 5 minutos", title: "Preadmisión", detail: "Contanos quién sos y qué te acerca a Amarí Dul.", href: "/sumate", cta: "Empezar" },
  { meta: "Por invitación", title: "Solicitud formal", detail: "Completás tus datos, la categoría y aceptás el estatuto.", href: undefined, cta: undefined },
  { meta: "Comisión Directiva", title: "Admisión", detail: "Te avisamos la decisión y activás tu cuenta de socio.", href: undefined, cta: undefined },
];

export default function QRPage() {
  return (
    <>
      {/* Portada: photograph first, circular lockup, institutional phrase. */}
      <section aria-label="Portada" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        {/* Provisional photo taken from the visual reference; replace with the commissioned shoot. */}
        <Image src={heroPhoto} alt="" fill preload placeholder="blur" quality={85} sizes="100vw" className="-z-20 object-cover object-center md:scale-110 md:blur-md" />
        {/* Wide screens: the portrait photo frames both sides, soft focus in the middle. */}
        <div aria-hidden className="absolute inset-y-0 left-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_right,black_45%,transparent)] md:block">
          <Image src={heroPhoto} alt="" fill quality={85} sizes="40vw" className="object-cover object-bottom" />
        </div>
        <div aria-hidden className="absolute inset-y-0 right-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_left,black_45%,transparent)] md:block">
          <Image src={heroPhoto} alt="" fill quality={85} sizes="40vw" className="object-cover object-top" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(29_52_30/0.45)_0%,rgb(29_52_30/0.05)_45%,rgba(26,44,31,0.7)_100%)]" />
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

      <main className="relative isolate overflow-hidden page-gutter pt-14 pb-24 sm:pt-20 sm:pb-28">
        <section id="comunidad" aria-label="Sumate a Amarí Dul" className="content-column relative scroll-mt-6">
          <FolderTabs className="px-6" />
          <div className="!rounded-card border border-mist-line bg-white px-5 pt-10 pb-8 text-center shadow-[0_24px_50px_-36px_rgb(29_52_30/0.6)] sm:px-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src="/brand/logo.svg" alt="" className="butterfly-flutter mx-auto !h-auto w-14" />
            <p className="mx-auto mt-6 max-w-[30ch] text-h2 text-forest">{faqClosingPhrase}</p>
            <DevTag className="mt-3">Frase pendiente</DevTag>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <LinkButton href="/qr/login" editorial size="lg" full>
                  <UserRound aria-hidden className="size-5" strokeWidth={1.5} /> Acceso socios
                </LinkButton>
                <p className="text-small text-text-muted">Tu espacio personal</p>
              </div>
              <div className="space-y-2">
                <LinkButton href="/sumate" variant="join" editorial size="lg" full>
                  Sumate a la comunidad <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
                </LinkButton>
                <p className="text-small text-text-muted">Solicitud de preadmisión</p>
              </div>
            </div>
            <div className="mt-6">
              <LinkButton href="/" variant="ghost">
                Conocé más sobre Amarí Dul <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </LinkButton>
            </div>
          </div>
        </section>

        <section aria-labelledby="sumarte-title" className="flujo-sumate content-column mt-20 sm:mt-24">
          <div className="text-center">
            <p className="text-eyebrow text-accent">Asociarse</p>
            <h2 id="sumarte-title" className="mt-2 text-h1 text-forest">
              Cómo sumarte
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body text-text-muted">Tres pasos, con el acompañamiento del equipo de la asociación.</p>
          </div>

          <ol className="relative mt-10 grid gap-9 md:grid-cols-3 md:gap-6">
            <span aria-hidden className="absolute top-[1.375rem] right-[16.66%] left-[16.66%] hidden h-px bg-lila-200 md:block" />
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="relative flex gap-5 md:flex-col md:items-center md:gap-4 md:text-center">
                {i < JOURNEY.length - 1 && <span aria-hidden className="absolute top-11 -bottom-9 left-[1.375rem] w-px bg-lila-200 md:hidden" />}
                <span
                  aria-hidden
                  className="relative z-10 flex size-11 shrink-0 items-center justify-center !rounded-full bg-[linear-gradient(135deg,var(--lila-800),var(--lila-600))] font-medium text-white shadow-[0_8px_18px_-10px_rgb(51_40_64/0.8)] ring-8 ring-background"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1.5 pt-1 md:pt-0">
                  <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">{step.meta}</p>
                  <h3 className="text-xl font-title text-forest">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="text-small text-text-muted md:mx-auto md:max-w-[16rem]">{step.detail}</p>
                  {step.href && (
                    <Link href={step.href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium !text-forest underline-offset-4 hover:underline">
                      {step.cta} <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 flex items-start gap-3 !rounded-card border border-lila-100 bg-lila-50 px-5 py-4 text-small text-lila-800">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
            <span>
              <strong className="font-medium">Enviar la preadmisión no implica la admisión.</strong> La decide la Comisión Directiva y te avisamos por email.
            </span>
          </p>
        </section>

        <section id="preguntas" aria-labelledby="preguntas-title" className="content-column relative mt-20 scroll-mt-6 sm:mt-24">
          <div className="text-center">
            <p className="text-eyebrow text-accent">Información</p>
            <h2 id="preguntas-title" className="mt-2 text-h1 text-forest">
              Preguntas frecuentes
            </h2>
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
      </main>

      <SiteFooter />
    </>
  );
}
