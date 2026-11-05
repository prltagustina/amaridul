import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp, FileCheck2, IdCard, Link2, Package, Upload, UserRound, Wallet } from "lucide-react";
import { readState } from "@/lib/demo";
import { localDemo } from "@/lib/features";
import { credentialStatus, expiryLine, type CredentialStatus } from "@/lib/credential-validity";
import { cn } from "@/lib/cn";
import { dispensingEligibility, LINKAGE_TEXT, linkageState, type ConditionKey, type DispensingEligibility } from "@/lib/dispensing";
import { FEE_PLANS, monthlyFee, periodLabel, pesos } from "@/lib/fee-payment";
import { officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { PageBand } from "@/components/brand/page-band";
import { ProductPreview } from "@/components/products/product-card";
import { AnchorButton, LinkButton } from "@/components/ui/button";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, DevTag, LoadingBlock, StatusBadge, type Tone } from "@/components/ui/display";
import { FolderSwitcher } from "@/components/ui/folder-tabs";
import { HelpStrip } from "@/components/ui/guidance";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { demoMember } from "@/demo/fixtures";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { currentMember } from "@/server/member-session";
import { memberFeePlan } from "@/server/fee-plan";
import { memberReprocann } from "@/server/member-portal";
import { memberLinkage } from "@/server/reprocann-link";
import { listCatalog, type CatalogItem } from "@/server/products";
import { FeeOverview } from "../cuota/payment-details";
import { PlanChooser } from "../cuota/plan-chooser";

export const metadata: Metadata = { title: "Mi espacio | Amarí Dul" };

const STATES = ["default", "loading", "error"] as const;
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const NOT_ACTIVE = { suspendido: "suspendida", baja: "dada de baja" } as const;

/** A tab's title, with its state or action at the right. */
function PanelTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <h2 className="text-h3 text-forest">{children}</h2>
      {aside}
    </div>
  );
}

/** The actions of a tab, under its content. */
function PanelActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mist-line pt-5">{children}</div>;
}

/**
 * One of the three conditions as a card. Pending, in Dambar's lavender grey (trámites are its
 * world): the icon on a pink chip and the name in its indigo, then what comes next and its action.
 * Met, it reads as done: the green of success, a tick in place of the icon and the name in green,
 * so what is missing stands out on its own. The state is always in words too (never colour alone):
 * on a phone right under the name, beside the icon, with the text and the action across the card
 * below; in the row of three, at every card's foot, aligned across them.
 */
function ConditionCard({ c, icon, tone, children }: { c: DispensingEligibility["conditions"][number]; icon: React.ReactNode; tone: Tone; children?: React.ReactNode }) {
  // On a tinted card a badge of the same tint would vanish: white under it then.
  const state = (
    <StatusBadge tone={tone} compact className={c.met || tone === "info" || tone === "neutral" ? "!bg-white/80" : undefined}>
      {c.state}
    </StatusBadge>
  );
  return (
    <li className={cn("grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 !rounded-card p-4 sm:p-5 md:flex md:flex-col md:items-stretch md:gap-3", c.met ? "bg-hoja-100" : "bg-lila-100")}>
      <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center !rounded-full [&_svg]:size-5", c.met ? "bg-hoja-600 text-white" : "bg-rosa-100 text-lila-800")}>
        {c.met ? <Check strokeWidth={2.5} /> : icon}
      </span>
      <div className="min-w-0 space-y-1.5 md:space-y-0">
        <h3 className={cn("font-title text-[1.0625rem] leading-snug", c.met ? "text-forest" : "text-lila-800")}>{c.label}</h3>
        <div className="md:hidden">{state}</div>
      </div>
      {children && <div className="col-span-2 flex min-w-0 flex-col gap-3">{children}</div>}
      <div className="mt-auto hidden pt-1 md:block">{state}</div>
    </li>
  );
}

/** What comes next with the credential, in a line (its state is beside it), and the action when it is the member's. */
function credentialTask(status: CredentialStatus, managedByAssociation: boolean, reason: string | null): { detail: string; action: string | null } {
  switch (status.key) {
    case "none":
      return { detail: managedByAssociation ? "Cuando salga, la carga la asociación o la cargás vos." : "Cargala para que la asociación la revise.", action: "Cargar credencial" };
    case "pending":
      return { detail: "La asociación la está revisando.", action: null };
    case "observed":
      return { detail: reason ?? "La asociación la observó: hay que corregirla.", action: "Corregir credencial" };
    case "expired":
      return { detail: expiryLine(status.expiry), action: "Cargar la nueva" };
    case "expiring":
      return { detail: expiryLine(status.expiry), action: "Cargar la renovación" };
    case "verified":
      return { detail: expiryLine(status.expiry), action: null };
  }
}

// Only for reviewing the screens locally without a session: a fictitious member.
type CredentialSummary = { status: CredentialStatus; managedByAssociation: boolean; reason: string | null; documents: number; plan: string | null; linkage: { verified: boolean; sent: boolean } };
const DEMO: CredentialSummary = { status: credentialStatus({ reviewStatus: "pendiente", expiresOn: "2027-03-01" }), managedByAssociation: false, reason: null, documents: 1, plan: null, linkage: { verified: false, sent: false } };

// The preview of the catalog: up to three, in as many columns as there are.
const PREVIEW = 3;
const PREVIEW_COLUMNS = ["", "sm:grid-cols-[minmax(0,14rem)]", "sm:grid-cols-[repeat(2,minmax(0,14rem))]", "sm:grid-cols-3"] as const;

export default async function MiEspacioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  const m = await currentMember();

  // A suspended or withdrawn member signs in, but only sees that status.
  if (m !== "demo" && m.status !== "activo") {
    return (
      <main>
        <PageBand compact eyebrow="Mi espacio" title={`Hola, ${m.firstName}`} description="Tu membresía no está activa." width="wide" />
        <div className="page-gutter pt-8 pb-12">
          <div className="portal-column">
            <Alert tone="warning" title={`Tu membresía figura como ${NOT_ACTIVE[m.status]}`} className="max-w-2xl">
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
  const db = await getDb();
  // The catalog is the same for everyone (and the local demo shows the real one).
  const catalog: CatalogItem[] = await listCatalog(db);
  if (m !== "demo") {
    const reprocann = await memberReprocann(db, getKeyrings().field, m.id);
    credential = {
      status: reprocann?.status ?? credentialStatus(null),
      managedByAssociation: !!reprocann?.managedByAssociation,
      reason: reprocann?.credential?.memberMessage ?? null,
      documents: reprocann?.documents.filter((d) => !d.replaced && !d.withdrawn).length ?? 0,
      plan: (await memberFeePlan(db, m.id)).plan,
      linkage: await memberLinkage(db, getKeyrings().field, m.id).then((l) => ({ verified: l.verified, sent: !!l.masked })),
    };
  }
  const task = credentialTask(credential.status, credential.managedByAssociation, credential.reason);
  const linkage = linkageState({ verified: credential.linkage.verified, codeReceived: credential.linkage.sent });
  const eligibility = dispensingEligibility({ membership: "activo", credential: credential.status, linkage: { verified: credential.linkage.verified, codeReceived: credential.linkage.sent } }, "member");
  const condition = (key: ConditionKey) => eligibility.conditions.find((c) => c.key === key)!;
  const missing = eligibility.pending.length;
  const whatsapp = officialWhatsAppLink(UPDATE_DATA_MESSAGE);
  const demo = localDemo();
  const plan = FEE_PLANS.find((x) => x.id === credential.plan);
  const planOptions = FEE_PLANS.map((p) => ({ id: p.id, label: p.label, amount: pesos(p.amount), period: periodLabel(p.months) }));
  const preview = catalog.slice(0, PREVIEW);

  const membershipPanel = (
    <div className="space-y-7">
      <PanelTitle aside={<StatusBadge tone="success">Activa</StatusBadge>}>Tu membresía</PanelTitle>
      {/* The key data in Cormorant, as the fee's figure: the tabs speak the same language. */}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
        {[
          ["Número de socio", view.number],
          ["Categoría", view.category],
          ["Socio desde", view.since],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 space-y-1">
            <dt className="text-sm text-text-muted">{k}</dt>
            <dd className="font-display text-[1.75rem] leading-tight text-forest lining-nums [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      <PanelActions>
        {whatsapp ? (
          <AnchorButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="primary" size="sm" aria-label="Solicitar actualización de datos por WhatsApp" title="Solicitar actualización de datos por WhatsApp">
            <WhatsAppIcon /> Actualizar datos
          </AnchorButton>
        ) : (
          demo && (
            // Local preview only: how the action looks, without a number to write to.
            <span className="dev-only inline-flex items-center gap-2">
              <span aria-disabled className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 !rounded-full border border-forest/30 px-4 text-sm text-forest/60">
                <WhatsAppIcon className="size-4" /> Actualizar datos
              </span>
              <DevTag>Falta el número oficial (AD-003)</DevTag>
            </span>
          )
        )}
        <p className="text-sm text-text-muted">Si cambió tu domicilio, tu email u otro dato.</p>
      </PanelActions>
    </div>
  );

  const feePanel = (
    <div className="space-y-7">
      <PanelTitle aside={plan ? undefined : <StatusBadge tone="warning">Sin elegir</StatusBadge>}>Tu cuota social</PanelTitle>
      <FeeOverview planId={credential.plan} />
      <PanelActions>
        <PlanChooser options={planOptions} current={credential.plan} canSave={m !== "demo"} monthly={pesos(monthlyFee)} label={plan ? "Cambiar forma de pago" : "Elegir forma de pago"} />
        {!plan && <p className="text-sm text-text-muted">Mes a mes, por trimestre o por semestre.</p>}
      </PanelActions>
    </div>
  );

  const met = eligibility.conditions.filter((c) => c.met).length;
  const proceduresPanel = (
    <div className="space-y-7">
      {/* Where the member stands, as a figure like the other tabs' key data; then each condition. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-h3 text-forest">Habilitación a dispensa</h2>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
            <span className="font-display text-[2.5rem] leading-none text-forest lining-nums tabular-nums">{met} de 3</span>
            <span className="text-sm text-text-muted">condiciones cumplidas</span>
          </p>
        </div>
        {eligibility.eligible ? <StatusBadge tone="success">Completa</StatusBadge> : <StatusBadge tone="warning">{missing === 1 ? "Falta 1" : `Faltan ${missing}`}</StatusBadge>}
      </div>
      {/* In the order the procedure goes for whoever starts it with the association: the link code first. */}
      <ol aria-label="Las tres condiciones" className="grid gap-3 md:grid-cols-3">
        <ConditionCard c={condition("membership")} icon={<UserRound strokeWidth={1.75} />} tone="success" />
        <ConditionCard c={condition("linkage")} icon={<Link2 strokeWidth={1.75} />} tone={LINKAGE_TEXT[linkage].member.tone}>
          {linkage !== "verified" && (
            <p className="text-sm leading-relaxed text-text-muted">
              {LINKAGE_TEXT[linkage].member.help}
              {linkage === "missing" && (
                <>
                  {" "}
                  <Link href="/qr/ayuda#codigo-de-vinculacion" className="font-medium !text-lila-800 !underline underline-offset-4">
                    ¿Dónde lo encuentro?
                  </Link>
                </>
              )}
            </p>
          )}
          {linkage === "missing" && (
            <div>
              <LinkButton href="/qr/reprocann#vinculacion" size="sm">
                Agregar código
              </LinkButton>
            </div>
          )}
          {linkage === "received" && (
            <Link href="/qr/reprocann#vinculacion" className="inline-flex min-h-10 items-center self-start text-sm font-medium !text-lila-800 !underline underline-offset-4">
              Ver o corregir el código
            </Link>
          )}
        </ConditionCard>
        <ConditionCard c={condition("credential")} icon={<IdCard strokeWidth={1.75} />} tone={credential.status.tone}>
          <p className="text-sm leading-relaxed text-text-muted">{task.detail}</p>
          {task.action && (
            <div>
              <LinkButton href="/qr/reprocann#cargar" size="sm">
                <Upload aria-hidden strokeWidth={1.5} /> {task.action}
              </LinkButton>
            </div>
          )}
        </ConditionCard>
      </ol>
      <PanelActions>
        <LinkButton href="/qr/reprocann" variant="secondary" size="sm">
          Ver mi REPROCANN
        </LinkButton>
        <p className="text-sm text-text-muted">{credential.documents ? `${credential.documents} ${credential.documents === 1 ? "documento" : "documentos"} en tu legajo` : "Todavía no hay documentos tuyos"}</p>
      </PanelActions>
    </div>
  );

  const productsPanel = (
    <div className="space-y-7">
      <PanelTitle>Productos de la asociación</PanelTitle>
      {preview.length ? (
        <ul className={cn("grid gap-4 sm:gap-5", PREVIEW_COLUMNS[preview.length])}>
          {preview.map((p) => (
            <li key={p.id} className="min-w-0">
              <ProductPreview product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[1.0625rem] text-text-muted">Todavía no hay productos publicados.</p>
      )}
      <PanelActions>
        {preview.length > 0 && (
          <LinkButton href="/qr/productos" variant="secondary" size="sm">
            Ver las fichas
          </LinkButton>
        )}
      </PanelActions>
    </div>
  );

  // Help, apart under the sheet: always in reach, in the violet of orientation.
  const help = (
    <HelpStrip
      icon={<CircleHelp strokeWidth={1.5} />}
      title="¿Necesitás ayuda?"
      className="sm:px-7"
      action={
        <LinkButton href="/qr/ayuda" variant="secondary" size="sm">
          Ir a Ayuda <ArrowRight aria-hidden strokeWidth={1.5} />
        </LinkButton>
      }
    >
      El trámite REPROCANN, tu credencial y la cuota, paso a paso.
    </HelpStrip>
  );

  return (
    <main>
      <PageBand compact eyebrow="Mi espacio" title={`Hola, ${view.firstName}`} description={`Socio ${view.number} · categoría ${view.category}`} width="wide" />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="portal-column">
          {state === "loading" && <LoadingBlock label="Cargando tu información…" lines={6} className="max-w-2xl" />}
          {state === "error" && (
            <Alert tone="error" title="No pudimos cargar tu información" live className="max-w-2xl">
              Probá recargar la página en unos minutos.
            </Alert>
          )}

          {state === "default" && (
            <div className="max-w-[52rem] space-y-6">
            <FolderSwitcher
              label="Tu espacio de socio"
              tabs={[
                { id: "membresia", label: "Membresía", tone: "green", icon: <UserRound strokeWidth={1.75} />, content: membershipPanel },
                { id: "tramites", label: "Trámites", tone: "magenta", icon: <FileCheck2 strokeWidth={1.75} />, hint: eligibility.eligible ? undefined : "tiene algo pendiente", content: proceduresPanel },
                { id: "cuota", label: "Cuota", tone: "green", icon: <Wallet strokeWidth={1.75} />, hint: credential.plan ? undefined : "falta elegir la forma de pago", content: feePanel },
                { id: "productos", label: "Productos", tone: "green", icon: <Package strokeWidth={1.75} />, content: productsPanel },
              ]}
            />
            {help}
            </div>
          )}
        </div>
        <DevStateBar path="/qr/mi-espacio" states={STATES} current={state} label="Mi espacio" />
      </div>
    </main>
  );
}
