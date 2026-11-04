import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, MessageCircle, Upload } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { DevTag } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { CONTACT } from "@/lib/constants";
import { localDemo } from "@/lib/features";
import { FEE_PAGE } from "@/lib/fee-payment";
import { LINK_CODE_STEPS, LINK_CODE_VIDEO, REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";
import { MEMBER_QUESTION_MESSAGE, officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { currentMember } from "@/server/member-session";

export const metadata: Metadata = { title: "Ayuda | Amarí Dul" };

const outline = "inline-flex min-h-11 items-center gap-2 !rounded-full border border-forest/60 px-5 text-[0.9375rem] font-medium !text-forest hover:bg-forest-soft";
const textLink = "inline-flex min-h-11 items-center gap-1.5 font-medium !text-forest underline-offset-4 hover:underline";

/** A question and where it is answered. */
function Topic({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h3 className="text-lg font-title text-forest">{title}</h3>
      <div className="space-y-2 text-[0.9375rem] leading-relaxed text-text-muted">{children}</div>
      {action && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{action}</div>}
    </div>
  );
}

function WhatsApp({ message, label }: { message: string; label: string }) {
  const href = officialWhatsAppLink(message);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={outline}>
      <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> {label}
    </a>
  ) : null;
}

/**
 * Help for members, by situation: starting the REPROCANN procedure, sending the credential,
 * finding the link code, the fee, their data and how to reach the association.
 */
export default async function AyudaPage() {
  await currentMember();
  const demo = localDemo();
  return (
    <main>
      <PageBand compact eyebrow="Ayuda" title="Ayuda y contacto" description="Tus trámites, tu membresía y tu cuota, paso a paso." tab="Preguntas" back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column grid gap-x-6 gap-y-8 lg:grid-cols-2">
          <TabbedCard tab="REPROCANN" tone="sand" fill bodyClassName="divide-y divide-mist-line">
            <Topic
              title="Todavía no tengo REPROCANN"
              action={
                <>
                  <a href={REPROCANN_OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" className={outline}>
                    Ir al sitio oficial <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                  <WhatsApp message={MEMBER_QUESTION_MESSAGE} label="Consultar por WhatsApp" />
                </>
              }
            >
              <p>El trámite se hace en el sitio oficial del Registro del Programa de Cannabis (REPROCANN), del Ministerio de Salud de la Nación, con tu cuenta de Mi Argentina.</p>
              <p>Si no sabés por dónde empezar, escribinos y te orientamos.</p>
            </Topic>
            <Topic
              title="Ya tengo mi credencial: quiero cargarla"
              action={
                <LinkButton href="/qr/reprocann#cargar" variant="secondary">
                  <Upload aria-hidden className="size-4" strokeWidth={1.5} /> Cargar mi credencial
                </LinkButton>
              }
            >
              <p>Subí el PDF o una foto nítida. La asociación la revisa: hasta entonces figura «en revisión».</p>
            </Topic>
            <Topic title="¿Dónde encuentro mi código de vinculación?">
              <div id="codigo-de-vinculacion" className="grid scroll-mt-6 items-start gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                <video
                  controls
                  playsInline
                  preload="none"
                  poster={LINK_CODE_VIDEO.poster}
                  width={LINK_CODE_VIDEO.width}
                  height={LINK_CODE_VIDEO.height}
                  aria-label="Video: dónde encontrar tu código de vinculación de REPROCANN. 30 segundos, sin sonido, con los pasos escritos en pantalla."
                  className="mx-auto h-auto w-full max-w-[13rem] !rounded-[18px] border border-mist-line bg-forest shadow-[0_18px_40px_-28px_rgba(26,26,24,0.45)]"
                >
                  <source src={LINK_CODE_VIDEO.src} type="video/mp4" />
                </video>
                <div className="space-y-2">
                  <p>Si la asociación te lo pide, lo encontrás así:</p>
                  <ol className="list-decimal space-y-1.5 pl-5 marker:text-forest">
                    {LINK_CODE_STEPS.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </Topic>
          </TabbedCard>

          <TabbedCard tab="Tu membresía" fill bodyClassName="divide-y divide-mist-line">
            <Topic
              title="Pagar la cuota social"
              action={
                <Link href={FEE_PAGE} className={textLink}>
                  Ver cuánto es y cómo pagar <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                </Link>
              }
            >
              <p>Elegí si la pagás mes a mes, por trimestre o por semestre, y transferí a la cuenta de la asociación. Todo está en «Administración de cuota».</p>
            </Topic>
            <Topic title="Actualizar mis datos" action={<WhatsApp message={UPDATE_DATA_MESSAGE} label="Solicitar actualización por WhatsApp" />}>
              <p>Si cambió tu domicilio, tu email u otro dato, avisale a la asociación para que lo actualice.</p>
              {!CONTACT.whatsapp && demo && <DevTag className="dev-only">Vista local · falta el WhatsApp oficial (AD-003)</DevTag>}
            </Topic>
            <Topic
              title="Comprar productos"
              action={
                <Link href="/qr/productos" className={textLink}>
                  Ver los productos <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                </Link>
              }
            >
              <p>Todavía no se puede comprar desde tu cuenta: te vamos a avisar cuando esté disponible. Mientras tanto podés ver lo que elabora la asociación, con su análisis.</p>
            </Topic>
            {CONTACT.whatsapp && (
              <Topic title="Escribirle a la asociación" action={<WhatsApp message={MEMBER_QUESTION_MESSAGE} label="Escribir por WhatsApp" />}>
                <p>
                  Por cualquier otra consulta, escribinos al <span className="whitespace-nowrap text-forest">{CONTACT.whatsapp}</span>.
                </p>
              </Topic>
            )}
          </TabbedCard>
        </div>
      </div>
    </main>
  );
}
