import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, MessageCircle, Upload } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { AnchorButton, LinkButton } from "@/components/ui/button";
import { DevTag, Panel } from "@/components/ui/display";
import { HelpStrip, StepGuide } from "@/components/ui/guidance";
import { StepCards } from "@/components/ui/step-cards";
import { LinkCodeVideo } from "@/components/reprocann/link-code-video";
import { TOP_EDGE } from "@/components/ui/technical";
import { cn } from "@/lib/cn";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { CONTACT } from "@/lib/constants";
import { localDemo } from "@/lib/features";
import { FEE_PAGE } from "@/lib/fee-payment";
import { REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";
import { MEMBER_QUESTION_MESSAGE, officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { currentMember } from "@/server/member-session";

export const metadata: Metadata = { title: "Ayuda | Amarí Dul" };

const textLink = "inline-flex min-h-10 items-center gap-1.5 text-sm font-medium !text-forest !underline underline-offset-4";

/** A short question, its answer in a line, and where to do it. */
function Answer({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-text-muted">{children}</p>
      </div>
      {action && <div className="flex">{action}</div>}
    </li>
  );
}

/**
 * Help for members, by situation and step by step. REPROCANN first, in the order Luci set:
 * starting the procedure with the association begins with the link code (the video shows it and
 * the written steps say the same), then sending a credential one already has. Then the
 * membership and the fee, and how to reach the association.
 */
export default async function AyudaPage() {
  await currentMember();
  const demo = localDemo();
  const updateData = officialWhatsAppLink(UPDATE_DATA_MESSAGE);
  const question = officialWhatsAppLink(MEMBER_QUESTION_MESSAGE);
  return (
    <main>
      <PageBand compact eyebrow="Ayuda" title="Ayuda y contacto" description="Tus trámites, tu membresía y tu cuota." back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="portal-column">
          <div className="max-w-[52rem] space-y-8">
            <section id="codigo-de-vinculacion" aria-labelledby="codigo-de-vinculacion-title" className={cn("scroll-mt-6 !rounded-card border border-mist-line bg-white px-5 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-9", TOP_EDGE.magenta)}>
              <p className="flex items-center gap-2 text-eyebrow text-lila-800">
                <span aria-hidden className="size-1.5 shrink-0 !rounded-full bg-rosa-400" />
                Si vas a iniciar el trámite con la asociación
              </p>
              <h2 id="codigo-de-vinculacion-title" className="mt-2 text-h2 text-balance text-forest">
                Primer paso para iniciar tu trámite REPROCANN
              </h2>
              <p className="mt-3 measure text-[1.0625rem] leading-relaxed text-text-muted">Encontrá tu código de vinculación y agregalo en tu espacio.</p>
              <StepCards
                className="mt-8"
                aside={
                  <div className="mx-auto w-full max-w-[16rem] lg:relative lg:mx-0 lg:h-full lg:w-[22.5rem] lg:max-w-none">
                    <LinkCodeVideo className="lg:absolute lg:inset-0 lg:size-full lg:object-cover" />
                  </div>
                }
                layout="list"
                label="Cómo encontrar y enviar tu código de vinculación"
                bleed="-mx-5 px-5 scroll-px-5 sm:-mx-8 sm:px-8 sm:scroll-px-8"
                steps={[
                  {
                    title: "Entrá a REPROCANN",
                    detail: "Con tu cuenta de Mi Argentina, en el sitio oficial del Ministerio de Salud.",
                    action: (
                      <AnchorButton href={REPROCANN_OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" size="sm">
                        Ir al sitio oficial <ExternalLink aria-hidden strokeWidth={1.5} />
                        <span className="sr-only">(se abre en otra pestaña)</span>
                      </AnchorButton>
                    ),
                  },
                  { title: "Abrí tu Registro de paciente", detail: "Elegí el perfil «Paciente»." },
                  { title: "Copiá tu código de vinculación", detail: "Está en «Identificación»." },
                  {
                    title: "Agregalo en tu espacio",
                    detail: "Con ese código la asociación gestiona tu vinculación y te acompaña con el equipo médico.",
                    action: (
                      <LinkButton href="/qr/reprocann#vinculacion" size="sm">
                        Agregar código
                      </LinkButton>
                    ),
                  },
                ]}
              />
            </section>

            <Panel id="credencial" tone="magenta" eyebrow="Si ya tenés tu credencial" title="Cargala para que la revisemos">
              <StepGuide
                tone="magenta"
                label="Cómo cargar tu credencial"
                steps={[
                  {
                    title: "Cargá tu credencial",
                    detail: "El PDF o una foto nítida, desde tu espacio.",
                    action: (
                      <LinkButton href="/qr/reprocann#cargar" size="sm">
                        <Upload aria-hidden strokeWidth={1.5} /> Cargar credencial
                      </LinkButton>
                    ),
                  },
                  { title: "La asociación la revisa", detail: "Hasta entonces figura «En revisión»." },
                ]}
              />
            </Panel>

            <Panel id="membresia" tone="green" title="Tu membresía y tu cuota">
              <ul className="divide-y divide-mist-line">
                <Answer
                  title="Pagar la cuota social"
                  action={
                    <Link href={FEE_PAGE} className={textLink}>
                      Ver cómo pagar <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                    </Link>
                  }
                >
                  Elegí si la pagás por mes, trimestre o semestre, y transferí a la asociación.
                </Answer>
                <Answer
                  title="Comprar productos"
                  action={
                    <Link href="/qr/productos" className={textLink}>
                      Ver los productos <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                    </Link>
                  }
                >
                  Todavía no se puede desde tu cuenta: te vamos a avisar.
                </Answer>
                <Answer
                  title="Actualizar tus datos"
                  action={
                    updateData ? (
                      <AnchorButton href={updateData} target="_blank" rel="noopener noreferrer" size="sm" aria-label="Solicitar actualización de datos por WhatsApp" title="Solicitar actualización de datos por WhatsApp">
                        <WhatsAppIcon /> Actualizar datos
                      </AnchorButton>
                    ) : (
                      demo && <DevTag className="dev-only">Falta el WhatsApp oficial (AD-003)</DevTag>
                    )
                  }
                >
                  Si cambió tu domicilio, tu email u otro dato.
                </Answer>
              </ul>
            </Panel>

            {CONTACT.whatsapp && (
              <section aria-label="Contacto" className="overflow-hidden !rounded-card border border-mist-line">
                <HelpStrip
                  icon={<MessageCircle strokeWidth={1.5} />}
                  title="¿Otra consulta?"
                  className="sm:px-6"
                  action={
                    question && (
                      <AnchorButton href={question} target="_blank" rel="noopener noreferrer" size="sm">
                        <WhatsAppIcon /> Escribir por WhatsApp
                      </AnchorButton>
                    )
                  }
                >
                  Escribile a la asociación al <span className="whitespace-nowrap text-foreground">{CONTACT.whatsapp}</span>.
                </HelpStrip>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
