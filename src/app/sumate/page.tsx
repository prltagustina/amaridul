import { assertDemo, readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag, SectionHeader } from "@/components/ui/display";
import { sumateIntro } from "@/demo/content";
import SumateForm from "./sumate-form";

const STATES = ["default", "loading", "error", "success"] as const;

export default async function SumatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  const state = await readState(searchParams, STATES);
  return (
    <main className="page-gutter pt-10 pb-28 sm:pt-14">
      <div className="content-column space-y-10">
        {state !== "success" && (
          <SectionHeader
            eyebrow="Sumate a la comunidad"
            title="Solicitud de preadmisión a la comunidad Amarí Dul"
            description={
              <div className="space-y-2">
                <p>{sumateIntro}</p>
                <DevTag>Texto pendiente</DevTag>
              </div>
            }
          />
        )}
        <SumateForm key={state} demoState={state} />
      </div>
      <DevStateBar path="/sumate" states={STATES} current={state} />
    </main>
  );
}
