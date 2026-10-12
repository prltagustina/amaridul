import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, FileText, FlaskConical, PackagePlus, UserRound } from "lucide-react";
import { assertDemo, readState } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { DetailList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, Card, DevTag, LoadingBlock, StatusBadge } from "@/components/ui/display";
import { FolderTabs, TechBand } from "@/components/ui/technical";
import { LeafMark } from "@/components/brand/botanicals";
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
    <main className="page-gutter pt-10 pb-28 sm:pt-14">
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
            <div>
            <FolderTabs />
            <Card className="space-y-5 shadow-[0_18px_40px_-30px_rgba(70,53,119,0.5)]">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
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
            </div>

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

            <TechBand className="relative flex flex-col justify-between gap-5 overflow-hidden !rounded-card p-5 sm:flex-row sm:items-center sm:p-6 lg:col-span-2">
              <LeafMark className="pointer-events-none absolute -right-4 -bottom-6 w-36 text-white/10" />
              <div className="relative space-y-1.5">
                <h2 className="flex items-center gap-2.5 text-2xl font-medium tracking-tight">
                  <FlaskConical aria-hidden className={icon} strokeWidth={1.5} />
                  Trazabilidad
                </h2>
                <p className="text-white/85">Consultá el análisis de laboratorio de tu producto con el código del envase.</p>
              </div>
              <Link
                href="/qr/trazabilidad"
                className="relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 !rounded-full bg-white px-5 text-base font-medium !text-indigo transition-colors hover:bg-pink-soft"
              >
                Consultar lote <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </Link>
            </TechBand>

            <Card className="space-y-4">
              <ModuleTitle icon={<FileText aria-hidden className={icon} strokeWidth={1.5} />}>Documentación</ModuleTitle>
              <p className="!rounded-control border border-dashed border-border-strong/50 px-4 py-6 text-center text-small text-text-muted">
                Todavía no hay documentos en tu espacio.
              </p>
            </Card>

            <Card variant="outline" className="space-y-4 border-lavender-line bg-lavender">
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
