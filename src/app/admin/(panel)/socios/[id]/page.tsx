import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getMember } from "@/server/members";
import { DetailList } from "@/components/ui/data-list";
import { Card, StatusBadge } from "@/components/ui/display";
import { memberStatus } from "../../../status";
import { AdminPageHeader } from "../../../ui";
import { DOCUMENT_KIND, getReprocann, INFO_SOURCE, LINKAGE_STATUS, MANAGEMENT_SOURCE, PERMIT_STATUS, REVIEW_STATUS, labelIn } from "@/server/reprocann";
import ResendActivation from "./resend-activation";
import ReprocannPanel, { type ReprocannView } from "./reprocann-panel";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const DIMENSIONS: Record<string, { name: string; list: readonly { value: string; label: string }[] }> = {
  permitStatus: { name: "Permiso", list: PERMIT_STATUS },
  managementSource: { name: "Quién gestiona", list: MANAGEMENT_SOURCE },
  linkageStatus: { name: "Vinculación", list: LINKAGE_STATUS },
  responsibleName: { name: "Responsable", list: [] },
};

/** Audit entries of the case, in words. */
function describe(action: string, m: Record<string, string | number | boolean | null> | null): string {
  if (action === "reprocann.case_opened") return "Se abrió el trámite.";
  if (action === "reprocann.document_added") return `Documento registrado: ${labelIn(DOCUMENT_KIND, String(m?.kind))} (${labelIn(INFO_SOURCE, String(m?.source))}).`;
  if (action === "reprocann.document_reviewed") return `Documento revisado: ${labelIn(REVIEW_STATUS, String(m?.reviewStatus_before))} → ${labelIn(REVIEW_STATUS, String(m?.reviewStatus_after))}.`;
  if (action === "reprocann.case_updated")
    return Object.entries(DIMENSIONS)
      .filter(([k]) => m && `${k}_after` in m)
      .map(([k, d]) => {
        const show = (v: unknown) => (d.list.length ? labelIn(d.list, v as string) : (v as string) || "—");
        return `${d.name}: ${show(m![`${k}_before`])} → ${show(m![`${k}_after`])}`;
      })
      .join(" · ");
  return action;
}

export default async function SocioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const m = await getMember(db, getKeyrings(), id);
  if (!m) notFound();
  const rep = await getReprocann(db, getKeyrings().field, m.id);
  const reprocann: ReprocannView = {
    case: rep ? { permitStatus: rep.case.permitStatus, managementSource: rep.case.managementSource, responsibleName: rep.case.responsibleName ?? "", linkageStatus: rep.case.linkageStatus } : null,
    documents: (rep?.documents ?? []).map((d) => ({ id: d.id, kind: d.kind, permitIdentifier: d.permitIdentifier, issuedOn: d.issuedOn, expiresOn: d.expiresOn, source: d.source, reviewStatus: d.reviewStatus, verifiedOn: d.verifiedOn, notes: d.notes, createdAt: d.createdAt.toISOString() })),
    history: (rep?.history ?? []).map((h) => ({ at: stamp.format(h.at), actor: h.actor ?? "Sistema", text: describe(h.action, h.metadata) })),
  };
  const pending = m.accountStatus === "pending_activation";

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/socios", label: "Socios" }} eyebrow={`Socio ${m.memberNumber}`} title={m.name} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="space-y-5">
          <h2 className="text-h3">Datos asociativos</h2>
          <DetailList
            items={[
              { label: "Número de socio", value: m.memberNumber },
              { label: "Categoría", value: m.categoryLabel },
              { label: "Socio desde", value: m.since ? m.since.split("-").reverse().join("/") : "No disponible" },
              { label: "DNI", value: m.dniMasked },
              { label: "Email", value: m.email ?? "—" },
              { label: "Teléfono", value: m.phone ?? "—" },
              m.admissionId
                ? {
                    label: "Admisión",
                    value: (
                      <Link href={`/admin/admisiones/${m.admissionId}`} className="!text-forest underline underline-offset-2">
                        {m.admissionReference}
                      </Link>
                    ),
                  }
                : { label: "Origen", value: "Socio existente: ingresó antes del sistema" },
              ...(m.minutesReference ? [{ label: "Acta", value: m.minutesReference }] : []),
              ...(m.origin === "legacy" ? [{ label: "Legajo digital", value: m.digitalOnboardingCompletedAt ? `Completado el ${stamp.format(m.digitalOnboardingCompletedAt)}` : "Activación pendiente" }] : []),
            ]}
          />
        </Card>
        <aside className="order-first space-y-6 lg:order-none" aria-label="Cuenta">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Estado</h2>
              <StatusBadge tone={memberStatus[m.status].tone}>{memberStatus[m.status].label}</StatusBadge>
            </div>
            <p className="text-small text-text-muted">
              Cuenta web: {pending ? "activación pendiente. La persona todavía no creó su contraseña." : m.accountStatus === "active" ? "activa. Ingresa con su DNI." : "deshabilitada."}
            </p>
            {pending && <ResendActivation memberId={m.id} />}
          </Card>
        </aside>
      </div>
      <div className="mt-10">
        <ReprocannPanel
          memberId={m.id}
          view={reprocann}
          options={{
            permit: [...PERMIT_STATUS],
            management: [...MANAGEMENT_SOURCE],
            linkage: [...LINKAGE_STATUS],
            kind: [...DOCUMENT_KIND],
            review: [...REVIEW_STATUS],
            source: [...INFO_SOURCE],
          }}
        />
      </div>
    </>
  );
}
