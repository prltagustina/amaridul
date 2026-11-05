import { ArrowRight, ExternalLink } from "lucide-react";
import { AnchorButton, LinkButton } from "@/components/ui/button";
import { StepCards } from "@/components/ui/step-cards";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { LinkCodeVideo } from "@/components/reprocann/link-code-video";
import { REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";

// REPROCANN with the association, step by step, in the order Luci set: starting the procedure
// with the association begins with the link code (the video shows where it is, beside step 1).
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

/**
 * REPROCANN with the association: the video first and the three steps, then the way on. In
 * Comunidad, the WhatsApp question; on the page shared on its own (`join`), the way in to join
 * too, for whoever is not a member yet.
 */
export function ReprocannGuide({ whatsapp, bleed, join = false }: { whatsapp: string | null; /** The phone row's bleed: the container's gutter. */ bleed: string; join?: boolean }) {
  return (
    <>
      <StepCards
        label="Tu REPROCANN, paso a paso"
        bleed={bleed}
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
      {join ? (
        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-lila-200 pt-7">
          <p className="text-body text-foreground">¿Querés que Amarí Dul te acompañe en el trámite?</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/sumate" variant="join">
              Quiero asociarme <ArrowRight aria-hidden strokeWidth={1.5} />
            </LinkButton>
            {whatsapp && (
              <AnchorButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="secondary">
                <WhatsAppIcon /> Escribinos<span className="sr-only"> por WhatsApp</span>
              </AnchorButton>
            )}
          </div>
        </div>
      ) : (
        whatsapp && (
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-lila-200 pt-7">
            <p className="text-body text-foreground">¿Dudas con tu REPROCANN o con el ingreso?</p>
            <AnchorButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="primary">
              <WhatsAppIcon /> Escribinos<span className="sr-only"> por WhatsApp</span>
            </AnchorButton>
          </div>
        )
      )}
    </>
  );
}
