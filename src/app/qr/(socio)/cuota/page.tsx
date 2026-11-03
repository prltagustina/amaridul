import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { CopyValue } from "@/components/ui/copy-value";
import { DevTag } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { FEE_PAYMENT } from "@/lib/fee-payment";
import { localDemo } from "@/lib/features";
import { currentMember } from "@/server/member-session";

export const metadata: Metadata = { title: "Administración de cuota | Amarí Dul" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className="min-w-0 text-[0.9375rem] text-forest">{children}</dd>
    </div>
  );
}

/**
 * Where to pay the membership fee. Only the association's payment data: the system does not know
 * amounts, due dates or payments, so it never says how much is owed or whether someone is up to date.
 */
export default async function CuotaPage() {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  return (
    <main>
      <PageBand compact eyebrow="Cuota social" title="Administración de cuota" description="Los datos de la asociación para pagar tu cuota social." tab="Datos de pago" back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column max-w-3xl space-y-6">
          <TabbedCard tab="Cómo pagar" bodyClassName="space-y-5">
            <p className="text-[0.9375rem] leading-relaxed text-text-muted">Podés pagar con una transferencia a la cuenta de {FEE_PAYMENT.platform} de la asociación, usando el alias o el CVU.</p>
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
          <p className="text-small leading-relaxed text-text-muted">
            Por ahora el sistema no registra pagos ni muestra montos o vencimientos. Si tenés dudas sobre tu cuota, consultá con la asociación.
          </p>
        </div>
      </div>
    </main>
  );
}
