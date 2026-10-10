import { ArrowRight, CalendarClock, Link2Off, ListChecks, MailWarning } from "lucide-react";
import { assertDemo, readState } from "@/lib/demo";
import { LinkButton } from "@/components/ui/button";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, Card, DevTag, EmptyState, SectionHeader } from "@/components/ui/display";

const STATES = ["default", "expired", "unauthorized"] as const;

export default async function AdmisionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  return (
    <main className="page-gutter pt-10 pb-20 sm:pt-16">
      <div className="content-column space-y-8">
        {state === "default" && (
          <>
            <SectionHeader
              eyebrow="Invitación personal"
              title="Solicitud formal de admisión"
              description="Te invitamos a completar la solicitud formal para asociarte a Amarí Dul. La admisión la decide la Comisión Directiva."
            />
            <Card className="space-y-5">
              <div className="flex items-start gap-3">
                <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
                <p className="text-body text-foreground">
                  Esta invitación corresponde a la solicitud <strong className="font-medium">PRE-2026-0004</strong> y vence el{" "}
                  <strong className="font-medium">17/10/2026</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ListChecks aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
                <p className="text-body text-text-muted">
                  Son 9 pasos. Podés guardar y continuar más tarde, desde este u otro dispositivo, abriendo el mismo link del email.
                </p>
              </div>
              <Alert tone="info">
                Si abrís la invitación en otro navegador, la sesión anterior se cierra y seguís con la misma solicitud.
              </Alert>
              <DevTag>Demo · el token real viaja en el fragmento del link</DevTag>
              <LinkButton href="/admision/solicitud" editorial size="lg" full>
                Continuar <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
              </LinkButton>
            </Card>
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
    </main>
  );
}
