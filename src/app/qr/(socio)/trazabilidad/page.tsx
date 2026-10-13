import type { Metadata } from "next";
import { readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import LotLookup, { type LookupState } from "./lot-lookup";

export const metadata: Metadata = { title: "Trazabilidad | Amarí Dul" };

const STATES: readonly LookupState[] = ["default", "lote", "invalido", "loading", "error", "sin-certificado", "certificado"];

export default async function TrazabilidadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand
        compact
        tone="green"
        eyebrow="Trazabilidad"
        title="Conocé tu producto"
        description="Lote, composición y análisis."
        tab="Consulta por lote"
        back={{ href: "/qr/mi-espacio", label: "Mi espacio" }}
        width="wide"
      />
      {/* Same column and left edge as Mi espacio, so switching sections never shifts the layout;
          the lookup keeps its reading width inside it. */}
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          <div className="max-w-2xl">
            <LotLookup key={state} initial={state} />
          </div>
        </div>
        <DevStateBar path="/qr/trazabilidad" states={STATES} current={state} label="Trazabilidad" />
      </div>
    </main>
  );
}
