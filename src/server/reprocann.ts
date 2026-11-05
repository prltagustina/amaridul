// REPROCANN, minimum for now: once a member is identified, the admin records the documentation
// Amarí Dul already holds (or receives) and the state of each dimension. Administrative and
// documentary only. Recording or verifying a document never enables dispensing by itself: the
// eligibility is derived from three conditions in `src/lib/dispensing.ts` and never stored.
import { randomUUID } from "node:crypto";
import { asc, desc, eq, and, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { auditLogs, reprocannCases, reprocannDocumentFiles, reprocannDocuments, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { Keyring } from "@/server/crypto/keyring";
import { credentialStatus, currentCredential, todayInArgentina } from "@/lib/credential-validity";

export const PERMIT_STATUS = [
  { value: "no_informado", label: "Sin informar" },
  { value: "sin_permiso", label: "Sin permiso" },
  { value: "iniciado_informado", label: "Trámite iniciado (informado por el equipo médico)" },
  { value: "pendiente_aprobacion", label: "Pendiente de aprobación" },
  { value: "aprobado", label: "Permiso aprobado" },
  { value: "vencido", label: "Vencido" },
  { value: "renovacion", label: "En renovación" },
] as const;
export const MANAGEMENT_SOURCE = [
  { value: "self_or_external", label: "La persona, con su profesional" },
  { value: "association", label: "La asociación, con el equipo médico" },
] as const;
export const LINKAGE_STATUS = [
  { value: "pendiente", label: "Vinculación pendiente" },
  { value: "verificada", label: "Vinculación verificada" },
] as const;
export const DOCUMENT_KIND = [
  { value: "credencial", label: "Credencial" },
  { value: "certificado", label: "Certificado" },
  { value: "constancia_vinculacion", label: "Constancia de vinculación" },
  { value: "otro", label: "Otro" },
] as const;
export const REVIEW_STATUS = [
  { value: "pendiente", label: "Pendiente de revisión" },
  { value: "observada", label: "Observada" },
  { value: "verificada", label: "Verificada" },
] as const;
export const INFO_SOURCE = [
  { value: "en_poder_de_la_asociacion", label: "Documentación en poder de la asociación" },
  { value: "aportado_por_socio", label: "Aportado por el socio" },
  { value: "informado_por_equipo_medico", label: "Informado por el equipo médico" },
  { value: "verificacion_administrativa", label: "Verificación administrativa" },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) => list.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];
export const labelIn = (list: readonly { value: string; label: string }[], v: string | null | undefined) => list.find((o) => o.value === v)?.label ?? "—";

/** The kinds that count as the member's credential (see `currentCredential`). */
export const CREDENTIAL_KINDS = ["credencial", "certificado"] as const;
/** Part of the active documentation: not replaced by a newer one and not withdrawn as a duplicate. */
export const isActiveDocument = (d: { replacedBy: string | null; withdrawnAt: Date | null }) => !d.replacedBy && !d.withdrawnAt;

const todayAR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const optionalDate = z.union([z.iso.date(), z.literal("")]).transform((v) => v || null);

export const caseInput = z.object({
  permitStatus: z.enum(values(PERMIT_STATUS)),
  managementSource: z.enum(values(MANAGEMENT_SOURCE)),
  responsibleName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  linkageStatus: z.enum(values(LINKAGE_STATUS)),
});
export type CaseInput = z.infer<typeof caseInput>;

export const documentInput = z
  .object({
    kind: z.enum(values(DOCUMENT_KIND)),
    permitIdentifier: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => v || null),
    issuedOn: optionalDate,
    expiresOn: optionalDate,
    source: z.enum(values(INFO_SOURCE)),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || null),
  })
  .refine((v) => !v.issuedOn || v.issuedOn <= todayAR(), { path: ["issuedOn"], message: "La fecha de emisión no puede ser posterior a hoy." })
  .refine((v) => !v.issuedOn || !v.expiresOn || v.expiresOn >= v.issuedOn, { path: ["expiresOn"], message: "El vencimiento no puede ser anterior a la emisión." });
export type DocumentInput = z.infer<typeof documentInput>;

/**
 * The admin's review. The reason for an observation is what the member reads; the internal note
 * stays with the team. `notes` and `expiresOn` absent mean "unchanged": the expiry a member
 * declared becomes the one the admin read on the document.
 */
export const reviewInput = z
  .object({
    reviewStatus: z.enum(values(REVIEW_STATUS)),
    verifiedOn: optionalDate,
    /** The expiry date as the admin reads it on the document; absent means "unchanged". */
    expiresOn: optionalDate.optional(),
    memberMessage: z
      .string()
      .trim()
      .max(300, "El motivo para el socio admite hasta 300 caracteres.")
      .optional()
      .transform((v) => v || null),
    notes: z.string().trim().max(500, "La nota interna admite hasta 500 caracteres.").optional(),
  })
  .refine((v) => v.reviewStatus !== "observada" || !!v.memberMessage, { path: ["memberMessage"], message: "Escribí qué tiene que corregir el socio: es lo que va a leer en su cuenta." });

const idAad = (docId: string) => `reprocann_documents.permit_identifier:${docId}`;
const notesAad = (docId: string) => `reprocann_documents.notes:${docId}`;
const messageAad = (docId: string) => `reprocann_documents.member_message:${docId}`;

/** The reason for an observation, as the member reads it. */
export const decryptMemberMessage = (field: Keyring, docId: string, payload: string | null) => (payload ? decryptField(field, payload, messageAad(docId)) : null);

export class ReprocannError extends Error {}

export async function getReprocann(db: Database, field: Keyring, memberId: string) {
  const [c] = await db.select().from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
  if (!c) return null;
  const reviewer = alias(user, "reviewer");
  const withdrawer = alias(user, "withdrawer");
  const docs = await db
    .select({ doc: reprocannDocuments, uploaderRole: user.role, uploaderName: user.name, reviewerName: reviewer.name, withdrawnByName: withdrawer.name })
    .from(reprocannDocuments)
    .leftJoin(user, eq(user.id, reprocannDocuments.createdBy))
    .leftJoin(reviewer, eq(reviewer.id, reprocannDocuments.reviewedBy))
    .leftJoin(withdrawer, eq(withdrawer.id, reprocannDocuments.withdrawnBy))
    .where(eq(reprocannDocuments.caseId, c.id))
    .orderBy(desc(reprocannDocuments.createdAt));
  const files = docs.length
    ? await db
        .select({
          id: reprocannDocumentFiles.id,
          documentId: reprocannDocumentFiles.documentId,
          page: reprocannDocumentFiles.page,
          contentType: reprocannDocumentFiles.contentType,
          size: reprocannDocumentFiles.size,
          uploadedAt: reprocannDocumentFiles.uploadedAt,
          uploaderName: user.name,
          uploaderRole: user.role,
        })
        .from(reprocannDocumentFiles)
        .leftJoin(user, eq(user.id, reprocannDocumentFiles.uploadedBy))
        .where(inArray(reprocannDocumentFiles.documentId, docs.map((d) => d.doc.id)))
        .orderBy(asc(reprocannDocumentFiles.page))
    : [];
  const history = await db
    .select({ action: auditLogs.action, at: auditLogs.at, metadata: auditLogs.metadata, actor: user.name })
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorUserId))
    // Thumbnails are logged as previews; the case history lists what was done and opened.
    .where(and(eq(auditLogs.entityType, "reprocann_case"), eq(auditLogs.entityId, c.id), ne(auditLogs.action, "reprocann.document_previewed")))
    .orderBy(asc(auditLogs.at));
  return {
    case: c,
    documents: docs.map(({ doc: d, uploaderRole, uploaderName, reviewerName, withdrawnByName }) => ({
      ...d,
      /** Who recorded it: a member from their account, or an admin. */
      recordedBy: uploaderName ?? null,
      /** Who saved the last review, and who withdrew it as a duplicate. */
      reviewedByName: reviewerName ?? null,
      withdrawnByName: withdrawnByName ?? null,
      files: files.filter((f) => f.documentId === d.id),
      permitIdentifier: d.permitIdentifierEncrypted ? decryptField(field, d.permitIdentifierEncrypted, idAad(d.id)) : null,
      notes: d.notesEncrypted ? decryptField(field, d.notesEncrypted, notesAad(d.id)) : null,
      memberMessage: decryptMemberMessage(field, d.id, d.memberMessageEncrypted),
      /** Sent by the member from their account (not recorded by the association). */
      fromMember: uploaderRole === "MEMBER",
      permitIdentifierEncrypted: undefined,
      notesEncrypted: undefined,
      memberMessageEncrypted: undefined,
    })),
    history,
  };
}

/** The member's REPROCANN case, opened on first use. Run inside a transaction. */
export async function ensureCase(t: Database, actorUserId: string, memberId: string, now: Date) {
  const [c] = await t.select({ id: reprocannCases.id }).from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
  if (c) return c.id;
  const [created] = await t
    .insert(reprocannCases)
    .values({ memberId, createdBy: actorUserId, updatedBy: actorUserId, createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: reprocannCases.memberId })
    .returning({ id: reprocannCases.id });
  if (created) {
    await audit(t, { actorUserId, action: "reprocann.case_opened", entityType: "reprocann_case", entityId: created.id, metadata: { memberId } });
    return created.id;
  }
  const [again] = await t.select({ id: reprocannCases.id }).from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
  return again.id;
}

/** Updates the case dimensions, recording each change with its previous and new value. */
export async function saveCase(db: Database, actorUserId: string, memberId: string, input: CaseInput, now = new Date()) {
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const caseId = await ensureCase(t, actorUserId, memberId, now);
    const [before] = await t.select().from(reprocannCases).where(eq(reprocannCases.id, caseId));
    const changed: Record<string, string | null> = {};
    for (const k of ["permitStatus", "managementSource", "responsibleName", "linkageStatus"] as const) {
      if ((before[k] ?? null) !== (input[k] ?? null)) {
        changed[`${k}_before`] = before[k] ?? null;
        changed[`${k}_after`] = input[k] ?? null;
      }
    }
    if (!Object.keys(changed).length) return;
    await t.update(reprocannCases).set({ ...input, updatedBy: actorUserId, updatedAt: now }).where(eq(reprocannCases.id, caseId));
    await audit(t, { actorUserId, action: "reprocann.case_updated", entityType: "reprocann_case", entityId: caseId, metadata: changed });
  });
}

/**
 * Records a document Amarí Dul holds or receives. It starts "pendiente de revisión" whatever its
 * source: recording it is not verifying it. The file itself waits for private storage in production.
 */
export async function addDocument(db: Database, field: Keyring, actorUserId: string, memberId: string, input: DocumentInput, now = new Date()) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const caseId = await ensureCase(t, actorUserId, memberId, now);
    const id = randomUUID();
    await t.insert(reprocannDocuments).values({
      id,
      caseId,
      kind: input.kind,
      permitIdentifierEncrypted: input.permitIdentifier ? encryptField(field, input.permitIdentifier, idAad(id)) : null,
      issuedOn: input.issuedOn,
      expiresOn: input.expiresOn,
      source: input.source,
      reviewStatus: "pendiente",
      notesEncrypted: input.notes ? encryptField(field, input.notes, notesAad(id)) : null,
      createdBy: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
    // Never the identifier nor the notes in the log: only what kind of document and where it came from.
    await audit(t, { actorUserId, action: "reprocann.document_added", entityType: "reprocann_case", entityId: caseId, metadata: { document: id, kind: input.kind, source: input.source, expiresOn: input.expiresOn } });
    return id;
  });
}

/**
 * The admin's review of one document. Verified does not mean enabled for dispensing. The member
 * reads the reason only while the document is observed; the internal note is never shown to them.
 * The log says what changed, never the texts.
 */
export async function reviewDocument(db: Database, field: Keyring, actorUserId: string, documentId: string, input: z.infer<typeof reviewInput>, now = new Date()) {
  if (!z.uuid().safeParse(documentId).success) throw new ReprocannError("El documento no existe.");
  if (input.reviewStatus === "verificada" && !input.verifiedOn) throw new ReprocannError("Indicá la fecha de verificación.");
  if (input.verifiedOn && input.verifiedOn > todayInArgentina(now)) throw new ReprocannError("La fecha de verificación no puede ser posterior a hoy.");
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [d] = await t
      .select({
        caseId: reprocannDocuments.caseId,
        kind: reprocannDocuments.kind,
        withdrawnAt: reprocannDocuments.withdrawnAt,
        reviewStatus: reprocannDocuments.reviewStatus,
        verifiedOn: reprocannDocuments.verifiedOn,
        expiresOn: reprocannDocuments.expiresOn,
        notes: reprocannDocuments.notesEncrypted,
        message: reprocannDocuments.memberMessageEncrypted,
        replacedBy: reprocannDocuments.replacedBy,
      })
      .from(reprocannDocuments)
      .where(eq(reprocannDocuments.id, documentId))
      .for("update");
    if (!d) throw new ReprocannError("El documento no existe.");
    // A review is of the file the admin saw: a document replaced meanwhile is not the current one.
    if (d.replacedBy) throw new ReprocannError("El socio reemplazó este documento por uno nuevo. Recargá la página y revisá la versión actual.");
    if (d.withdrawnAt) throw new ReprocannError("Este documento se retiró: ya no forma parte de la documentación activa.");
    // A credential is verified with the expiry read on it: without it, its validity cannot be followed.
    const expiresOn = input.expiresOn === undefined ? d.expiresOn : input.expiresOn;
    if (input.reviewStatus === "verificada" && (CREDENTIAL_KINDS as readonly string[]).includes(d.kind) && !expiresOn) throw new ReprocannError("Indicá el vencimiento que figura en la credencial para verificarla.");
    const message = input.reviewStatus === "observada" ? input.memberMessage : null;
    const messageChanged = (decryptMemberMessage(field, documentId, d.message) ?? null) !== message;
    const notesBefore = d.notes ? decryptField(field, d.notes, notesAad(documentId)) : null;
    const notesChanged = input.notes !== undefined && (input.notes || null) !== notesBefore;
    const expiryChanged = input.expiresOn !== undefined && input.expiresOn !== (d.expiresOn ?? null);
    const statusChanged = d.reviewStatus !== input.reviewStatus || (d.verifiedOn ?? null) !== input.verifiedOn;
    if (!statusChanged && !messageChanged && !notesChanged && !expiryChanged) return;
    await t
      .update(reprocannDocuments)
      .set({
        reviewStatus: input.reviewStatus,
        verifiedOn: input.verifiedOn,
        memberMessageEncrypted: message ? encryptField(field, message, messageAad(documentId)) : null,
        ...(notesChanged ? { notesEncrypted: input.notes ? encryptField(field, input.notes, notesAad(documentId)) : null } : {}),
        ...(expiryChanged ? { expiresOn: input.expiresOn } : {}),
        reviewedBy: actorUserId,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(reprocannDocuments.id, documentId));
    await audit(t, {
      actorUserId,
      action: "reprocann.document_reviewed",
      entityType: "reprocann_case",
      entityId: d.caseId,
      metadata: {
        document: documentId,
        ...(d.reviewStatus !== input.reviewStatus ? { reviewStatus_before: d.reviewStatus, reviewStatus_after: input.reviewStatus } : {}),
        ...((d.verifiedOn ?? null) !== input.verifiedOn ? { verifiedOn_changed: true } : {}),
        ...(expiryChanged ? { expiresOn_before: d.expiresOn ?? null, expiresOn_after: input.expiresOn ?? null } : {}),
        ...(messageChanged ? { memberMessage_changed: true } : {}),
        ...(notesChanged ? { notes_changed: true } : {}),
        verifiedOn: input.verifiedOn,
      },
    });
  });
}

/** What a withdrawal reads of each document of the case. */
const WITHDRAWAL_COLUMNS = {
  id: reprocannDocuments.id,
  caseId: reprocannDocuments.caseId,
  kind: reprocannDocuments.kind,
  replacedBy: reprocannDocuments.replacedBy,
  withdrawnAt: reprocannDocuments.withdrawnAt,
  reviewStatus: reprocannDocuments.reviewStatus,
  expiresOn: reprocannDocuments.expiresOn,
  createdAt: reprocannDocuments.createdAt,
};

/**
 * Withdraws a duplicate from the active documentation and keeps the other one. Both must be active
 * credentials (or certificates) of the same member, so the member is never left without the one
 * kept. Nothing is deleted: the withdrawn document keeps its files and its review, marked with who,
 * when, why and which document was kept instead. The credential in force is computed, never stored:
 * the log records which one counted before and which one counts after, with their statuses.
 */
export async function withdrawDuplicate(db: Database, actorUserId: string, documentId: string, keptDocumentId: string, now = new Date()) {
  if (!z.uuid().safeParse(documentId).success || !z.uuid().safeParse(keptDocumentId).success) throw new ReprocannError("El documento no existe.");
  if (documentId === keptDocumentId) throw new ReprocannError("Elegí cuál de los otros documentos se conserva.");
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const columns = WITHDRAWAL_COLUMNS;
    const [d] = await t.select(columns).from(reprocannDocuments).where(eq(reprocannDocuments.id, documentId)).for("update");
    if (!d) throw new ReprocannError("El documento no existe.");
    // The whole case, locked: the credential in force is computed over all of it.
    const docs = await t.select(columns).from(reprocannDocuments).where(eq(reprocannDocuments.caseId, d.caseId)).for("update");
    const kept = docs.find((x) => x.id === keptDocumentId);
    if (!kept) throw new ReprocannError("El documento que querés conservar no es de este socio.");
    const isCredential = (x: { kind: string }) => (CREDENTIAL_KINDS as readonly string[]).includes(x.kind);
    if (!isCredential(d) || !isCredential(kept)) throw new ReprocannError("Solo se retiran credenciales o certificados repetidos.");
    if (!isActiveDocument(d)) throw new ReprocannError(d.withdrawnAt ? "Este documento ya se retiró." : "Este documento ya fue reemplazado: no forma parte de la documentación activa.");
    if (!isActiveDocument(kept)) throw new ReprocannError("El documento que querés conservar ya no está activo. Recargá la página.");

    const active = docs.filter(isActiveDocument);
    const before = currentCredential(active);
    const after = currentCredential(active.filter((x) => x.id !== d.id));
    await t.update(reprocannDocuments).set({ withdrawnAt: now, withdrawnBy: actorUserId, withdrawalReason: "duplicado", keptDocumentId: kept.id, updatedAt: now }).where(eq(reprocannDocuments.id, d.id));
    const today = todayInArgentina(now);
    await audit(t, {
      actorUserId,
      action: "reprocann.document_withdrawn",
      entityType: "reprocann_case",
      entityId: d.caseId,
      metadata: {
        document: d.id,
        kept: kept.id,
        reason: "duplicado",
        reviewStatus: d.reviewStatus,
        current_before: before?.id ?? null,
        current_after: after?.id ?? null,
        status_before: credentialStatus(before, today).key,
        status_after: credentialStatus(after, today).key,
      },
    });
    return { caseId: d.caseId, currentAfter: after?.id ?? null };
  });
}

/**
 * Withdraws a document that is not the member's (someone else's, sent to the wrong account) from
 * the active documentation, even when it is the only one: nothing is kept instead, and whatever is
 * in the other person's account is not touched. Nothing is deleted either: it keeps its files and
 * its review, marked with who withdrew it, when and why, and the member no longer opens it. The
 * log records which credential counted before and which one counts after, with their statuses.
 */
export async function withdrawNotThisMember(db: Database, actorUserId: string, documentId: string, now = new Date()) {
  if (!z.uuid().safeParse(documentId).success) throw new ReprocannError("El documento no existe.");
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [d] = await t.select(WITHDRAWAL_COLUMNS).from(reprocannDocuments).where(eq(reprocannDocuments.id, documentId)).for("update");
    if (!d) throw new ReprocannError("El documento no existe.");
    // The whole case, locked: the credential in force is computed over all of it.
    const docs = await t.select(WITHDRAWAL_COLUMNS).from(reprocannDocuments).where(eq(reprocannDocuments.caseId, d.caseId)).for("update");
    if (!isActiveDocument(d)) throw new ReprocannError(d.withdrawnAt ? "Este documento ya se retiró." : "Este documento ya fue reemplazado: no forma parte de la documentación activa.");

    const active = docs.filter(isActiveDocument);
    const before = currentCredential(active);
    const after = currentCredential(active.filter((x) => x.id !== d.id));
    await t.update(reprocannDocuments).set({ withdrawnAt: now, withdrawnBy: actorUserId, withdrawalReason: "otro_socio", keptDocumentId: null, updatedAt: now }).where(eq(reprocannDocuments.id, d.id));
    const today = todayInArgentina(now);
    await audit(t, {
      actorUserId,
      action: "reprocann.document_withdrawn_other_member",
      entityType: "reprocann_case",
      entityId: d.caseId,
      metadata: {
        document: d.id,
        reason: "otro_socio",
        reviewStatus: d.reviewStatus,
        current_before: before?.id ?? null,
        current_after: after?.id ?? null,
        status_before: credentialStatus(before, today).key,
        status_after: credentialStatus(after, today).key,
      },
    });
    return { caseId: d.caseId, currentAfter: after?.id ?? null };
  });
}
