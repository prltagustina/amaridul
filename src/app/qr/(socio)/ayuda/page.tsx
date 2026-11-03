import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, MessageCircle, Upload } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { DevTag } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { localDemo } from "@/lib/features";
import { FEE_PAGE } from "@/lib/fee-payment";
import { REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";
import { officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { currentMember } from "@/server/member-session";

export const metadata: Metadata = { title: "Ayuda | Amarí Dul" };

/** A question and where it is answered. */
function Topic({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h3 className="text-lg font-title text-forest">{title}</h3>
      <div className="text-[0.9375rem] leading-relaxed text-text-muted">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

/** Help for members: how to start the REPROCANN procedure, how to send a credential, the fee, the data. */
export default async function AyudaPage() {
  await currentMember();
  const whatsapp = officialWhatsAppLink(UPDATE_DATA_MESSAGE);
  const demo = localDemo();
  return (
    <main>
      <PageBand compact eyebrow="Ayuda" title="Ayuda y contacto" description="Tus trámites, tu membresía y tu cuota, paso a paso." tab="Preguntas" back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column grid gap-x-6 gap-y-8 lg:grid-cols-2">
          <TabbedCard tab="REPROCANN" tone="sand" fill bodyClassName="divide-y divide-mist-line">
            <Topic
              title="Necesito iniciar mi trámite"
              action={
                <a
                  href={REPROCANN_OFFICIAL_SITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 !rounded-full border border-forest/60 px-5 text-[0.9375rem] font-medium !text-forest hover:bg-forest-soft"
                >
                  Ir al sitio oficial de REPROCANN <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              }
            >
              <p>El trámite se hace en el sitio oficial del Registro del Programa de Cannabis (REPROCANN), del Ministerio de Salud de la Nación.</p>
              {demo && <DevTag className="dev-only mt-2">Vista local · faltan el instructivo y el video de la asociación</DevTag>}
            </Topic>
            <Topic
              title="Ya tengo mi credencial: quiero cargarla"
              action={
                <LinkButton href="/qr/reprocann#cargar" variant="secondary">
                  <Upload aria-hidden className="size-4" strokeWidth={1.5} /> Cargar mi credencial
                </LinkButton>
              }
            >
              <p>Subí el PDF o una foto nítida. La asociación la revisa: hasta entonces queda «en revisión».</p>
            </Topic>
          </TabbedCard>

          <TabbedCard tab="Tu membresía" fill bodyClassName="divide-y divide-mist-line">
            <Topic
              title="Pagar la cuota social"
              action={
                <Link href={FEE_PAGE} className="inline-flex min-h-11 items-center gap-1.5 font-medium !text-forest underline-offset-4 hover:underline">
                  Ver los datos de pago <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                </Link>
              }
            >
              <p>Los datos de la cuenta de la asociación están en «Administración de cuota».</p>
            </Topic>
            <Topic
              title="Actualizar mis datos"
              action={
                whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 !rounded-full border border-forest/60 px-5 text-[0.9375rem] font-medium !text-forest hover:bg-forest-soft">
                    <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> Solicitar actualización por WhatsApp
                  </a>
                ) : (
                  demo && <DevTag className="dev-only">Vista local · falta el WhatsApp oficial (AD-003)</DevTag>
                )
              }
            >
              <p>Si cambió tu domicilio, tu email u otro dato, avisale a la asociación para que lo actualice.</p>
            </Topic>
            <Topic
              title="Comprar productos"
              action={
                <Link href="/qr/productos" className="inline-flex min-h-11 items-center gap-1.5 font-medium !text-forest underline-offset-4 hover:underline">
                  Ver los productos <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                </Link>
              }
            >
              <p>Todavía no se puede comprar desde tu cuenta: te vamos a avisar cuando esté disponible. Mientras tanto podés ver lo que elabora la asociación.</p>
            </Topic>
          </TabbedCard>
        </div>
      </div>
    </main>
  );
}
