import { readState } from "@/lib/demo";
import { PageBand } from "@/components/brand/page-band";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import SumateForm from "./sumate-form";
import SumateEntry from "./sumate-entry";

const STATES = ["default", "loading", "error", "success"] as const;

export default async function SumatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <main>
      <PageBand
        compact
        tone="lilac"
        eyebrow="Sumate a la comunidad"
        title="Sumate a la comunidad"
        description="Elegí tu situación para continuar."
        tab="Sumate"
        back={{ href: "/qr", label: "Inicio" }}
      />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="content-column">
          {/* Local demo states (?estado=…) show the preadmission form directly. */}
          {state === "default" ? <SumateEntry /> : <SumateForm key={state} demoState={state} />}
        </div>
        <DevStateBar path="/sumate" states={STATES} current={state} />
      </div>
    </main>
  );
}
