import { readState } from "@/lib/demo";
import { sumateIntro, sumateNote } from "@/demo/content";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag } from "@/components/ui/display";
import SumateForm from "./sumate-form";

const STATES = ["default", "loading", "error", "success"] as const;

/**
 * «Quiero asociarme»: the preadmission form, straight away. The three ways in (join, ask for access
 * as an existing member, sign in) are chosen in Comunidad, and going back returns there. Old links
 * to «/sumate#asociarme» land here the same.
 */
export default async function SumatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand compact tone="lilac" eyebrow="Quiero asociarme" title="Solicitud de preadmisión" description={sumateIntro} back={{ href: "/qr#comunidad", label: "Inicio" }} />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="content-column space-y-6">
          <p className="measure text-body text-text-muted">
            {sumateNote} <DevTag>Texto de introducción pendiente</DevTag>
          </p>
          <SumateForm key={state} demoState={state} />
        </div>
        <DevStateBar path="/sumate" states={STATES} current={state} />
      </div>
    </main>
  );
}
