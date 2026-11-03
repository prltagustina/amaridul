import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, MessageCircle, Upload } from "lucide-react";
import { readState } from "@/lib/demo";
import { localDemo } from "@/lib/features";
import { credentialStatus, expiryLine, type CredentialStatus } from "@/lib/credential-validity";
import { FEE_PAGE, FEE_PAYMENT } from "@/lib/fee-payment";
import { officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { DetailList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, DevTag, LoadingBlock, StatusBadge } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { demoMember } from "@/demo/fixtures";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { currentMember } from "@/server/member-session";
import { memberReprocann } from "@/server/member-portal";
import { listCatalog } from "@/server/products";

export const metadata: Metadata = { title: "Mi espacio | Amarí Dul" };

const STATES = ["default", "loading", "error"] as const;
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const NOT_ACTIVE = { suspendido: "suspendida", baja: "dada de baja" } as const;

/** Bottom strip of a dashboard card: always aligned across the row. */
function CardFoot({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto border-t border-mist-line pt-4">{children}</div>;
}

/** What the member should do about their credential, in one sentence and one action. */
function credentialTask(status: CredentialStatus, managedByAssociation: boolean, reason: string | null) {
  switch (status.key) {
    case "none":
      return managedByAssociation
        ? { headline: "La asociación gestiona tu REPROCANN", detail: "Si ya tenés tu credencial, podés cargarla. Es opcional.", action: "Cargar mi credencial", upload: true }
        : { headline: "Si ya tenés tu credencial REPROCANN, cargala", detail: "Todavía no hay una credencial tuya en el sistema.", action: "Cargar mi credencial", upload: true };
    case "pending":
      return { headline: "Tu credencial está en revisión", detail: expiryLine(status.expiry), action: "Ver mi credencial", upload: false };
    case "observed":
      return { headline: "Hay que corregir tu credencial", detail: reason ?? "La asociación la observó.", action: "Corregir y reemplazar", upload: true };
    case "expired":
      return { headline: "Tu credencial venció", detail: expiryLine(status.expiry), action: "Cargar la credencial nueva", upload: true };
    case "expiring":
      return { headline: "Tu credencial vence pronto", detail: expiryLine(status.expiry), action: "Cargar la renovación", upload: true };
    case "verified":
      return { headline: "Todo en orden por ahora", detail: expiryLine(status.expiry), action: "Ver mi credencial", upload: false };
  }
}

// Only for reviewing the screens locally without a session: a fictitious member.
type CredentialSummary = { status: CredentialStatus; managedByAssociation: boolean; reason: string | null; documents: number; products: number };
const DEMO: CredentialSummary = { status: credentialStatus({ reviewStatus: "pendiente", expiresOn: "2027-03-01" }), managedByAssociation: false, reason: null, documents: 1, products: 2 };

export default async function MiEspacioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  const m = await currentMember();

  // A suspended or withdrawn member signs in, but only sees that status.
  if (m !== "demo" && m.status !== "activo") {
    return (
      <main>
        <PageBand compact eyebrow="Mi espacio" title={`Hola, ${m.firstName}`} description="Tu membresía no está activa." tab="Resumen" width="wide" />
        <div className="page-gutter pt-6 pb-8">
          <div className="admin-column max-w-2xl">
            <Alert tone="warning" title={`Tu membresía figura como ${NOT_ACTIVE[m.status]}`}>
              Mientras tanto no podés usar tu espacio de socio. Para saber más o regularizarla, comunicate con la asociación.
            </Alert>
          </div>
        </div>
      </main>
    );
  }

  const view =
    m === "demo"
      ? { firstName: demoMember.name.split(" ")[0], number: demoMember.number, category: demoMember.category, since: demoMember.since }
      : { firstName: m.firstName, number: m.memberNumber ?? "A confirmar", category: m.categoryLabel ?? "A confirmar", since: m.since ? day(m.since) : "—" };
  let credential = DEMO;
  if (m !== "demo") {
    const db = await getDb();
    const reprocann = await memberReprocann(db, getKeyrings().field, m.id);
    credential = {
      status: reprocann?.status ?? credentialStatus(null),
      managedByAssociation: !!reprocann?.managedByAssociation,
      reason: reprocann?.credential?.memberMessage ?? null,
      documents: reprocann?.documents.filter((d) => !d.replaced).length ?? 0,
      products: (await listCatalog(db)).length,
    };
  }
  const task = credentialTask(credential.status, credential.managedByAssociation, credential.reason);
  const whatsapp = officialWhatsAppLink(UPDATE_DATA_MESSAGE);
  const demo = localDemo();

  return (
    <main>
      <PageBand compact eyebrow="Mi espacio" title={`Hola, ${view.firstName}`} description={`Socio ${view.number} · categoría ${view.category}`} tab="Resumen" width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          {state === "loading" && <LoadingBlock label="Cargando tu información…" lines={6} />}
          {state === "error" && (
            <Alert tone="error" title="No pudimos cargar tu información" live>
              Probá recargar la página en unos minutos.
            </Alert>
          )}

          {state === "default" && (
            <div className="grid items-stretch gap-x-6 gap-y-8 md:grid-cols-2">
              <TabbedCard tab="Trámites" tone="sand" fill bodyClassName="gap-5">
                <p className="text-xl font-title text-arena-800">{task.headline}</p>
                <ul className="divide-y divide-mist-line">
                  <li className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <span className="text-[0.9375rem]">Alta como socio/a</span>
                    <StatusBadge tone="success">Completa</StatusBadge>
                  </li>
                  <li className="space-y-1 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.9375rem]">Credencial REPROCANN</span>
                      <StatusBadge tone={credential.status.tone}>{credential.status.label}</StatusBadge>
                    </div>
                    <p className="text-small text-text-muted">{task.detail}</p>
                  </li>
                </ul>
                <CardFoot>
                  <div className="space-y-4">
                    <LinkButton href="/qr/reprocann" variant={task.upload ? "primary" : "secondary"} full>
                      {task.upload && <Upload aria-hidden className="size-4" strokeWidth={1.5} />} {task.action}
                    </LinkButton>
                    <dl className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 text-small">
                      <dt className="text-text-muted">Documentación</dt>
                      <dd className="text-arena-800">{credential.documents ? `${credential.documents} ${credential.documents === 1 ? "documento" : "documentos"}` : "Sin documentos"}</dd>
                    </dl>
                  </div>
                </CardFoot>
              </TabbedCard>

              <TabbedCard tab="Asociación" fill bodyClassName="gap-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-title text-forest">Tu membresía</p>
                  <StatusBadge tone="success">Activa</StatusBadge>
                </div>
                <DetailList
                  items={[
                    { label: "Número", value: view.number },
                    { label: "Categoría", value: view.category },
                    { label: "Socio desde", value: view.since },
                  ]}
                />
                <CardFoot>
                  <div className="space-y-3">
                    <p className="text-small text-text-muted">Si cambió algún dato, avisanos para actualizarlo.</p>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-full border border-forest/60 px-5 text-[0.9375rem] font-medium !text-forest hover:bg-forest-soft"
                      >
                        <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> Solicitar actualización por WhatsApp
                      </a>
                    ) : (
                      demo && (
                        // Local preview only: how the action will look, without a number to write to.
                        <div className="dev-only space-y-2">
                          <span aria-disabled className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 !rounded-full border border-forest/40 px-5 text-[0.9375rem] font-medium text-forest/60">
                            <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} /> Solicitar actualización por WhatsApp
                          </span>
                          <DevTag>Vista previa local · falta el número oficial (AD-003)</DevTag>
                        </div>
                      )
                    )}
                  </div>
                </CardFoot>
              </TabbedCard>

              <TabbedCard tab="Productos" fill bodyClassName="gap-5">
                <p className="text-xl font-title text-forest">Productos de la asociación</p>
                <p className="text-[0.9375rem] leading-relaxed text-text-muted">
                  {credential.products
                    ? `Podés consultar ${credential.products === 1 ? "el producto que elabora" : `los ${credential.products} productos que elabora`} Amarí Dul, con su variedad y su cultivo.`
                    : "Todavía no hay productos publicados."}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-small text-text-muted">
                  <StatusBadge tone="warning">Próximamente</StatusBadge> Comprar desde tu cuenta
                </div>
                <CardFoot>
                  <LinkButton href="/qr/productos" variant="secondary" full>
                    Ver productos
                  </LinkButton>
                </CardFoot>
              </TabbedCard>

              <TabbedCard tab="Cuota" fill bodyClassName="gap-5">
                <p className="text-xl font-title text-forest">Administración de cuota</p>
                <p className="text-[0.9375rem] leading-relaxed text-text-muted">Pagás la cuota social con una transferencia a la cuenta de {FEE_PAYMENT.platform} de la asociación.</p>
                <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-[0.9375rem]">
                  <dt className="text-small text-text-muted">Alias</dt>
                  <dd className="font-mono tracking-wide break-all text-forest">{FEE_PAYMENT.alias}</dd>
                  <dt className="text-small text-text-muted">Titular</dt>
                  <dd className="text-forest">{FEE_PAYMENT.holder}</dd>
                </dl>
                <CardFoot>
                  <LinkButton href={FEE_PAGE} variant="secondary" full>
                    Ver datos de pago
                  </LinkButton>
                </CardFoot>
              </TabbedCard>
            </div>
          )}

          {state === "default" && (
            <aside aria-labelledby="ayuda" className="mt-8 flex flex-col gap-4 !rounded-card border border-mist-line bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center !rounded-full bg-forest-soft text-forest">
                  <LifeBuoy className="size-5" strokeWidth={1.5} />
                </span>
                <div className="space-y-1">
                  <h2 id="ayuda" className="text-lg font-title text-forest">
                    ¿Necesitás ayuda?
                  </h2>
                  <p className="text-small text-text-muted">Cómo iniciar el trámite REPROCANN, cargar tu credencial, pagar la cuota o actualizar tus datos.</p>
                </div>
              </div>
              <Link href="/qr/ayuda" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start font-medium !text-forest underline-offset-4 hover:underline sm:self-center">
                Ir a Ayuda <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </Link>
            </aside>
          )}
        </div>
        <DevStateBar path="/qr/mi-espacio" states={STATES} current={state} label="Mi espacio" />
      </div>
    </main>
  );
}
