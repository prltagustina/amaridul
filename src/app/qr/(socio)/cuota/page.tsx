import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, MessageCircle } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { CopyValue } from "@/components/ui/copy-value";
import { DevTag } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { FEE_PAYMENT, FEE_PLANS, monthlyFee, periodLabel, pesos } from "@/lib/fee-payment";
import { localDemo } from "@/lib/features";
import { FEE_QUESTION_MESSAGE, officialWhatsAppLink } from "@/lib/whatsapp";
import { getDb } from "@/server/db";
import { memberFeePlan } from "@/server/fee-plan";
import { currentMember } from "@/server/member-session";
import { PlanChooser } from "./plan-chooser";

export const metadata: Metadata = { title: "Administración de cuota | Amarí Dul" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-4">
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] text-forest">{children}</dd>
    </div>
  );
}

/**
 * The membership fee: what it costs, how often each member may choose to pay, and the
 * association's payment data. The system does not know payments or due dates, so it never says
 * how much someone owes or whether they are up to date.
 */
export default async function CuotaPage() {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const whatsapp = officialWhatsAppLink(FEE_QUESTION_MESSAGE);
  const chosen = member === "demo" ? null : await memberFeePlan(await getDb(), member.id);
  const options = FEE_PLANS.map((p) => ({ id: p.id, label: p.label, amount: pesos(p.amount), period: periodLabel(p.months) }));
  return (
    <main>
      <PageBand compact eyebrow="Cuota social" title="Administración de cuota" description="Cuánto es, cómo elegir pagarla y los datos de la asociación." tab="Cuota" back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          <div className="max-w-xl space-y-6">
            <TabbedCard tab="Tu forma de pago" bodyClassName="space-y-4">
              <p className="text-[0.9375rem] leading-relaxed text-text-muted">
                La cuota social es de <strong className="font-medium text-forest">{pesos(monthlyFee)} por mes</strong>. Elegí si la pagás mes a mes, por trimestre o por semestre.
              </p>
              <PlanChooser options={options} current={chosen?.plan ?? null} canSave={member !== "demo"} />
            </TabbedCard>

            <TabbedCard tab="Cómo pagar" bodyClassName="space-y-5">
              <p className="text-[0.9375rem] leading-relaxed text-text-muted">Transferí a la cuenta de {FEE_PAYMENT.platform} de la asociación, con el alias o el CVU.</p>
              <dl className="divide-y divide-mist-line">
                <Row label="Titular">{FEE_PAYMENT.holder}</Row>
                <Row label="Plataforma">{FEE_PAYMENT.platform}</Row>
                <Row label="Alias">
                  <CopyValue label="alias" value={FEE_PAYMENT.alias} />
                </Row>
                <Row label="CVU">
                  <CopyValue label="CVU" value={FEE_PAYMENT.cvu} />
                </Row>
                <Row label="CUIT">
                  <span className="tabular-nums">{FEE_PAYMENT.cuit}</span>
                </Row>
              </dl>
              {FEE_PAYMENT.link ? (
                <a
                  href={FEE_PAYMENT.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--forest)_0%,var(--forest-hover)_100%)] px-6 font-medium !text-white"
                >
                  Pagar con {FEE_PAYMENT.platform} <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              ) : (
                localDemo() && <DevTag className="dev-only">Vista local · falta el link de pago de la asociación</DevTag>
              )}
            </TabbedCard>

            <div className="space-y-3">
              <p className="text-small leading-relaxed text-text-muted">Por ahora el sistema no registra pagos ni vencimientos. Si tenés dudas sobre tu cuota, consultá con la asociación.</p>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 !rounded-full border border-forest/60 px-5 text-[0.9375rem] font-medium !text-forest hover:bg-forest-soft">
                  <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> Consultar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
