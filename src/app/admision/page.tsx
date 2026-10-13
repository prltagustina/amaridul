import { ArrowRight, CalendarClock } from "lucide-react";
import { isDemoEnabled, readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag } from "@/components/ui/display";
import { ProcessTimeline, RuleList, TabbedCard } from "@/components/ui/technical";
import { ExpiredInvitation, InvalidInvitation, Invitation } from "./invitation";

const STATES = ["default", "expired", "unauthorized"] as const;

/** Shown without a link, locally and on previews only, so the screen can be reviewed. */
function DemoInvitation() {
  return (
    <TabbedCard tab="1. Tu invitación" bodyClassName="space-y-5">
      <div className="flex items-start gap-3">
        <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
        <p className="text-body text-foreground">
          Corresponde a la solicitud <strong className="font-medium">PRE-2026-0004</strong> y vence el <strong className="font-medium">17/10/2026</strong>.
        </p>
      </div>
      <p className="text-body text-text-muted">Completarla lleva unos 10 minutos. Lo que cargues se conserva en este navegador mientras no cierres la pestaña.</p>
      <DevTag>Demo · sin link de invitación</DevTag>
      <LinkButton href="/admision/solicitud" editorial size="lg" full>
        Continuar <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
      </LinkButton>
    </TabbedCard>
  );
}

function Process() {
  return (
    <section aria-labelledby="circuito" className="space-y-4">
      <h2 id="circuito" className="text-xl font-title text-forest">
        Cómo sigue el proceso
      </h2>
      <ProcessTimeline
        steps={[
          { title: "Preadmisión", status: "done", detail: "Recibimos y revisamos tu solicitud inicial." },
          { title: "Solicitud formal", status: "current", meta: "9 pasos", detail: "Datos, categoría, estatuto y declaraciones." },
          { title: "Comisión Directiva", status: "upcoming", detail: "Evalúa tu solicitud y te avisamos el resultado por email." },
        ]}
      />
      <RuleList items={["El link sirve hasta que envíes la solicitud o hasta que venza. Si te enviamos uno nuevo, el anterior deja de funcionar."]} />
    </section>
  );
}

export default async function AdmisionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  const demo = isDemoEnabled();
  return (
    <main>
      <PageBand
        compact
        tone="lilac"
        eyebrow="Invitación personal"
        title="Solicitud formal de admisión"
        description="Te invitamos a completar la solicitud formal para asociarte a Amarí Dul. La admisión la decide la Comisión Directiva."
        tab="Invitación"
      />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="content-column space-y-8">
          {state === "expired" && demo ? (
            <ExpiredInvitation />
          ) : state === "unauthorized" && demo ? (
            <InvalidInvitation />
          ) : (
            <Invitation
              demo={
                demo ? (
                  <>
                    <DemoInvitation />
                    <Process />
                  </>
                ) : null
              }
            >
              <Process />
            </Invitation>
          )}
        </div>
        <DevStateBar path="/admision" states={STATES} current={state} label="Invitación" />
      </div>
    </main>
  );
}
