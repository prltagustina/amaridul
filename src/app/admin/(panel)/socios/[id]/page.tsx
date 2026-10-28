import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { categoryLabel, getMemberProfile } from "@/server/member-profile";
import { DOCUMENT_KIND, INFO_SOURCE, LINKAGE_STATUS, MANAGEMENT_SOURCE, PERMIT_STATUS, REVIEW_STATUS, labelIn } from "@/server/reprocann";
import { categoryOptions, provinces } from "@/demo/content";
import { memberStatus } from "../../../status";
import { AdminPageHeader } from "../../../ui";
import { AccountBlock, ContactBlock, FeeBlock, MembershipBlock, NotesBlock, PersonalBlock } from "./profile-blocks";
import ReprocannPanel, { type ReprocannView } from "./reprocann-panel";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const DIMENSIONS: Record<string, { name: string; list: readonly { value: string; label: string }[] }> = {
  permitStatus: { name: "Permiso", list: PERMIT_STATUS },
  managementSource: { name: "Quién gestiona", list: MANAGEMENT_SOURCE },
  linkageStatus: { name: "Vinculación", list: LINKAGE_STATUS },
  responsibleName: { name: "Responsable", list: [] },
};
const LEGAJO = { imported: "Importado del padrón histórico", pending_update: "Pendiente de actualizar", updated: "Actualizado" } as const;

/** Audit entries of the REPROCANN case, in words. */
function describe(action: string, m: Record<string, string | number | boolean | null> | null): string {
  if (action === "reprocann.case_opened") return "Se abrió el trámite.";
  if (action === "reprocann.document_added") return `Documento registrado: ${labelIn(DOCUMENT_KIND, String(m?.kind))} (${labelIn(INFO_SOURCE, String(m?.source))})${m?.importRun ? " · importación del padrón" : ""}.`;
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
  const p = await getMemberProfile(await getDb(), getKeyrings(), id);
  if (!p) notFound();
  const name = p.personal.lastNames && p.personal.firstNames ? `${p.personal.firstNames} ${p.personal.lastNames}` : p.personal.fullName;
  const ms = p.membership;

  const rep = p.reprocann;
  const reprocann: ReprocannView = {
    case: rep ? { permitStatus: rep.case.permitStatus, managementSource: rep.case.managementSource, responsibleName: rep.case.responsibleName ?? "", linkageStatus: rep.case.linkageStatus } : null,
    documents: (rep?.documents ?? []).map((d) => ({ id: d.id, kind: d.kind, permitIdentifier: d.permitIdentifier, issuedOn: d.issuedOn, expiresOn: d.expiresOn, source: d.source, reviewStatus: d.reviewStatus, verifiedOn: d.verifiedOn, notes: d.notes, createdAt: d.createdAt.toISOString() })),
    history: (rep?.history ?? []).map((h) => ({ at: stamp.format(h.at), actor: h.actor ?? "Sistema", text: describe(h.action, h.metadata) })),
    credential: {
      validityLabel: p.validity.label,
      validityTone: p.validity.tone,
      expiresOn: p.credential?.expiresOn ?? null,
      review: p.credential?.reviewStatus ?? null,
      source: p.credential?.source ?? null,
      digitized: !!p.credential?.fileKey,
    },
  };

  const ac = p.access;
  const access = {
    state: ac.state,
    missing: ac.missing,
    destination: ac.destination,
    emailShared: ac.emailShared,
    lastSentAt: ac.lastSentAt ? stamp.format(ac.lastSentAt) : null,
    link: ac.link,
    linkExpiresAt: ac.linkExpiresAt ? stamp.format(ac.linkExpiresAt) : null,
    activatedAt: ac.activatedAt ? stamp.format(ac.activatedAt) : null,
  };

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/socios", label: "Socios" }} eyebrow={ms.memberNumber ? `Socio ${ms.memberNumber}` : "Socio · número a confirmar"} title={name} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <PersonalBlock id={p.id} data={p.personal} />
          <ContactBlock id={p.id} data={p.contact} provinces={provinces} />
          <FeeBlock id={p.id} data={p.fee} />
        </div>
        <div className="space-y-6">
          <MembershipBlock
            id={p.id}
            categories={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
            statuses={Object.entries(memberStatus).map(([value, s]) => ({ value, label: s.label }))}
            data={{
              memberNumber: ms.memberNumber,
              category: ms.category,
              categoryLabel: categoryLabel(ms.category),
              since: ms.since,
              status: ms.status,
              statusLabel: memberStatus[ms.status].label,
              minutesReference: ms.minutesReference,
              originLabel: ms.origin === "legacy" ? "Socio existente (ingresó antes del sistema)" : "Admisión en el sistema",
              room: ms.room,
              onboardedAt: ms.digitalOnboardingCompletedAt ? stamp.format(ms.digitalOnboardingCompletedAt) : null,
              legajoLabel: ms.digitalOnboardingCompletedAt ? `${LEGAJO[ms.legajo]} · ${stamp.format(ms.digitalOnboardingCompletedAt)}` : LEGAJO[ms.legajo],
              previousNumbers: ms.previousNumbers,
              declaredNumber: ms.declaredNumber,
              admission: ms.admissionId ? (
                <Link href={`/admin/admisiones/${ms.admissionId}`} className="!text-forest underline underline-offset-2">
                  {ms.admissionReference}
                </Link>
              ) : (
                <span className="text-text-muted">No corresponde</span>
              ),
            }}
          />
          <AccountBlock id={p.id} access={access} />
        </div>
      </div>
      <div className="mt-10">
        <ReprocannPanel
          memberId={p.id}
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
      <div className="mt-10">
        <NotesBlock id={p.id} notes={p.notes.map((n) => ({ id: n.id, body: n.body, at: stamp.format(n.createdAt), author: n.source === "import" ? "Importación de padrón histórico" : (n.author ?? "Administración") }))} />
      </div>
    </>
  );
}
