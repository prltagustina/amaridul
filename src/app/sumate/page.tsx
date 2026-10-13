import { isDemoEnabled, readState } from "@/lib/demo";
import { ComingSoon } from "@/components/brand/coming-soon";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag } from "@/components/ui/display";
import { sumateIntro } from "@/demo/content";
import SumateForm from "./sumate-form";

const STATES = ["default", "loading", "error", "success"] as const;

export default async function SumatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The online preadmission is not live yet: nothing would be stored, so the public site shows a
  // notice instead of a form. The demo runs locally and on private previews only.
  if (!isDemoEnabled()) {
    return (
      <ComingSoon eyebrow="Sumate a la comunidad" title="Solicitud de preadmisión" tab="Preadmisión" tone="lilac" heading="La solicitud online está en preparación">
        <p>Muy pronto vas a poder completar tu preadmisión desde acá, en pocos minutos.</p>
        <p>Enviarla no implica la admisión: la decide la Comisión Directiva y te avisamos por email.</p>
      </ComingSoon>
    );
  }
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand
        compact
        tone="lilac"
        eyebrow="Sumate a la comunidad"
        title="Solicitud de preadmisión"
        description={
          <>
            {sumateIntro} <DevTag className="align-middle">Texto pendiente</DevTag>
          </>
        }
        tab="Preadmisión"
      />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="content-column">
          <SumateForm key={state} demoState={state} />
        </div>
        <DevStateBar path="/sumate" states={STATES} current={state} />
      </div>
    </main>
  );
}
