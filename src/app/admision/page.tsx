import { ArrowRight, CalendarClock, Link2Off, MailWarning } from "lucide-react";
import { assertDemo, readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag, EmptyState } from "@/components/ui/display";
import { RuleList, StepCards, TabbedCard } from "@/components/ui/technical";

const STATES = ["default", "expired", "unauthorized"] as const;

export default async function AdmisionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand
        tone="lilac"
        eyebrow="Invitación personal"
        title="Solicitud formal de admisión"
        description="Te invitamos a completar la solicitud formal para asociarte a Amarí Dul. La admisión la decide la Comisión Directiva."
        tab={state === "default" ? "PRE-2026-0004" : "Invitación"}
      />
      <div className="page-gutter pt-8 pb-28 sm:pt-10">
        <div className="content-column space-y-8">
          {state === "default" && (
            <>
              <TabbedCard tab="1. Tu invitación" bodyClassName="space-y-5">
                <div className="flex items-start gap-3">
                  <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
                  <p className="text-body text-foreground">
                    Corresponde a la solicitud <strong className="font-medium">PRE-2026-0004</strong> y vence el{" "}
                    <strong className="font-medium">17/10/2026</strong>.
                  </p>
                </div>
                <p className="text-body text-text-muted">
                  Son 9 pasos. Podés guardar y continuar más tarde, desde este u otro dispositivo, abriendo el mismo link del email.
                </p>
                <DevTag>Demo · el token real viaja en el fragmento del link</DevTag>
                <LinkButton href="/admision/solicitud" editorial size="lg" full>
                  Continuar <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
                </LinkButton>
              </TabbedCard>

              <section aria-labelledby="circuito" className="space-y-4">
                <h2 id="circuito" className="text-xl font-medium tracking-tight text-forest">
                  Cómo sigue el proceso
                </h2>
                <StepCards
                  steps={[
                    { title: "Preadmisión", meta: "Completa", value: "Recibida", detail: "Ya revisamos tu solicitud inicial." },
                    { title: "Solicitud formal", meta: "Ahora", value: "9 pasos", detail: "Datos, categoría, estatuto y declaraciones." },
                    { title: "Comisión Directiva", meta: "Después", value: "Decisión", detail: "Te avisamos por email el resultado." },
                  ]}
                />
                <RuleList
                  items={[
                    "Si abrís la invitación en otro navegador, la sesión anterior se cierra y seguís con la misma solicitud.",
                  ]}
                />
              </section>
            </>
          )}
          {state === "expired" && (
            <EmptyState
              icon={<MailWarning aria-hidden className="size-10" strokeWidth={1.25} />}
              title="Tu invitación venció"
              description="Por seguridad, las invitaciones vencen. Escribinos y te enviamos una nueva para seguir con la misma solicitud."
              action={<LinkButton href="/qr#preguntas" variant="secondary">Ver contacto</LinkButton>}
            />
          )}
          {state === "unauthorized" && (
            <EmptyState
              icon={<Link2Off aria-hidden className="size-10" strokeWidth={1.25} />}
              title="Este link no es válido"
              description="Puede que ya se haya usado para enviar la solicitud o que esté incompleto. Abrí el link desde el último email que recibiste."
              action={<LinkButton href="/qr" variant="secondary">Volver</LinkButton>}
            />
          )}
        </div>
        <DevStateBar path="/admision" states={STATES} current={state} label="Invitación" />
      </div>
    </main>
  );
}
