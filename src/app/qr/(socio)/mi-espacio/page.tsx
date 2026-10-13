import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { DetailList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, DevTag, LoadingBlock, StatusBadge } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { demoMember } from "@/demo/fixtures";

export const metadata: Metadata = { title: "Mi espacio | Amarí Dul" };

const STATES = ["default", "loading", "error"] as const;

/** Bottom strip of a dashboard card: always aligned across the row. */
function CardFoot({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto border-t border-mist-line pt-4">{children}</div>;
}

export default async function MiEspacioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  const firstName = demoMember.name.split(" ")[0];
  const done = demoMember.procedures.filter((p) => p.tone === "success").length;
  const total = demoMember.procedures.length;

  return (
    <main>
      <PageBand compact eyebrow="Mi espacio" title={`Hola, ${firstName}`} description={`Socio ${demoMember.number} · categoría ${demoMember.category}`} tab="Resumen" width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          {state === "loading" && <LoadingBlock label="Cargando tu información…" lines={6} />}
          {state === "error" && (
            <Alert tone="error" title="No pudimos cargar tu información" live>
              Probá recargar la página en unos minutos.
            </Alert>
          )}

          {state === "default" && (
            <div className="grid items-stretch gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              <TabbedCard tab="Asociación" fill bodyClassName="gap-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-title text-forest">Tu membresía</p>
                  <StatusBadge tone="success">{demoMember.status}</StatusBadge>
                </div>
                <DetailList
                  items={[
                    { label: "Número", value: demoMember.number },
                    { label: "Categoría", value: demoMember.category },
                    { label: "Socio desde", value: demoMember.since },
                    { label: "Cuota", value: <span>Al día <DevTag>Demo</DevTag></span> },
                  ]}
                />
                <CardFoot>
                  <p className="text-small text-text-muted">Si cambió algún dato, avisanos para actualizarlo.</p>
                </CardFoot>
              </TabbedCard>

              <TabbedCard tab="Trámites" tone="sand" fill bodyClassName="gap-5">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xl font-title text-arena-800">
                      {done} de {total} completos
                    </p>
                  </div>
                  <div aria-hidden className="h-1.5 overflow-hidden !rounded-full bg-arena-100">
                    <div className="h-full !rounded-full bg-[linear-gradient(90deg,var(--arena-700),var(--arena-500))]" style={{ width: `${(done / total) * 100}%` }} />
                  </div>
                </div>
                <ul className="divide-y divide-mist-line">
                  {demoMember.procedures.map((p) => (
                    <li key={p.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                      <span className="text-[0.9375rem]">{p.label}</span>
                      <StatusBadge tone={p.tone}>{p.status}</StatusBadge>
                    </li>
                  ))}
                </ul>
                <CardFoot>
                  <dl className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-small">
                    <dt className="text-text-muted">Documentación</dt>
                    <dd className="text-arena-800">Sin documentos</dd>
                    <dt className="text-text-muted">Dispensas</dt>
                    <dd>
                      <StatusBadge tone="warning">Próximamente</StatusBadge>
                    </dd>
                  </dl>
                </CardFoot>
              </TabbedCard>

              <TabbedCard tab="Trazabilidad" fill className="md:col-span-2 lg:col-span-1" bodyClassName="gap-5">
                <p className="text-xl font-title text-forest">Conocé tu producto</p>
                <p className="text-[0.9375rem] leading-relaxed text-text-muted">Con el código del envase ves el lote, su composición y el análisis de laboratorio.</p>
                <ol className="space-y-2.5 text-[0.9375rem] text-forest">
                  {["Elegí el producto", "Escribí el código del envase", "Mirá el análisis y el certificado"].map((t, i) => (
                    <li key={t} className="flex items-center gap-3">
                      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center !rounded-[8px] bg-forest-soft text-sm font-medium">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
                <CardFoot>
                  <Link
                    href="/qr/trazabilidad"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-600))] px-6 text-base font-medium !text-white shadow-[0_10px_24px_-14px_rgb(29_52_30/0.7)]"
                  >
                    Consultar lote <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                  </Link>
                </CardFoot>
              </TabbedCard>
            </div>
          )}
        </div>
        <DevStateBar path="/qr/mi-espacio" states={STATES} current={state} label="Mi espacio" />
      </div>
    </main>
  );
}
