import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readState } from "@/lib/demo";
import { localDemo } from "@/lib/features";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert } from "@/components/ui/display";
import { currentMember } from "@/server/member-session";
import LotLookup, { type LookupState } from "../lot-lookup";

export const metadata: Metadata = { title: "Demostración · Trazabilidad | Amarí Dul" };

const STATES: readonly LookupState[] = ["default", "lote", "invalido", "loading", "error", "sin-certificado", "certificado"];

/** The lot lookup and lot sheet with fictitious data, to review the design. Development machine only. */
export default async function TrazabilidadDemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!localDemo()) notFound();
  await currentMember();
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand compact tone="green" eyebrow="Trazabilidad · demostración" title="Conocé tu producto" description="Oculta para socios: solo esta demostración local, con datos de ejemplo." tab="Consulta por lote" back={{ href: "/dev/recorrido", label: "Recorrido local" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          <div className="max-w-2xl space-y-6">
            <Alert tone="warning" title="Demostración local con datos ficticios">
              Solo se ve en la computadora de desarrollo. Los lotes, códigos y análisis son de ejemplo y no corresponden a ningún producto ni socio.
            </Alert>
            <LotLookup key={state} initial={state} />
          </div>
        </div>
        <DevStateBar path="/qr/trazabilidad/demo" states={STATES} current={state} label="Trazabilidad (demo)" />
      </div>
    </main>
  );
}
