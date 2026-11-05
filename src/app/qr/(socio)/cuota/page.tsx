import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleHelp, ExternalLink } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { AnchorButton } from "@/components/ui/button";
import { DevTag, Panel, StatusBadge } from "@/components/ui/display";
import { HelpStrip } from "@/components/ui/guidance";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { FEE_PAYMENT, FEE_PLANS, monthlyFee, periodLabel, pesos } from "@/lib/fee-payment";
import { localDemo } from "@/lib/features";
import { FEE_QUESTION_MESSAGE, officialWhatsAppLink } from "@/lib/whatsapp";
import { getDb } from "@/server/db";
import { memberFeePlan } from "@/server/fee-plan";
import { currentMember } from "@/server/member-session";
import { FeeOverview } from "./payment-details";
import { PlanChooser } from "./plan-chooser";

export const metadata: Metadata = { title: "Administración de cuota | Amarí Dul" };

/**
 * The membership fee, as in Mi espacio: what the member pays and the association's account side by
 * side, in the first screen; how often they pay is chosen in a dialog. The system does not know
 * payments or due dates, so it never says how much someone owes or whether they are up to date.
 */
export default async function CuotaPage() {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const whatsapp = officialWhatsAppLink(FEE_QUESTION_MESSAGE);
  const chosen = member === "demo" ? null : (await memberFeePlan(await getDb(), member.id)).plan;
  const plan = FEE_PLANS.find((p) => p.id === chosen);
  const options = FEE_PLANS.map((p) => ({ id: p.id, label: p.label, amount: pesos(p.amount), period: periodLabel(p.months) }));
  return (
    <main>
      <PageBand compact eyebrow="Cuota social" title="Administración de cuota" description="Cuánto es, cómo elegir pagarla y los datos de la asociación." back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="portal-column">
          <div className="max-w-[52rem] space-y-8">
            <Panel
              id="tu-cuota"
              title="Tu cuota social"
              actions={plan ? undefined : <StatusBadge tone="warning">Sin elegir</StatusBadge>}
              bodyClassName="space-y-7"
            >
              <FeeOverview planId={chosen ?? null} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mist-line pt-5">
                <PlanChooser options={options} current={chosen ?? null} canSave={member !== "demo"} monthly={pesos(monthlyFee)} label={plan ? "Cambiar forma de pago" : "Elegir forma de pago"} />
                {FEE_PAYMENT.link && (
                  <AnchorButton href={FEE_PAYMENT.link} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
                    Pagar con {FEE_PAYMENT.platform} <ExternalLink aria-hidden strokeWidth={1.5} />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </AnchorButton>
                )}
                {!plan && <p className="text-sm text-text-muted">Mes a mes, por trimestre o por semestre.</p>}
              </div>
              {!FEE_PAYMENT.link && localDemo() && <DevTag className="dev-only">Vista local · falta el link de pago de la asociación</DevTag>}
            </Panel>
            <HelpStrip
              icon={<CircleHelp strokeWidth={1.5} />}
              title="¿Dudas con tu cuota?"
              className="sm:px-6"
              action={
                whatsapp && (
                  <AnchorButton href={whatsapp} target="_blank" rel="noopener noreferrer" size="sm">
                    <WhatsAppIcon /> Escribinos<span className="sr-only"> por WhatsApp</span>
                  </AnchorButton>
                )
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
