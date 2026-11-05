import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { categoryLabel, getMemberProfile } from "@/server/member-profile";
import { CREDENTIAL_KINDS, DOCUMENT_KIND, INFO_SOURCE, isActiveDocument, LINKAGE_STATUS, MANAGEMENT_SOURCE, PERMIT_STATUS, REVIEW_STATUS, labelIn } from "@/server/reprocann";
import { categoryOptions, provinces } from "@/demo/content";
import { fileSizeLabel } from "@/lib/file-size";
import { credentialStatus, currentCredential, expiryLine } from "@/lib/credential-validity";
import { dispensingEligibility } from "@/lib/dispensing";
import { uploadMode } from "@/server/storage";
import { adminLinkCode } from "@/server/reprocann-link";
import { memberStatus } from "../../../status";
import { AdminPageHeader } from "../../../ui";
import { AccountBlock, ContactBlock, FeeBlock, MembershipBlock, NotesBlock, PersonalBlock } from "./profile-blocks";
import { DispensingBlock } from "./dispensing-block";
import ReprocannPanel, { type ReprocannView } from "./reprocann-panel";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const DIMENSIONS: Record<string, { name: string; list: readonly { value: string; label: string }[] }> = {
  permitStatus: { name: "Permiso", list: PERMIT_STATUS },
  managementSource: { name: "Quién gestiona", list: MANAGEMENT_SOURCE },
  linkageStatus: { name: "Vinculación", list: LINKAGE_STATUS },
  responsibleName: { name: "Responsable", list: [] },
};
const LEGAJO = { imported: "Importado del padrón histórico", pending_update: "Pendiente de actualizar", updated: "Actualizado" } as const;

const CREDENTIAL_STATUS_WORDS: Record<string, string> = { none: "sin credencial", pending: "en revisión", observed: "observada", verified: "verificada", expiring: "vence pronto", expired: "vencida" };

/** Audit entries of the REPROCANN case, in words. `docLabel` names a document of the case by its id. */
function describe(action: string, m: Record<string, string | number | boolean | null> | null, docLabel: (id: unknown) => string): string {
  if (action === "reprocann.case_opened") return "Se abrió el trámite.";
  if (action === "reprocann.document_added") return `Documento registrado: ${labelIn(DOCUMENT_KIND, String(m?.kind))} (${labelIn(INFO_SOURCE, String(m?.source))})${m?.importRun ? " · importación del padrón" : ""}.`;
  if (action === "reprocann.document_uploaded") return `El socio envió un archivo desde su cuenta: ${labelIn(DOCUMENT_KIND, String(m?.kind))}${m?.replaces ? " (reemplaza al anterior)" : ""}.`;
  if (action === "reprocann.document_viewed") return `${m?.by === "member" ? "El socio abrió su archivo" : "Archivo abierto"}${m?.page ? ` (hoja ${m.page})` : ""}.`;
  if (action === "reprocann.document_files_added")
    return `${m?.attached ? "Archivos adjuntados al documento ya registrado" : "Documento cargado por la asociación"}: ${labelIn(DOCUMENT_KIND, String(m?.kind))}, ${m?.pages} ${m?.pages === 1 ? "hoja" : "hojas"} · identidad comprobada con el DNI del padrón.`;
  if (action === "reprocann.document_reviewed") {
    const parts = [
      m && "reviewStatus_after" in m ? `${labelIn(REVIEW_STATUS, String(m.reviewStatus_before))} → ${labelIn(REVIEW_STATUS, String(m.reviewStatus_after))}` : null,
      m?.verifiedOn_changed ? "fecha de verificación" : null,
      m?.expiresOn_changed ? "vencimiento" : null,
      m?.memberMessage_changed ? "motivo para el socio" : null,
      m?.notes_changed ? "nota interna" : null,
    ].filter(Boolean);
    return `Documento revisado${parts.length ? `: ${parts.join(" · ")}` : ""}.`;
  }
  if (action === "reprocann.document_withdrawn")
    return `Documento retirado por duplicado (${docLabel(m?.document)}); se conserva ${docLabel(m?.kept)}. Credencial vigente: ${CREDENTIAL_STATUS_WORDS[String(m?.status_before)] ?? "—"} → ${CREDENTIAL_STATUS_WORDS[String(m?.status_after)] ?? "—"}.`;
  if (action === "reprocann.document_withdrawn_other_member")
    return `Documento retirado porque no era de este socio (${docLabel(m?.document)}). Credencial vigente: ${CREDENTIAL_STATUS_WORDS[String(m?.status_before)] ?? "—"} → ${CREDENTIAL_STATUS_WORDS[String(m?.status_after)] ?? "—"}.`;
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

export default async function SocioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const { revisar } = await searchParams;
  const p = await getMemberProfile(await getDb(), getKeyrings(), id);
  if (!p) notFound();
  const name = p.personal.lastNames && p.personal.firstNames ? `${p.personal.firstNames} ${p.personal.lastNames}` : p.personal.fullName;
  const ms = p.membership;

  const rep = p.reprocann;
  const docs = rep?.documents ?? [];
  // How each document reads in a list, to tell repeated ones apart: kind, who sent it and when.
  const docLabel = (docId: unknown) => {
    const d = docs.find((x) => x.id === docId);
    if (!d) return "un documento";
    return `${labelIn(DOCUMENT_KIND, d.kind).toLowerCase()} que ${d.fromMember ? "envió el socio" : `cargó ${d.recordedBy ?? "la administración"}`} el ${stamp.format(d.createdAt)}`;
  };
  // Active credentials (neither replaced nor withdrawn): more than one is a duplicate to resolve.
  const activeCredentials = docs.filter((d) => isActiveDocument(d) && (CREDENTIAL_KINDS as readonly string[]).includes(d.kind));
  const inForce = currentCredential(activeCredentials);
  const linkCode = await adminLinkCode(await getDb(), getKeyrings().field, p.id);
  const reprocann: ReprocannView = {
    case: rep ? { permitStatus: rep.case.permitStatus, managementSource: rep.case.managementSource, responsibleName: rep.case.responsibleName ?? "", linkageStatus: rep.case.linkageStatus } : null,
    documents: docs.map((d) => ({
      id: d.id,
      label: docLabel(d.id),
      active: isActiveDocument(d),
      credential: (CREDENTIAL_KINDS as readonly string[]).includes(d.kind),
      inForce: d.id === inForce?.id,
      reviewed: d.reviewedAt ? { at: stamp.format(d.reviewedAt), by: d.reviewedByName ?? "administración" } : null,
      withdrawn: d.withdrawnAt
        ? { at: stamp.format(d.withdrawnAt), by: d.withdrawnByName ?? "administración", reason: d.withdrawalReason === "otro_socio" ? "otro_socio" : "duplicado", kept: d.keptDocumentId ? docLabel(d.keptDocumentId) : null }
        : null,
      // For an active credential: if it were withdrawn, which credential would be in force and how it would read.
      ifWithdrawn:
        activeCredentials.some((c) => c.id === d.id)
          ? (() => {
              const after = currentCredential(activeCredentials.filter((c) => c.id !== d.id));
              const status = credentialStatus(after);
              return { inForce: after ? docLabel(after.id) : null, statusLabel: status.label, statusTone: status.tone, loses: p.credentialStatus.key === "verified" || p.credentialStatus.key === "expiring" ? !(status.key === "verified" || status.key === "expiring") : false };
            })()
          : null,
      kind: d.kind,
      permitIdentifier: d.permitIdentifier,
      issuedOn: d.issuedOn,
      expiresOn: d.expiresOn,
      source: d.source,
      reviewStatus: d.reviewStatus,
      verifiedOn: d.verifiedOn,
      notes: d.notes,
      memberMessage: d.memberMessage,
      createdAt: stamp.format(d.createdAt),
      fromMember: d.fromMember,
      recordedBy: d.recordedBy,
      replaced: !!d.replacedBy,
      files: d.files.map((f) => ({
        href: `/admin/socios/${p.id}/reprocann/${f.id}`,
        page: f.page,
        image: f.contentType !== "application/pdf",
        label: `${f.contentType === "application/pdf" ? "PDF" : f.contentType === "image/png" ? "PNG" : "JPG"} · ${fileSizeLabel(f.size)}`,
        uploaded: `${f.uploaderRole === "MEMBER" ? "el socio" : (f.uploaderName ?? "administración")} · ${stamp.format(f.uploadedAt)}`,
      })),
    })),
    history: (rep?.history ?? []).map((h) => ({ at: stamp.format(h.at), actor: h.actor ?? "Sistema", text: describe(h.action, h.metadata, docLabel) })),
    credential: {
      statusLabel: p.credentialStatus.label,
      statusTone: p.credentialStatus.tone,
      expiry: expiryLine(p.credentialStatus.expiry),
      review: p.credential?.reviewStatus ?? null,
      source: p.credential?.source ?? null,
      digitized: !!rep?.documents.find((d) => d.id === p.credential?.id)?.files.length,
    },
    uploads: uploadMode(),
    linkCode,
  };
  const eligibility = dispensingEligibility({ membership: ms.status, credential: p.credentialStatus, linkage: rep ? { verified: rep.case.linkageStatus === "verificada", codeReceived: !!linkCode } : null }, "admin");

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
      <DispensingBlock eligibility={eligibility} className="mb-6" />
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
          member={{ name, number: ms.memberNumber }}
          openReview={typeof revisar === "string" ? revisar : null}
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
