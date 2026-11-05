import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/assets/demo/qr-portada-provisoria.jpg";
import { ArrowRight, BadgeCheck, ChevronDown, ExternalLink, Info, Sprout, UserRound } from "lucide-react";
import { BRAND, SHARE_DESCRIPTION, SHARE_IMAGE, SITE_URL } from "@/lib/constants";
import { SiteFooter } from "@/components/brand/site-footer";
import { CircleLogo } from "@/components/brand/circle-logo";
import { EditorialSection } from "@/components/brand/editorial-section";
import { SectionNav } from "@/components/brand/section-nav";
import Nav from "@/components/Nav";
import { Accordion } from "@/components/ui/accordion";
import { AnchorButton, LinkButton } from "@/components/ui/button";
import { StepCards } from "@/components/ui/step-cards";
import { LinkCodeVideo } from "@/components/reprocann/link-code-video";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { DevTag } from "@/components/ui/display";
import { faqAnswers, faqClosingPhrase, faqPlaceholderAnswer, faqQuestions, institutionalPhrase } from "@/demo/content";
import { isDemoEnabled } from "@/lib/demo";
import { contactAvailable } from "@/lib/features";
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

// Comunidad's four parts, in the bar under the menu.
const SECTIONS = [
  { id: "comunidad", label: "Sumate a Amarí Dul", short: "Sumate" },
  { id: "sumarte", label: "Asociarse" },
  { id: "reprocann", label: "REPROCANN" },
  { id: "preguntas", label: "Preguntas frecuentes", short: "Preguntas" },
];

// Every way someone arrives, with its one next step. Joining in lila, members in hoja.
const PATHS = [
  { href: "/sumate", title: "Quiero asociarme", detail: "Empezá con la preadmisión: lleva unos 5 minutos", Icon: Sprout, theme: "flujo-sumate", badge: "bg-[linear-gradient(135deg,var(--lila-800),var(--lila-700))]" },
  { href: "/sumate/socio-existente", title: "Ya soy socio/a y no tengo cuenta", detail: "Pedí tu acceso: sin volver a asociarte", Icon: BadgeCheck, theme: "", badge: "bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))]" },
  { href: "/qr/login", title: "Ya tengo mi cuenta", detail: "Ingresá a tu espacio de socio", Icon: UserRound, theme: "", badge: "bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))]" },
];

const JOURNEY = [
  { meta: "Online · 5 minutos", title: "Preadmisión", detail: "Contanos quién sos y qué te acerca a Amarí Dul. Si todavía no tenés REPROCANN, contalo ahí: no hace falta tenerlo para empezar.", href: "/sumate", cta: "Empezar" },
  { meta: "Por invitación", title: "Solicitud formal", detail: "Completás tus datos, la categoría y aceptás el estatuto.", href: undefined, cta: undefined },
  { meta: "Comisión Directiva", title: "Admisión", detail: "Te avisamos la decisión y activás tu cuenta de socio.", href: undefined, cta: undefined },
];

// REPROCANN with the association, step by step, in the order Luci set: starting the procedure
// with the association begins with the link code (the video shows where it is, after step 1).
const REPROCANN_STEPS = [
  {
    meta: "Primer paso · sitio oficial",
    title: "Encontrá tu código de vinculación REPROCANN",
    detail: "Si vas a iniciar el trámite con la asociación, empezá por acá: entrá al sitio oficial con tu cuenta de Mi Argentina y buscalo en tu Registro de paciente.",
    link: { href: REPROCANN_OFFICIAL_SITE, label: "Ir al sitio oficial", external: true },
  },
  {
    meta: "En tu espacio de socio",
    title: "Pasáselo a la asociación",
    detail: "Cuando seas socio/a, cargalo en tu espacio, en REPROCANN. Con ese código la asociación gestiona tu vinculación con Amarí Dul y te acompaña en el trámite; ahí ves cuándo queda verificada.",
    link: null,
  },
  {
    meta: "Si ya tenés tu credencial",
    title: "Cargala para que la revisemos",
    detail: "Subila desde tu espacio, en REPROCANN. Hasta que la asociación la revise, figura «en revisión».",
    link: { href: "/qr/login", label: "Ingresar a mi espacio", external: false },
  },
];

export default function QRPage() {
  // Locally and on previews DEV notes show as a guide; production renders the same page without them.
  const demo = isDemoEnabled();
  const whatsapp = officialWhatsAppLink(PUBLIC_QUESTION_MESSAGE);
  return (
    <>
      <Nav showContact={contactAvailable()} memberAccess />
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
        <h1 className="sr-only">Amarí Dul, asociación civil</h1>
        <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-6 pt-18 pb-20 text-center sm:gap-8 sm:pt-20 sm:pb-24">
          <CircleLogo className="w-[min(78vw,50svh,26rem)] lg:w-[min(56svh,30rem)]" />
          <p className="mx-auto max-w-[22ch] font-title !font-semibold text-[clamp(1.375rem,1.15rem+1vw,1.875rem)] leading-[1.2] !tracking-[-0.01em] text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.4)]">{institutionalPhrase}</p>
        </div>
        <a
          href="#comunidad"
          className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center !rounded-full !text-white hover:bg-white/10"
        >
          <span className="sr-only">Ir al contenido</span>
          <ChevronDown aria-hidden className="size-7 animate-bounce motion-safe-only" strokeWidth={1.25} />
        </a>
      </section>

      <SectionNav label="En Comunidad" items={SECTIONS} />

      {/* The sections leave room for the menu and the section bar when a link scrolls to them. */}
      <main className="[--anchor-offset:calc(var(--nav-h)+3rem)]">
        <EditorialSection
          id="comunidad"
          eyebrow="Comunidad"
          title="Sumate a Amarí Dul"
          intro={
            <>
              {faqClosingPhrase} {demo && <DevTag className="mt-2">Frase pendiente</DevTag>}
            </>
          }
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
          title="Cómo es asociarse"
          intro="Tres pasos, con el acompañamiento del equipo de la asociación."
          className="border-y border-hoja-100 bg-[linear-gradient(180deg,var(--hoja-50)_0%,var(--hoja-100)_100%)]"
          decor={<span aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-96 !rounded-full bg-hoja-200/60 blur-3xl" />}
        >
          <ol>
            {JOURNEY.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-hoja-200 py-7 first:border-t-0 first:pt-0 sm:gap-x-8 sm:py-8">
                <p aria-hidden className="font-display text-[clamp(2.75rem,2.2rem+2.4vw,4rem)] leading-[0.9] font-medium text-hoja-600">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <p className="text-eyebrow text-hoja-700">{step.meta}</p>
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
          <p className="mt-4 flex items-start gap-3 border-t border-hoja-200 pt-6 text-small text-forest">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
            <span>
              <strong className="font-medium">Enviar la preadmisión no implica la admisión.</strong> La decide la Comisión Directiva y te avisamos por email.
            </span>
          </p>
        </EditorialSection>

        <EditorialSection
          id="reprocann"
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-1.5 !rounded-full bg-rosa-400" />
              REPROCANN
            </span>
          }
          title={
            <>
              Tu REPROCANN,
              <br /> paso a paso
            </>
          }
          intro="Es el registro del Ministerio de Salud para el uso medicinal del cannabis. Si todavía no lo tenés, te acompañamos a tramitarlo."
          stacked
          className="bg-lila-50"
        >
          <StepCards
            label="Tu REPROCANN, paso a paso"
            bleed="-mx-6 px-6 scroll-px-6 sm:-mx-4 sm:px-4 sm:scroll-px-4"
            aside={
              <div className="mx-auto w-full max-w-[16rem] lg:relative lg:mx-0 lg:h-full lg:w-[14.5rem] lg:max-w-none xl:w-[13.5rem]">
                <LinkCodeVideo className="lg:absolute lg:inset-0 lg:size-full lg:object-cover" />
              </div>
            }
            steps={REPROCANN_STEPS.map((step) => ({
              meta: step.meta,
              title: step.title,
              detail: step.detail,
              action: step.link ? (
                step.link.external ? (
                  <AnchorButton href={step.link.href} target="_blank" rel="noopener noreferrer" size="sm">
                    {step.link.label} <ExternalLink aria-hidden strokeWidth={1.5} />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </AnchorButton>
                ) : (
                  <LinkButton href={step.link.href} size="sm">
                    {step.link.label} <ArrowRight aria-hidden strokeWidth={1.5} />
                  </LinkButton>
                )
              ) : undefined,
            }))}
          />
          {whatsapp && (
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-lila-200 pt-7">
              <p className="text-body text-foreground">¿Dudas con tu REPROCANN o con el ingreso?</p>
              <AnchorButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="primary">
                <WhatsAppIcon /> Escribinos<span className="sr-only"> por WhatsApp</span>
              </AnchorButton>
            </div>
          )}
        </EditorialSection>

        <EditorialSection id="preguntas" eyebrow="Información" title="Preguntas frecuentes" className="bg-arena-100">
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
