import type { Metadata } from "next";
import { assertDemo, readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import LotLookup, { type LookupState } from "./lot-lookup";

export const metadata: Metadata = { title: "Trazabilidad | Amarí Dul" };

const STATES: readonly LookupState[] = ["default", "lote", "invalido", "loading", "error", "sin-certificado", "certificado"];

export default async function TrazabilidadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand
        compact
        tone="lilac"
        eyebrow="Trazabilidad"
        title="Conocé tu producto"
        description="Lote, composición y análisis de laboratorio."
        tab="Consulta por lote"
        width="wide"
      />
      <div className="page-gutter pt-8 pb-20">
        <div className="admin-column">
          <LotLookup key={state} initial={state} />
        </div>
        <DevStateBar path="/qr/trazabilidad" states={STATES} current={state} label="Trazabilidad" />
      </div>
    </main>
  );
}
