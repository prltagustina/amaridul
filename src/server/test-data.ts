import { and, eq, or } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { admissionDecisions, admissions, auditLogs, members, oneTimeTokens, persons, preAdmissions, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { INVITATION_KIND } from "@/server/pre-admissions";

export class DeleteNotAllowedError extends Error {}

/**
 * TEMPORARY (testing phase): removes a test request and everything that came from it: the
 * preadmission with its notes and invitation links, the formal request and its decisions, the
 * person and DNI, and the member with their account, sessions and activation links. Audit
 * entries stay; the deleted account's own entries keep no reference to it. Remove before delivery.
 */
export async function deleteTestRequest(db: Database, actorUserId: string, preAdmissionId: string, confirmReference: string) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [pre] = await t.select({ id: preAdmissions.id, reference: preAdmissions.reference }).from(preAdmissions).where(eq(preAdmissions.id, preAdmissionId));
    if (!pre) throw new DeleteNotAllowedError("La solicitud no existe");
    if (confirmReference.trim().toUpperCase() !== pre.reference) throw new DeleteNotAllowedError("La referencia no coincide");

    const [adm] = await t.select({ id: admissions.id, reference: admissions.reference, personId: admissions.personId }).from(admissions).where(eq(admissions.preAdmissionId, pre.id));
    const [member] = adm ? await t.select({ id: members.id, userId: members.userId, memberNumber: members.memberNumber }).from(members).where(eq(members.admissionId, adm.id)) : [];

    if (member) {
      // Never through this path: an admin account is not a test member.
      const [u] = await t.select({ role: user.role }).from(user).where(eq(user.id, member.userId));
      if (u?.role !== "MEMBER") throw new DeleteNotAllowedError("La cuenta no es de socio");
      await t.delete(oneTimeTokens).where(or(eq(oneTimeTokens.userId, member.userId), eq(oneTimeTokens.subjectId, member.id)));
      await t.delete(members).where(eq(members.id, member.id));
      await t.update(auditLogs).set({ actorUserId: null }).where(eq(auditLogs.actorUserId, member.userId));
      await t.delete(user).where(eq(user.id, member.userId)); // sessions, accounts, lockouts cascade
    }
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

