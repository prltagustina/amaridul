import { and, eq, inArray, ne, or } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { admissionDecisions, admissions, auditLogs, existingMemberRequests, memberFeeSettings, memberNotes, memberNumbers, members, oneTimeTokens, persons, preAdmissions, reprocannCases, reprocannDocumentFiles, reprocannDocuments, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { INVITATION_KIND } from "@/server/pre-admissions";
import { UPDATE_LINK_KIND } from "@/server/existing-members";

export class DeleteNotAllowedError extends Error {}

/**
 * The tools that delete test requests exist on the development machine and in tests. On a
 * deployment only while TEST_DELETION=on, set for a testing session and removed afterwards, so a
 * real record cannot be deleted by mistake once the testing phase is over.
 */
export const testDeletionAllowed = () =>
  process.env.TEST_DELETION === "on" || (!process.env.VERCEL && process.env.APP_ENV !== "production" && process.env.APP_ENV !== "preview"); // unset APP_ENV means local, as in env.ts
const assertAllowed = () => {
  if (!testDeletionAllowed()) throw new DeleteNotAllowedError("Borrar solicitudes de prueba no está habilitado en este entorno.");
};

/**
 * The member and what hangs from them: tokens, number history, notes, fee data, REPROCANN record,
 * and their account (sessions, accounts and lockouts cascade). Their own audit entries stay,
 * without a reference to the deleted account. Never an admin account.
 */
async function deleteMemberChain(t: Database, member: { id: string; userId: string | null }) {
  const [u] = member.userId ? await t.select({ role: user.role }).from(user).where(eq(user.id, member.userId)) : [];
  if (member.userId && u?.role !== "MEMBER") throw new DeleteNotAllowedError("La cuenta no es de socio");
  await t.delete(oneTimeTokens).where(member.userId ? or(eq(oneTimeTokens.userId, member.userId), eq(oneTimeTokens.subjectId, member.id)) : eq(oneTimeTokens.subjectId, member.id));
  await t.delete(memberNumbers).where(eq(memberNumbers.memberId, member.id));
  await t.delete(memberNotes).where(eq(memberNotes.memberId, member.id));
  await t.delete(memberFeeSettings).where(eq(memberFeeSettings.memberId, member.id));
  const cases = await t.select({ id: reprocannCases.id }).from(reprocannCases).where(eq(reprocannCases.memberId, member.id));
  if (cases.length) {
    const caseIds = cases.map((c) => c.id);
    // Files are documentary evidence: whoever has them may be a real person. Never deleted from here.
    const [withFiles] = await t
      .select({ id: reprocannDocumentFiles.id })
      .from(reprocannDocumentFiles)
      .innerJoin(reprocannDocuments, eq(reprocannDocuments.id, reprocannDocumentFiles.documentId))
      .where(inArray(reprocannDocuments.caseId, caseIds))
      .limit(1);
    if (withFiles) throw new DeleteNotAllowedError("Tiene documentación REPROCANN con archivos cargados: puede ser un registro real y no se borra desde acá.");
    await t.update(reprocannDocuments).set({ replacedBy: null }).where(inArray(reprocannDocuments.caseId, caseIds));
    await t.delete(reprocannDocuments).where(inArray(reprocannDocuments.caseId, caseIds));
    await t.delete(reprocannCases).where(eq(reprocannCases.memberId, member.id));
  }
  await t.delete(members).where(eq(members.id, member.id));
  if (member.userId) {
    await t.update(auditLogs).set({ actorUserId: null }).where(eq(auditLogs.actorUserId, member.userId));
    await t.delete(user).where(eq(user.id, member.userId));
  }
}

/**
 * TEMPORARY (testing phase): removes a test request and everything that came from it: the
 * preadmission with its notes and invitation links, the formal request and its decisions, the
 * person and DNI, and the member with their account, sessions and activation links. Audit
 * entries stay; the deleted account's own entries keep no reference to it. Remove before delivery.
 */
export async function deleteTestRequest(db: Database, actorUserId: string, preAdmissionId: string, confirmReference: string) {
  assertAllowed();
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [pre] = await t.select({ id: preAdmissions.id, reference: preAdmissions.reference }).from(preAdmissions).where(eq(preAdmissions.id, preAdmissionId));
    if (!pre) throw new DeleteNotAllowedError("La solicitud no existe");
    if (confirmReference.trim().toUpperCase() !== pre.reference) throw new DeleteNotAllowedError("La referencia no coincide. Escribila tal como aparece arriba.");

    const [adm] = await t.select({ id: admissions.id, reference: admissions.reference, personId: admissions.personId }).from(admissions).where(eq(admissions.preAdmissionId, pre.id));
    const [member] = adm ? await t.select({ id: members.id, userId: members.userId, memberNumber: members.memberNumber }).from(members).where(eq(members.admissionId, adm.id)) : [];

    // A preadmission moved to the legajo update: its request goes too, unless a member was already linked.
    const [existing] = await t.select({ id: existingMemberRequests.id, reference: existingMemberRequests.reference, linkedMemberId: existingMemberRequests.linkedMemberId }).from(existingMemberRequests).where(eq(existingMemberRequests.preAdmissionId, pre.id));
    if (existing?.linkedMemberId) throw new DeleteNotAllowedError(`Esta preadmisión pasó a «Ya soy socio/a» (${existing.reference}) y quedó vinculada a un socio: borrá primero esa solicitud desde «Solicitudes de socios existentes».`);
    if (existing) {
      await t.delete(oneTimeTokens).where(and(eq(oneTimeTokens.kind, UPDATE_LINK_KIND), eq(oneTimeTokens.subjectId, existing.id)));
      await t.delete(existingMemberRequests).where(eq(existingMemberRequests.id, existing.id));
    }

    if (member) await deleteMemberChain(t, member);
    if (adm) {
      await t.delete(admissionDecisions).where(eq(admissionDecisions.admissionId, adm.id));
      await t.delete(admissions).where(eq(admissions.id, adm.id));
      await t.delete(persons).where(eq(persons.id, adm.personId)); // DNI identity cascades
    }
    await t.delete(oneTimeTokens).where(and(eq(oneTimeTokens.kind, INVITATION_KIND), eq(oneTimeTokens.subjectId, pre.id)));
    await t.delete(preAdmissions).where(eq(preAdmissions.id, pre.id)); // notes cascade

    await audit(t, {
      actorUserId,
      action: "test_request.deleted",
      entityType: "pre_admission",
      entityId: pre.id,
      metadata: { reference: pre.reference, admissionReference: adm?.reference ?? null, memberNumber: member?.memberNumber ?? null },
    });
    return { reference: pre.reference, admissionReference: adm?.reference ?? null, memberNumber: member?.memberNumber ?? null };
  });
}


/**
 * TEMPORARY (testing phase): removes a «Ya soy socio/a» request and what it created (a preadmission
 * it came from stays, and can then be deleted on its own). If the request
 * registered a new member, that member goes too, with their account, and the person and DNI when
 * the request created them. A member that was already on the register (imported from the sheet,
 * admitted through the formal process, or linked to the request) is never deleted from here.
 * Audit entries stay. Remove before delivery.
 */
export async function deleteTestExistingMemberRequest(db: Database, actorUserId: string, requestId: string, confirmReference: string) {
  assertAllowed();
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [r] = await t
      .select({ id: existingMemberRequests.id, reference: existingMemberRequests.reference, linkedMemberId: existingMemberRequests.linkedMemberId })
      .from(existingMemberRequests)
      .where(eq(existingMemberRequests.id, requestId));
    if (!r) throw new DeleteNotAllowedError("La solicitud no existe");
    if (confirmReference.trim().toUpperCase() !== r.reference) throw new DeleteNotAllowedError("La referencia no coincide. Escribila tal como aparece arriba.");

    let memberNumber: string | null = null;
    let personToDelete: string | null = null;
    if (r.linkedMemberId) {
      const [registered] = await t
        .select({ metadata: auditLogs.metadata })
        .from(auditLogs)
        .where(and(eq(auditLogs.action, "existing_member.registered"), eq(auditLogs.entityType, "existing_member_request"), eq(auditLogs.entityId, r.id)));
      const [m] = await t
        .select({ id: members.id, userId: members.userId, personId: members.personId, memberNumber: members.memberNumber, importRunId: members.importRunId, admissionId: members.admissionId })
        .from(members)
        .where(eq(members.id, r.linkedMemberId));
      // Only a member this very request registered.
      if (!registered || !m || m.importRunId || m.admissionId) throw new DeleteNotAllowedError("El socio ya estaba en el padrón antes de esta solicitud: no se borra desde acá.");
      const [other] = await t.select({ id: existingMemberRequests.id }).from(existingMemberRequests).where(and(eq(existingMemberRequests.linkedMemberId, m.id), ne(existingMemberRequests.id, r.id)));
      if (other) throw new DeleteNotAllowedError("El socio tiene otras solicitudes vinculadas: revisá el caso antes de borrarlo.");
      memberNumber = m.memberNumber;
      if (registered.metadata?.reusedPerson !== true) personToDelete = m.personId;
      await t.delete(oneTimeTokens).where(and(eq(oneTimeTokens.kind, UPDATE_LINK_KIND), eq(oneTimeTokens.subjectId, r.id)));
      await t.delete(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
      await deleteMemberChain(t, m);
    } else {
      await t.delete(oneTimeTokens).where(and(eq(oneTimeTokens.kind, UPDATE_LINK_KIND), eq(oneTimeTokens.subjectId, r.id)));
      await t.delete(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    }
    if (personToDelete) {
      // Created by this request and used by nothing else now: the person and DNI go too.
      const [usedByAdmission] = await t.select({ id: admissions.id }).from(admissions).where(eq(admissions.personId, personToDelete));
      const [usedByMember] = await t.select({ id: members.id }).from(members).where(eq(members.personId, personToDelete));
      const [usedByRequest] = await t.select({ id: existingMemberRequests.id }).from(existingMemberRequests).where(eq(existingMemberRequests.linkedPersonId, personToDelete));
      if (!usedByAdmission && !usedByMember && !usedByRequest) await t.delete(persons).where(eq(persons.id, personToDelete)); // DNI identity cascades
    }

    await audit(t, { actorUserId, action: "test_request.deleted", entityType: "existing_member_request", entityId: r.id, metadata: { reference: r.reference, memberNumber } });
    return { reference: r.reference, memberNumber };
  });
}
