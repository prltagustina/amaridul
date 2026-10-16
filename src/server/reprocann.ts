// REPROCANN, minimum for now: once a member is identified, the admin records the documentation
// Amarí Dul already holds (or receives) and the state of each dimension. Administrative and
// documentary only. Recording or verifying a document never enables dispensing: the rule is not
// defined yet, so eligibility is not stored nor computed here.
import { randomUUID } from "node:crypto";
import { asc, desc, eq, and } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { auditLogs, reprocannCases, reprocannDocuments, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { Keyring } from "@/server/crypto/keyring";

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

export const reviewInput = z.object({
  reviewStatus: z.enum(values(REVIEW_STATUS)),
  verifiedOn: optionalDate,
});

const idAad = (docId: string) => `reprocann_documents.permit_identifier:${docId}`;
const notesAad = (docId: string) => `reprocann_documents.notes:${docId}`;

export class ReprocannError extends Error {}

export async function getReprocann(db: Database, field: Keyring, memberId: string) {
  const [c] = await db.select().from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
  if (!c) return null;
  const docs = await db.select().from(reprocannDocuments).where(eq(reprocannDocuments.caseId, c.id)).orderBy(desc(reprocannDocuments.createdAt));
  const history = await db
    .select({ action: auditLogs.action, at: auditLogs.at, metadata: auditLogs.metadata, actor: user.name })
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorUserId))
    .where(and(eq(auditLogs.entityType, "reprocann_case"), eq(auditLogs.entityId, c.id)))
    .orderBy(asc(auditLogs.at));
  return {
    case: c,
    documents: docs.map((d) => ({
      ...d,
      permitIdentifier: d.permitIdentifierEncrypted ? decryptField(field, d.permitIdentifierEncrypted, idAad(d.id)) : null,
      notes: d.notesEncrypted ? decryptField(field, d.notesEncrypted, notesAad(d.id)) : null,
      permitIdentifierEncrypted: undefined,
      notesEncrypted: undefined,
    })),
    history,
  };
}

async function ensureCase(t: Database, actorUserId: string, memberId: string, now: Date) {
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

/** The admin's review of one document. Verified does not mean enabled for dispensing. */
export async function reviewDocument(db: Database, actorUserId: string, documentId: string, input: z.infer<typeof reviewInput>, now = new Date()) {
  if (!z.uuid().safeParse(documentId).success) throw new ReprocannError("El documento no existe.");
  if (input.reviewStatus === "verificada" && !input.verifiedOn) throw new ReprocannError("Indicá la fecha de verificación.");
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [d] = await t.select({ caseId: reprocannDocuments.caseId, reviewStatus: reprocannDocuments.reviewStatus }).from(reprocannDocuments).where(eq(reprocannDocuments.id, documentId));
    if (!d) throw new ReprocannError("El documento no existe.");
    if (d.reviewStatus === input.reviewStatus) return;
    await t
      .update(reprocannDocuments)
      .set({ reviewStatus: input.reviewStatus, verifiedOn: input.verifiedOn, reviewedBy: actorUserId, reviewedAt: now, updatedAt: now })
      .where(eq(reprocannDocuments.id, documentId));
    await audit(t, {
      actorUserId,
      action: "reprocann.document_reviewed",
      entityType: "reprocann_case",
      entityId: d.caseId,
      metadata: { document: documentId, reviewStatus_before: d.reviewStatus, reviewStatus_after: input.reviewStatus, verifiedOn: input.verifiedOn },
    });
  });
}
