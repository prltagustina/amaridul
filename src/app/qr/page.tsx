import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/demo/qr-portada-provisoria.jpg";
import { ArrowRight, ChevronDown, Info, Sprout, UserRound } from "lucide-react";
import { BRAND, SITE_URL } from "@/lib/constants";
import { SiteFooter } from "@/components/brand/site-footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { EditorialSection } from "@/components/brand/editorial-section";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";
import { Accordion } from "@/components/ui/accordion";
import { DevTag } from "@/components/ui/display";
import { faqAnswers, faqClosingPhrase, faqPlaceholderAnswer, faqQuestions, institutionalPhrase } from "@/demo/content";
import { isDemoEnabled } from "@/lib/demo";
import { faqAvailable, portalAvailable } from "@/lib/features";

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

// The two flows keep their colours: members in hoja, joining in lila.
const PATHS = [
  { href: "/qr/login", title: "Acceso socios", detail: "Tu espacio personal", Icon: UserRound, theme: "", badge: "bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))]" },
  { href: "/sumate", title: "Sumate a la comunidad", detail: "Solicitud de preadmisión", Icon: Sprout, theme: "flujo-sumate", badge: "bg-[linear-gradient(135deg,var(--lila-800),var(--lila-700))]" },
];

const JOURNEY = [
  { meta: "Online · 5 minutos", title: "Preadmisión", detail: "Contanos quién sos y qué te acerca a Amarí Dul.", href: "/sumate", cta: "Empezar" },
  { meta: "Por invitación", title: "Solicitud formal", detail: "Completás tus datos, la categoría y aceptás el estatuto.", href: undefined, cta: undefined },
  { meta: "Comisión Directiva", title: "Admisión", detail: "Te avisamos la decisión y activás tu cuenta de socio.", href: undefined, cta: undefined },
];

export default function QRPage() {
  // Locally everything shows, with DEV notes as a guide. In production only finished content does:
  // no notes, no links to flows that are not live yet, no FAQ until its answers are approved.
  const demo = isDemoEnabled();
  const portal = portalAvailable();
  const showFaq = faqAvailable();
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
        {demo && <DevTag className="absolute right-3 bottom-3 z-10">Foto provisoria del mockup</DevTag>}
        <MinimalHeader tone="over-photo" right={portal ? <MemberAccessLink tone="over-photo" /> : undefined} />
        <h1 className="sr-only">Amarí Dul, asociación civil</h1>
        <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-6 pt-18 pb-20 text-center sm:gap-8 sm:pt-20 sm:pb-24">
          <CircleLogo className="w-[min(86vw,54svh,26rem)] lg:w-[min(56svh,30rem)]" />
          <div className="space-y-2">
            <p className="mx-auto max-w-[17ch] font-display text-[clamp(2rem,1.45rem+2.6vw,3.25rem)] leading-[1.1] font-medium text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.4)] sm:max-w-[22ch]">{institutionalPhrase}</p>
            {demo && <DevTag>Frase pendiente</DevTag>}
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

      <main>
        <EditorialSection
          id="comunidad"
          eyebrow="Comunidad"
          title={portal ? "Sumate a Amarí Dul" : "Conocé Amarí Dul"}
          intro={
            <>
              {faqClosingPhrase} {demo && <DevTag className="mt-2">Frase pendiente</DevTag>}
            </>
          }
          className="scroll-mt-0"
        >
          {portal && (
          <ul className="divide-y divide-mist-line border-y border-mist-line">
            {PATHS.map((path) => (
              <li key={path.href} className={path.theme}>
                <Link href={path.href} className="group flex items-center gap-5 py-6 !text-foreground sm:gap-6 sm:py-7">
                  <span aria-hidden className={`flex size-12 shrink-0 items-center justify-center !rounded-full text-white shadow-[0_10px_24px_-14px_rgb(26_26_24/0.6)] ${path.badge}`}>
                    <path.Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-title text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] text-forest">{path.title}</span>
                    <span className="mt-0.5 block text-small text-text-muted">{path.detail}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0 text-forest transition-transform duration-200 group-hover:translate-x-1 motion-safe-only" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
          )}
          <Link href="/" className="font-ui mt-6 inline-flex min-h-11 items-center gap-2 text-[0.8125rem] tracking-[0.18em] !text-arena-700 uppercase hover:!text-forest">
            Conocé más sobre Amarí Dul <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          </Link>
        </EditorialSection>

        {/* Joining: its own violet ground. */}
        {portal && (
        <EditorialSection
          id="sumarte"
          eyebrow="Asociarse"
          title="Cómo sumarte"
          intro="Tres pasos, con el acompañamiento del equipo de la asociación."
          className="flujo-sumate border-y border-lila-100 bg-[linear-gradient(180deg,var(--lila-50)_0%,var(--lila-100)_100%)]"
          decor={<span aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-96 !rounded-full bg-lila-200/60 blur-3xl" />}
        >
          <ol>
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-lila-200 py-7 first:border-t-0 first:pt-0 sm:gap-x-8 sm:py-8">
                <p aria-hidden className="font-display text-[clamp(2.75rem,2.2rem+2.4vw,4rem)] leading-[0.9] font-medium text-lila-600">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="text-eyebrow text-lila-700">{step.meta}</p>
                  <h3 className="mt-1 font-title text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] text-foreground">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-body text-text-muted">{step.detail}</p>
                  {step.href && (
                    <Link href={step.href} className="font-ui mt-2 inline-flex min-h-11 items-center gap-1.5 !text-forest underline-offset-4 hover:underline">
                      {step.cta} <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-3 border-t border-lila-200 pt-6 text-small text-lila-800">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
            <span>
              <strong className="font-medium">Enviar la preadmisión no implica la admisión.</strong> La decide la Comisión Directiva y te avisamos por email.
            </span>
          </p>
        </EditorialSection>
        )}

        {showFaq && (
        <EditorialSection id="preguntas" eyebrow="Información" title="Preguntas frecuentes" className="scroll-mt-0 bg-arena-100">
          <Accordion
            variant="lines"
            items={faqQuestions.map((q) => ({
              id: q.id,
              title: q.title,
              content: faqAnswers[q.id] ? (
                <p>{faqAnswers[q.id]}</p>
              ) : (
                <div className="space-y-3">
                  <DevTag>Respuesta pendiente</DevTag>
                  <p>{faqPlaceholderAnswer}</p>
                </div>
              ),
            }))}
          />
        </EditorialSection>
        )}
      </main>

      <SiteFooter tone="neutral" />
    </>
  );
}
