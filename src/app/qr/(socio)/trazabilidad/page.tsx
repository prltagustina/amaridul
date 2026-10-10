import type { Metadata } from "next";
import { assertDemo, readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { SectionHeader } from "@/components/ui/display";
import LotLookup, { type LookupState } from "./lot-lookup";

export const metadata: Metadata = { title: "Trazabilidad | Amarí Dul" };

const STATES: readonly LookupState[] = ["default", "lote", "invalido", "loading", "error", "sin-certificado", "certificado"];

export default async function TrazabilidadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  return (
    <main className="page-gutter pt-10 pb-24 sm:pt-14">
      <div className="content-column space-y-8">
        <SectionHeader
          eyebrow="Trazabilidad"
          title="Conocé el origen de tu producto"
          description="Elegí el producto y escribí el código impreso en el envase para ver los datos del lote y su análisis de laboratorio."
          rule
        />
        <LotLookup key={state} initial={state} />
      </div>
      <DevStateBar path="/qr/trazabilidad" states={STATES} current={state} label="Trazabilidad" />
    </main>
  );
}
