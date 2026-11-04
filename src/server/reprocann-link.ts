// The REPROCANN «código de vinculación»: the member sends it from their space (or an admin records
// it for members who do not use the portal), the association uses it to link them in REPROCANN,
// and then marks the linkage verified. The code is encrypted and never written to the audit log.
import { and, asc, eq, isNotNull } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { members, persons, reprocannCases, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { Keyring } from "@/server/crypto/keyring";
import { ensureCase } from "@/server/reprocann";
import { todayInArgentina } from "@/lib/credential-validity";

export const linkCodeInput = z
  .string()
  .trim()
  .min(4, "Revisá el código: parece incompleto.")
  .max(40, "Revisá el código: es demasiado largo.")
  .regex(/^[A-Za-z0-9-]+$/, "Escribilo tal como figura: letras y números, sin espacios.");

export class LinkCodeError extends Error {}

const aad = (caseId: string) => `reprocann_cases.link_code:${caseId}`;
/** «AB1•••••»: enough for the member to recognise it, not to read it over a shoulder. */
const masked = (code: string) => `${code.slice(0, 3)}${"•".repeat(Math.max(3, code.length - 3))}`;

/** Records (or, with null, removes) the member's code. A member cannot change it once the linkage is verified. */
export async function setLinkCode(db: Database, field: Keyring, actorUserId: string, memberId: string, code: string | null, now = new Date()): Promise<void> {
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId));
  if (!m) throw new LinkCodeError("El socio no existe.");
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const caseId = await ensureCase(t, actorUserId, memberId, now);
    const [c] = await t.select({ status: reprocannCases.linkageStatus, had: reprocannCases.linkCodeEncrypted }).from(reprocannCases).where(eq(reprocannCases.id, caseId)).for("update");
    const [actor] = await t.select({ role: user.role }).from(user).where(eq(user.id, actorUserId));
    const byMember = actor?.role === "MEMBER";
    if (byMember && c.status === "verificada") throw new LinkCodeError("Tu vinculación ya está verificada. Si algo cambió, consultá con la asociación.");
    await t
      .update(reprocannCases)
      .set({ linkCodeEncrypted: code ? encryptField(field, code, aad(caseId)) : null, linkCodeSentBy: code ? actorUserId : null, linkCodeSentAt: code ? now : null, updatedBy: actorUserId, updatedAt: now })
      .where(eq(reprocannCases.id, caseId));
    await audit(t, {
      actorUserId,
      action: code ? "reprocann.link_code_sent" : "reprocann.link_code_removed",
      entityType: "reprocann_case",
      entityId: caseId,
      metadata: { by: byMember ? "socio" : "administración", replaced: !!c.had },
    });
  });
}

export type MemberLinkage = { verified: boolean; sentOn: string | null; masked: string | null };

/** What the member sees about their linkage: whether it is verified, and the code they sent, masked. */
export async function memberLinkage(db: Database, field: Keyring, memberId: string): Promise<MemberLinkage> {
  const [c] = await db
    .select({ id: reprocannCases.id, status: reprocannCases.linkageStatus, code: reprocannCases.linkCodeEncrypted, sentAt: reprocannCases.linkCodeSentAt })
    .from(reprocannCases)
    .where(eq(reprocannCases.memberId, memberId));
  if (!c) return { verified: false, sentOn: null, masked: null };
  const code = c.code ? decryptField(field, c.code, aad(c.id)) : null;
  return { verified: c.status === "verificada", sentOn: c.sentAt ? todayInArgentina(c.sentAt) : null, masked: code ? masked(code) : null };
}

/** For the admin: the code in full, when and by whom it was sent. */
export async function adminLinkCode(db: Database, field: Keyring, memberId: string) {
  const [c] = await db
    .select({ id: reprocannCases.id, code: reprocannCases.linkCodeEncrypted, sentAt: reprocannCases.linkCodeSentAt, role: user.role })
    .from(reprocannCases)
    .leftJoin(user, eq(user.id, reprocannCases.linkCodeSentBy))
    .where(eq(reprocannCases.memberId, memberId));
  if (!c?.code) return null;
  return { code: decryptField(field, c.code, aad(c.id)), sentOn: c.sentAt ? todayInArgentina(c.sentAt) : null, byMember: c.role === "MEMBER" };
}

/** Members whose code is in and whose linkage is still to do: the association's to-do list. */
export async function pendingLinkages(db: Database) {
  return db
    .select({ memberId: members.id, name: persons.fullName, lastNames: persons.lastNames, firstNames: persons.firstNames, number: members.memberNumber, sentAt: reprocannCases.linkCodeSentAt })
    .from(reprocannCases)
    .innerJoin(members, eq(members.id, reprocannCases.memberId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .where(and(isNotNull(reprocannCases.linkCodeEncrypted), eq(reprocannCases.linkageStatus, "pendiente")))
    .orderBy(asc(reprocannCases.linkCodeSentAt));
}
