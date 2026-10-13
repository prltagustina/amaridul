import { assertDemo, readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { STEP_IDS, type StepId } from "./steps";
import AdmissionWizard from "./wizard";
import { PageBand } from "@/components/brand/page-band";

const STATES = ["default", "error", "loading"] as const;
const PASOS = [...STEP_IDS, "resumen", "enviada"] as const;

export default async function SolicitudPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  const paso = await readState(searchParams, PASOS, "paso");
  return (
    <main>
      <PageBand compact tone="lilac" eyebrow="ADM-2026-0003" title="Solicitud formal de admisión" tab="Paso a paso" />
      <div className="page-gutter pt-8 pb-28 sm:pt-10">
        <div className="content-column">
          <AdmissionWizard key={`${paso}-${state}`} initialStep={paso as StepId | "resumen" | "enviada"} demoState={state} />
        </div>
        <DevStateBar path="/admision/solicitud" states={STATES} current={state} keep={{ paso: paso === "A" ? undefined : paso }} />
      </div>
    </main>
  );
}
