import type { Metadata } from "next";
import { ArrowRight, ClipboardList, FileText, FlaskConical, PackagePlus, UserRound } from "lucide-react";
import { assertDemo, readState } from "@/lib/demo";
import { Button, LinkButton } from "@/components/ui/button";
import { DetailList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, Card, DevTag, LoadingBlock, StatusBadge } from "@/components/ui/display";
import { demoMember } from "@/demo/fixtures";

export const metadata: Metadata = { title: "Mi espacio | Amarí Dul" };

const STATES = ["default", "loading", "error"] as const;

function ModuleTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-h2 text-brand">
      <span className="text-accent">{icon}</span>
      {children}
    </h2>
  );
}

export default async function MiEspacioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  const firstName = demoMember.name.split(" ")[0];
  const icon = "size-5";

  return (
    <main className="page-gutter pt-10 pb-24 sm:pt-14">
      <div className="nav-column space-y-8">
        <header className="space-y-2">
          <p className="text-eyebrow text-accent">Mi espacio</p>
          <h1 className="text-h1 text-brand">Hola, {firstName}</h1>
        </header>

        {state === "loading" && <LoadingBlock label="Cargando tu información…" lines={6} />}
        {state === "error" && (
          <Alert tone="error" title="No pudimos cargar tu información" live>
            Probá recargar la página en unos minutos.
          </Alert>
        )}

        {state === "default" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <ModuleTitle icon={<UserRound aria-hidden className={icon} strokeWidth={1.5} />}>Mi asociación</ModuleTitle>
                <StatusBadge tone="success">{demoMember.status}</StatusBadge>
              </div>
              <DetailList
                items={[
                  { label: "Número de socio", value: demoMember.number },
                  { label: "Categoría", value: demoMember.category },
                  { label: "Socio desde", value: demoMember.since },
                  { label: "Cuota social", value: <span>Al día <DevTag>Demo</DevTag></span> },
                ]}
              />
            </Card>

            <Card className="space-y-5">
              <ModuleTitle icon={<ClipboardList aria-hidden className={icon} strokeWidth={1.5} />}>Mis trámites</ModuleTitle>
              <ul className="divide-y divide-border">
                {demoMember.procedures.map((p) => (
                  <li key={p.label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="text-base">{p.label}</span>
                    <StatusBadge tone={p.tone}>{p.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="sunken" className="flex flex-col justify-between gap-5 lg:col-span-2 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <ModuleTitle icon={<FlaskConical aria-hidden className={icon} strokeWidth={1.5} />}>Trazabilidad</ModuleTitle>
                <p className="text-body text-foreground/85">Consultá el análisis de laboratorio de tu producto con el código del envase.</p>
              </div>
              <LinkButton href="/qr/trazabilidad" className="shrink-0">
                Consultar lote <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </LinkButton>
            </Card>

            <Card className="space-y-4">
              <ModuleTitle icon={<FileText aria-hidden className={icon} strokeWidth={1.5} />}>Documentación</ModuleTitle>
              <p className="!rounded-control border border-dashed border-border-strong/50 px-4 py-6 text-center text-small text-text-muted">
                Todavía no hay documentos en tu espacio.
              </p>
            </Card>

            <Card className="space-y-4">
              <ModuleTitle icon={<PackagePlus aria-hidden className={icon} strokeWidth={1.5} />}>Dispensas</ModuleTitle>
              <p className="text-small text-text-muted">Vas a poder solicitar dispensas cuando completes la etapa sanitaria.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" disabled aria-describedby="dispensa-proximamente">
                  Nueva dispensa
                </Button>
                <StatusBadge tone="info">
                  <span id="dispensa-proximamente">Próximamente</span>
                </StatusBadge>
              </div>
            </Card>
          </div>
        )}
      </div>
      <DevStateBar path="/qr/mi-espacio" states={STATES} current={state} label="Mi espacio" />
    </main>
  );
}
