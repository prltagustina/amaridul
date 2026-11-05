import { ArrowRight, ExternalLink } from "lucide-react";
import { AnchorButton, LinkButton, type ButtonVariant } from "@/components/ui/button";
import { StepCards } from "@/components/ui/step-cards";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { LinkCodeVideoFrame } from "@/components/reprocann/link-code-video";
import { REPROCANN_OFFICIAL_SITE } from "@/lib/reprocann-help";

type Step = { meta: string; title: string; detail: string; link: { href: string; label: string; external?: boolean; variant?: ButtonVariant } };

// REPROCANN with the association, in the order it really goes for whoever is not a member yet:
// the link code can be found any time (the video, beside step 1, shows where), but it is sent from
// the member's space, which comes with the admission. A member skips step 2.
const REPROCANN_STEPS: Step[] = [
  {
    meta: "Primer paso · sitio oficial",
    title: "Encontrá tu código de vinculación REPROCANN",
    detail: "Entrá al sitio oficial con tu cuenta de Mi Argentina: está en tu Registro de paciente, en «Identificación».",
    link: { href: REPROCANN_OFFICIAL_SITE, label: "Ir al sitio oficial", external: true },
  },
  {
    meta: "Si todavía no sos socio/a",
    title: "Asociate a Amarí Dul",
    detail: "Completá la preadmisión (5 minutos) y contanos en qué está tu REPROCANN. Después te invitamos a la solicitud formal y, con la admisión, activás tu cuenta.",
    link: { href: "/sumate", label: "Quiero asociarme", variant: "join" },
  },
  {
    meta: "Con tu cuenta de socio/a",
    title: "Cargalo en tu espacio",
    detail: "En REPROCANN, dentro de tu espacio. Con ese código la asociación hace tu vinculación y te acompaña en el trámite. Cuando tengas tu credencial, subila ahí para que la revisemos.",
    link: { href: "/qr/login", label: "Ingresar a mi espacio" },
  },
];

/**
 * REPROCANN with the association, step by step: the video first, the three steps (finding the
 * link code, joining, sending it from the member's space), then the WhatsApp question. The same
 * in Comunidad and on the page shared on its own.
 */
export function ReprocannGuide({ whatsapp, bleed }: { whatsapp: string | null; /** The phone row's bleed: the container's gutter. */ bleed: string }) {
  return (
    <>
      <StepCards
        label="Tu REPROCANN, paso a paso"
        bleed={bleed}
        aside={<LinkCodeVideoFrame className="lg:w-[14.5rem] xl:w-[13.5rem]" />}
        steps={REPROCANN_STEPS.map((step) => ({
          meta: step.meta,
          title: step.title,
          detail: step.detail,
          action: step.link.external ? (
            <AnchorButton href={step.link.href} target="_blank" rel="noopener noreferrer" size="sm">
              {step.link.label} <ExternalLink aria-hidden strokeWidth={1.5} />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </AnchorButton>
          ) : (
            <LinkButton href={step.link.href} variant={step.link.variant} size="sm">
              {step.link.label} <ArrowRight aria-hidden strokeWidth={1.5} />
            </LinkButton>
          ),
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
    </>
  );
}
