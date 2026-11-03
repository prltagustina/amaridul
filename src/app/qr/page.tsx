import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/demo/qr-portada-provisoria.jpg";
import { ArrowRight, BadgeCheck, ChevronDown, ExternalLink, FileText, Info, MessageCircle, Sprout, UserRound } from "lucide-react";
import { BRAND, SHARE_DESCRIPTION, SHARE_IMAGE, SITE_URL } from "@/lib/constants";
import { SiteFooter } from "@/components/brand/site-footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { EditorialSection } from "@/components/brand/editorial-section";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";
import { Accordion } from "@/components/ui/accordion";
import { DevTag } from "@/components/ui/display";
import { faqAnswers, faqClosingPhrase, faqPlaceholderAnswer, faqQuestions, institutionalPhrase } from "@/demo/content";
import { isDemoEnabled } from "@/lib/demo";
import { REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";
import { officialWhatsAppLink, PUBLIC_QUESTION_MESSAGE } from "@/lib/whatsapp";

const title = BRAND.name;
const description = SHARE_DESCRIPTION;
const ogImage = SHARE_IMAGE;

export const metadata: Metadata = {
  title: `${BRAND.name} | ${BRAND.tagline}`,
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

// Every way someone arrives, with the next step for each. Joining in lila, members in hoja.
const SITUATIONS = [
  {
    title: "Quiero asociarme",
    detail: "Empezá con la preadmisión: lleva unos 5 minutos. Contanos quién sos y si tenés REPROCANN; el equipo te orienta sobre el recorrido.",
    href: "/sumate#asociarme",
    cta: "Empezar la preadmisión",
    Icon: Sprout,
    badge: "bg-[linear-gradient(135deg,var(--lila-800),var(--lila-700))]",
  },
  {
    title: "Todavía no tengo REPROCANN",
    detail: "El registro se tramita en el sitio oficial del Ministerio de Salud, con tu cuenta de Mi Argentina. Podés empezar la preadmisión igual: contalo ahí y te orientamos.",
    href: REPROCANN_OFFICIAL_SITE,
    cta: "Ir al sitio oficial",
    external: true,
    Icon: FileText,
    badge: "bg-[linear-gradient(135deg,var(--lila-800),var(--lila-700))]",
  },
  {
    title: "Ya soy socio/a y no tengo cuenta",
    detail: "Pedí tu acceso con tu nombre, DNI y email. La asociación verifica tus datos y te manda el enlace para activar tu cuenta. No hace falta volver a asociarte.",
    href: "/sumate/socio-existente",
    cta: "Ya soy socio/a",
    Icon: BadgeCheck,
    badge: "bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))]",
  },
  {
    title: "Ya tengo mi cuenta",
    detail: "Ingresá con tu DNI y tu contraseña. En tu espacio cargás tu credencial REPROCANN y ves los productos, la cuota y la ayuda.",
    href: "/qr/login",
    cta: "Ingresar",
    Icon: UserRound,
    badge: "bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))]",
  },
];

const JOURNEY = [
  { meta: "Online · 5 minutos", title: "Preadmisión", detail: "Contanos quién sos y qué te acerca a Amarí Dul. Si todavía no tenés REPROCANN, contalo ahí: no hace falta tenerlo para empezar.", href: "/sumate#asociarme", cta: "Empezar" },
  { meta: "Por invitación", title: "Solicitud formal", detail: "Completás tus datos, la categoría y aceptás el estatuto.", href: undefined, cta: undefined },
  { meta: "Comisión Directiva", title: "Admisión", detail: "Te avisamos la decisión y activás tu cuenta de socio.", href: undefined, cta: undefined },
];

export default function QRPage() {
  // Locally and on previews DEV notes show as a guide; production renders the same page without them.
  const demo = isDemoEnabled();
  const whatsapp = officialWhatsAppLink(PUBLIC_QUESTION_MESSAGE);
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
        <MinimalHeader tone="over-photo" right={<MemberAccessLink tone="over-photo" />} />
        <h1 className="sr-only">Amarí Dul, asociación civil</h1>
        <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-6 pt-18 pb-20 text-center sm:gap-8 sm:pt-20 sm:pb-24">
          <CircleLogo className="w-[min(78vw,50svh,26rem)] lg:w-[min(56svh,30rem)]" />
          <p className="mx-auto max-w-[24ch] font-display text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] leading-[1.15] font-medium text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.4)] sm:max-w-[26ch]">{institutionalPhrase}</p>
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
          title="Sumate a Amarí Dul"
          intro={
            <>
              {faqClosingPhrase} {demo && <DevTag className="mt-2">Frase pendiente</DevTag>}
            </>
          }
          className="scroll-mt-0"
        >
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
          <Link href="/" className="font-ui mt-6 inline-flex min-h-11 items-center gap-2 text-[0.8125rem] tracking-[0.18em] !text-arena-700 uppercase hover:!text-forest">
            Conocé más sobre Amarí Dul <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          </Link>
        </EditorialSection>

        {/* How to join: a soft green ground from the Amarí Dul scale. */}
        <EditorialSection
          id="sumarte"
          eyebrow="Asociarse"
          title="Cómo sumarte"
          intro="Elegí tu situación y te mostramos el camino. El equipo de la asociación te acompaña en cada paso."
          className="border-y border-hoja-100 bg-[linear-gradient(180deg,var(--hoja-50)_0%,var(--hoja-100)_100%)]"
          decor={<span aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-96 !rounded-full bg-hoja-200/60 blur-3xl" />}
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {SITUATIONS.map((s) => (
              <li key={s.title} className="flex flex-col gap-3 !rounded-card border border-hoja-200 bg-white/70 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center !rounded-full text-white ${s.badge}`}>
                    <s.Icon className="size-[1.125rem]" strokeWidth={1.5} />
                  </span>
                  <h3 className="font-title text-[1.1875rem] leading-snug text-foreground">{s.title}</h3>
                </div>
                <p className="text-body text-text-muted">{s.detail}</p>
                <a
                  href={s.href}
                  {...(s.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="font-ui mt-auto inline-flex min-h-11 items-center gap-1.5 self-start !text-forest underline-offset-4 hover:underline"
                >
                  {s.cta}
                  {s.external ? <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} /> : <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />}
                  {s.external && <span className="sr-only">(se abre en otra pestaña)</span>}
                </a>
              </li>
            ))}
          </ul>

          <h3 className="mt-12 font-title text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] text-forest">Si te asociás por primera vez</h3>
          <ol className="mt-4">
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-hoja-200 py-7 first:border-t-0 first:pt-0 sm:gap-x-8 sm:py-8">
                <p aria-hidden className="font-display text-[clamp(2.75rem,2.2rem+2.4vw,4rem)] leading-[0.9] font-medium text-hoja-600">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="text-eyebrow text-hoja-700">{step.meta}</p>
                  <h4 className="mt-1 font-title text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] text-foreground">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {step.title}
                  </h4>
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
          <p className="mt-4 flex items-start gap-3 border-t border-hoja-200 pt-6 text-small text-forest">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
            <span>
              <strong className="font-medium">Enviar la preadmisión no implica la admisión.</strong> La decide la Comisión Directiva y te avisamos por email.
            </span>
          </p>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-ui mt-6 inline-flex min-h-11 items-center gap-2 !rounded-full border border-forest/60 px-5 !text-forest hover:bg-white/60">
              <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> ¿Dudas? Escribinos por WhatsApp
            </a>
          )}
        </EditorialSection>

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
      </main>

      <SiteFooter tone="neutral" />
    </>
  );
}
