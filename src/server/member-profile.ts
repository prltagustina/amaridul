// The member register as the admin sees and edits it. One screen gathers person, membership,
// account, REPROCANN and fee metadata, but each block writes only to its owner table:
// persons / person_identities (identity and contact), members (+ member_numbers) (membership),
// user (digital account), member_fee_settings (fee metadata), member_notes (internal notes).
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import {
  admissions,
  existingMemberRequests,
  memberFeeSettings,
  memberNotes,
  memberNumbers,
  members,
  oneTimeTokens,
  personIdentities,
  persons,
  reprocannCases,
  reprocannDocuments,
  session,
  user,
} from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookupCandidates, maskDni, normalizeDni } from "@/server/crypto/dni";
import { readPersonDni, setPersonDni, type Keyrings } from "@/server/identity/person-identity";
import { ACTIVATION_KIND, deliveryEmail, grantMemberAccess, MemberAccessError, memberNumberTaken, type Deps } from "@/server/members";
import { getReprocann } from "@/server/reprocann";
import { credentialValidity, currentCredential, todayInArgentina } from "@/lib/credential-validity";
import { categoryOptions, provinces } from "@/demo/content";

export class MemberProfileError extends Error {}

export type AccountState = "none" | "pending_activation" | "active" | "disabled";
export type LegajoState = "imported" | "pending_update" | "updated";

const accountOf = (status: string | null): AccountState => (status ?? "none") as AccountState;
/** Admission members came with a full legajo; existing ones are updated once they activate their account. */
function legajoOf(m: { origin: string; importRunId: string | null; digitalOnboardingCompletedAt: Date | null }): LegajoState {
  if (m.origin === "admission" || m.digitalOnboardingCompletedAt) return "updated";
  return m.importRunId ? "imported" : "pending_update";
}
/** Both emails present and different (case and spaces aside): nobody chooses automatically. */
export const emailConflict = (contact: string | null, notification: string | null) =>
  !!contact?.trim() && !!notification?.trim() && contact.trim().toLowerCase() !== notification.trim().toLowerCase();
/** "lucia@example.com" → "lu•••@example.com": enough for the admin to recognise it, not to copy it. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, local.length > 2 ? 2 : 1)}•••@${domain}`;
}

/** Whether another person on file uses this email (contact or admission notifications). Never says who. */
async function emailUsedElsewhere(db: Database, personId: string, email: string) {
  const [contact] = await db
    .select({ id: persons.id })
    .from(persons)
    .where(and(sql`lower(${persons.email}) = lower(${email})`, sql`${persons.id} <> ${personId}`))
    .limit(1);
  if (contact) return true;
  const [notification] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(and(sql`lower(${admissions.notificationEmail}) = lower(${email})`, sql`${admissions.personId} <> ${personId}`))
    .limit(1);
  return !!notification;
}

export type AccessView = {
  state: AccountState;
  /** What is missing to invite: the DNI (it is the login) and an email (where the link goes). */
  missing: "dni" | "email" | null;
  destination: string | null;
  emailShared: boolean;
  lastSentAt: Date | null;
  link: "live" | "expired" | "used" | "revoked" | null;
  linkExpiresAt: Date | null;
  activatedAt: Date | null;
};

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function accessView(db: Database, m: { memberId: string; personId: string; hasDni: boolean; accountStatus: string | null; to: string }, now: Date): Promise<AccessView> {
  const links = await db
    .select({ createdAt: oneTimeTokens.createdAt, expiresAt: oneTimeTokens.expiresAt, usedAt: oneTimeTokens.usedAt, revokedAt: oneTimeTokens.revokedAt })
    .from(oneTimeTokens)
    .where(and(eq(oneTimeTokens.kind, ACTIVATION_KIND), eq(oneTimeTokens.subjectId, m.memberId)))
    .orderBy(desc(oneTimeTokens.createdAt));
  const last = links[0];
  const validEmail = EMAIL_FORMAT.test(m.to);
  return {
    state: accountOf(m.accountStatus),
    missing: !m.hasDni ? "dni" : !validEmail ? "email" : null,
    destination: validEmail ? maskEmail(m.to) : null,
    emailShared: validEmail ? await emailUsedElsewhere(db, m.personId, m.to) : false,
    lastSentAt: last?.createdAt ?? null,
    link: !last ? null : last.usedAt ? "used" : last.revokedAt ? "revoked" : last.expiresAt <= now ? "expired" : "live",
    linkExpiresAt: last?.expiresAt ?? null,
    activatedAt: links.find((l) => l.usedAt)?.usedAt ?? null,
  };
}

export const categoryLabel = (c: string | null) => (c ? (categoryOptions.find((o) => o.value === c)?.label ?? c) : null);

// ---------- Read ----------

/** One row per member for the register list. */
export async function listRegister(db: Database, today = todayInArgentina()) {
  const rows = await db
    .select({
      id: members.id,
      memberNumber: members.memberNumber,
      fullName: persons.fullName,
      firstNames: persons.firstNames,
      lastNames: persons.lastNames,
      category: members.category,
      room: members.room,
      status: members.status,
      origin: members.origin,
      importRunId: members.importRunId,
      digitalOnboardingCompletedAt: members.digitalOnboardingCompletedAt,
      since: members.since,
      accountStatus: user.status,
      caseId: reprocannCases.id,
      permitStatus: reprocannCases.permitStatus,
    })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(user, eq(user.id, members.userId))
    .leftJoin(reprocannCases, eq(reprocannCases.memberId, members.id))
    .orderBy(asc(sql`coalesce(${persons.lastNames}, ${persons.fullName})`), asc(persons.fullName));

  const caseIds = rows.flatMap((r) => (r.caseId ? [r.caseId] : []));
  const docs = caseIds.length
    ? await db
        .select({ caseId: reprocannDocuments.caseId, kind: reprocannDocuments.kind, expiresOn: reprocannDocuments.expiresOn, reviewStatus: reprocannDocuments.reviewStatus, createdAt: reprocannDocuments.createdAt })
        .from(reprocannDocuments)
        .where(inArray(reprocannDocuments.caseId, caseIds))
    : [];

  return rows.map((r) => {
    const credential = currentCredential(docs.filter((d) => d.caseId === r.caseId));
    return {
      id: r.id,
      memberNumber: r.memberNumber,
      name: r.lastNames && r.firstNames ? `${r.lastNames}, ${r.firstNames}` : r.fullName,
      category: r.category,
      room: r.room,
      status: r.status,
      account: accountOf(r.accountStatus),
      legajo: legajoOf(r),
      permitStatus: r.permitStatus,
      validity: credentialValidity(credential, today),
      expiresOn: credential?.expiresOn ?? null,
      review: credential?.reviewStatus ?? null,
    };
  });
}

export async function getMemberProfile(db: Database, rings: Keyrings, id: string, today = todayInArgentina()) {
  if (!z.uuid().safeParse(id).success) return null;
  const [m] = await db
    .select({
      member: members,
      person: persons,
      birthDate: personIdentities.birthDate,
      hasIdentity: personIdentities.personId,
      accountStatus: user.status,
      admissionReference: admissions.reference,
      notificationEmail: admissions.notificationEmail,
    })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(personIdentities, eq(personIdentities.personId, members.personId))
    .leftJoin(user, eq(user.id, members.userId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .where(eq(members.id, id));
  if (!m) return null;

  const dni = m.hasIdentity ? await readPersonDni(db, rings, m.member.personId) : null;
  const [fee] = await db.select().from(memberFeeSettings).where(eq(memberFeeSettings.memberId, id));
  const notes = await db
    .select({ id: memberNotes.id, body: memberNotes.body, source: memberNotes.source, createdAt: memberNotes.createdAt, author: user.name })
    .from(memberNotes)
    .leftJoin(user, eq(user.id, memberNotes.authorId))
    .where(eq(memberNotes.memberId, id))
    .orderBy(desc(memberNotes.createdAt));
  const numbers = await db.select().from(memberNumbers).where(eq(memberNumbers.memberId, id)).orderBy(asc(memberNumbers.assignedAt));
  // What the person declared in their legajo update, to show next to the institutional record.
  const [declared] = await db
    .select({ number: existingMemberRequests.declaredMemberNumber, reference: existingMemberRequests.reference })
    .from(existingMemberRequests)
    .where(and(eq(existingMemberRequests.linkedMemberId, id), isNotNull(existingMemberRequests.declaredMemberNumber)))
    .orderBy(desc(existingMemberRequests.createdAt))
    .limit(1);
  const reprocann = await getReprocann(db, rings.field, id);
  const credential = currentCredential(reprocann?.documents ?? []);
  const access = await accessView(
    db,
    { memberId: id, personId: m.member.personId, hasDni: !!dni, accountStatus: m.accountStatus, to: deliveryEmail({ notificationEmail: m.notificationEmail, email: m.person.email }) },
    new Date(),
  );

  return {
    id,
    personal: { firstNames: m.person.firstNames, lastNames: m.person.lastNames, fullName: m.person.fullName, dniMasked: dni ? maskDni(dni) : null, birthDate: m.birthDate ?? null },
    contact: {
      email: m.person.email,
      phone: m.person.phone,
      address: m.person.address,
      locality: m.person.locality,
      province: m.person.province,
      postalCode: m.person.postalCode,
      // Declared in the admission; system emails go there. Shown when it differs, for manual review.
      notificationEmail: emailConflict(m.person.email, m.notificationEmail) ? m.notificationEmail!.trim() : null,
    },
    membership: {
      memberNumber: m.member.memberNumber,
      category: m.member.category,
      since: m.member.since,
      status: m.member.status,
      minutesReference: m.member.minutesReference,
      origin: m.member.origin,
      room: m.member.room,
      digitalOnboardingCompletedAt: m.member.digitalOnboardingCompletedAt,
      admissionId: m.member.admissionId,
      admissionReference: m.admissionReference,
      previousNumbers: numbers.filter((n) => n.replacedAt).map((n) => n.number),
      declaredNumber: declared?.number ?? null,
      declaredIn: declared?.reference ?? null,
      legajo: legajoOf(m.member),
    },
    account: accountOf(m.accountStatus),
    access,
    fee: { feeEnrollmentDate: fee?.feeEnrollmentDate ?? null, paymentMethod: fee?.paymentMethod ?? null },
    notes,
    reprocann,
    credential: credential ? { ...credential, validity: credentialValidity(credential, today) } : null,
    validity: credentialValidity(credential, today),
  };
}

// ---------- Write: one block at a time ----------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const pastDate = z.union([z.iso.date().refine((d) => d <= todayInArgentina(), "La fecha no puede ser posterior a hoy."), z.literal("")]).transform((v) => v || null);

export const personalInput = z.object({
  firstNames: z.string().trim().min(1, "Escribí el nombre.").max(80),
  lastNames: z.string().trim().min(1, "Escribí el apellido.").max(80),
  birthDate: pastDate,
});
export const contactInput = z.object({
  email: z.union([z.string().trim().toLowerCase().max(200).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Revisá el email."), z.literal("")]).transform((v) => v || null),
  phone: optionalText(40),
  address: optionalText(160),
  locality: optionalText(120),
  province: z.union([z.enum(provinces), z.literal("")]).transform((v) => v || null),
  postalCode: optionalText(10),
});
export const membershipInput = z.object({
  category: z.union([z.enum(["activo", "adherente", "paciente"]), z.literal("")]).transform((v) => v || null),
  since: pastDate,
  status: z.enum(["activo", "suspendido", "baja"]),
  minutesReference: optionalText(200),
  room: optionalText(60),
});
export const feeInput = z.object({
  feeEnrollmentDate: pastDate,
  paymentMethod: optionalText(60),
});
export const memberNumberInput = z
  .string()
  .trim()
  .min(1, "Escribí el número.")
  .max(30)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/, "Usá letras, números, guiones o barras.");

async function personOf(db: Database, memberId: string) {
  const [m] = await db.select({ personId: members.personId, userId: members.userId }).from(members).where(eq(members.id, memberId));
  if (!m) throw new MemberProfileError("El socio no existe.");
  return m;
}

function diff<T extends Record<string, unknown>>(before: T, after: T, keys: (keyof T)[], hidden: (keyof T)[] = []) {
  const meta: Record<string, string | null> = {};
  for (const k of keys) {
    const b = (before[k] ?? null) as string | null;
    const a = (after[k] ?? null) as string | null;
    if (b === a) continue;
    if (hidden.includes(k)) meta[`${String(k)}_changed`] = "true";
    else {
      meta[`${String(k)}_before`] = b;
      meta[`${String(k)}_after`] = a;
    }
  }
  return meta;
}

export async function updatePersonal(db: Database, actorUserId: string, memberId: string, input: z.infer<typeof personalInput>) {
  const { personId, userId } = await personOf(db, memberId);
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [p] = await t.select({ firstNames: persons.firstNames, lastNames: persons.lastNames }).from(persons).where(eq(persons.id, personId));
    const [i] = await t.select({ birthDate: personIdentities.birthDate }).from(personIdentities).where(eq(personIdentities.personId, personId));
    const fullName = `${input.firstNames} ${input.lastNames}`;
    await t.update(persons).set({ firstNames: input.firstNames, lastNames: input.lastNames, fullName, updatedAt: new Date() }).where(eq(persons.id, personId));
    if (input.birthDate !== (i?.birthDate ?? null)) {
      if (!i) throw new MemberProfileError("Cargá primero el DNI: la fecha de nacimiento va con la identidad.");
      await t.update(personIdentities).set({ birthDate: input.birthDate, updatedAt: new Date() }).where(eq(personIdentities.personId, personId));
    }
    // The account shows the person's name; it follows the person.
    if (userId) await t.update(user).set({ name: fullName, updatedAt: new Date() }).where(eq(user.id, userId));
    const meta = diff({ ...p, birthDate: i?.birthDate ?? null }, input, ["firstNames", "lastNames", "birthDate"], ["birthDate"]);
    if (Object.keys(meta).length) await audit(t, { actorUserId, action: "member.personal_updated", entityType: "member", entityId: memberId, metadata: meta });
  });
}

export async function updateContact(db: Database, actorUserId: string, memberId: string, input: z.infer<typeof contactInput>) {
  const { personId } = await personOf(db, memberId);
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [before] = await t
      .select({ email: persons.email, phone: persons.phone, address: persons.address, locality: persons.locality, province: persons.province, postalCode: persons.postalCode })
      .from(persons)
      .where(eq(persons.id, personId));
    await t.update(persons).set({ ...input, updatedAt: new Date() }).where(eq(persons.id, personId));
    // "postalCode" would trip the audit's guard against secret codes: it is logged as "cp".
    const meta = Object.fromEntries(
      Object.entries(diff(before, input, ["email", "phone", "address", "locality", "province", "postalCode"], ["address"])).map(([k, v]) => [k.replace("postalCode", "cp"), v]),
    );
    if (Object.keys(meta).length) await audit(t, { actorUserId, action: "member.contact_updated", entityType: "member", entityId: memberId, metadata: meta });
  });
}

export async function updateMembership(db: Database, actorUserId: string, memberId: string, input: z.infer<typeof membershipInput>) {
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [before] = await t
      .select({ category: members.category, since: members.since, status: members.status, minutesReference: members.minutesReference, room: members.room })
      .from(members)
      .where(eq(members.id, memberId));
    if (!before) throw new MemberProfileError("El socio no existe.");
    await t.update(members).set({ ...input, updatedAt: new Date() }).where(eq(members.id, memberId));
    const meta = diff(before, input, ["category", "since", "status", "minutesReference", "room"]);
    if (Object.keys(meta).length) await audit(t, { actorUserId, action: "member.institutional_data_updated", entityType: "member", entityId: memberId, metadata: meta });
  });
}

/**
 * Corrects the member number. The account is untouched (same user, same login by DNI, same
 * internal email); the old number stays in the history and is never given to anyone else.
 */
export async function changeMemberNumber(db: Database, actorUserId: string, memberId: string, rawNumber: string, now = new Date()) {
  const number = memberNumberInput.parse(rawNumber);
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [m] = await t.select({ memberNumber: members.memberNumber }).from(members).where(eq(members.id, memberId));
    if (!m) throw new MemberProfileError("El socio no existe.");
    if (m.memberNumber?.toLowerCase() === number.toLowerCase() && m.memberNumber === number) return;
    if (await memberNumberTaken(t, number, memberId)) throw new MemberProfileError(`El número ${number} pertenece o perteneció a otro socio: no se reutiliza.`);
    await t.update(memberNumbers).set({ replacedAt: now }).where(and(eq(memberNumbers.memberId, memberId), sql`${memberNumbers.replacedAt} is null`));
    const [own] = await t.select({ id: memberNumbers.id }).from(memberNumbers).where(and(eq(memberNumbers.memberId, memberId), sql`lower(${memberNumbers.number}) = lower(${number})`));
    if (own) await t.update(memberNumbers).set({ number, replacedAt: null, assignedAt: now }).where(eq(memberNumbers.id, own.id));
    else await t.insert(memberNumbers).values({ memberId, number, assignedAt: now });
    await t.update(members).set({ memberNumber: number, updatedAt: now }).where(eq(members.id, memberId));
    await audit(t, { actorUserId, action: "member.number_changed", entityType: "member", entityId: memberId, metadata: { memberNumber_before: m.memberNumber, memberNumber_after: number } });
  });
}

/**
 * Sets or corrects the DNI: normalised, HMAC + AES through the identity module, refused if another
 * person holds it. The new DNI becomes the login; open sessions are closed. Never logged.
 */
export async function changeDni(db: Database, rings: Keyrings, actorUserId: string, memberId: string, rawDni: string) {
  let dni: string;
  try {
    dni = normalizeDni(rawDni);
  } catch {
    throw new MemberProfileError("El DNI no es válido: 7 u 8 números.");
  }
  const { personId, userId } = await personOf(db, memberId);
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const lookups = dniLookupCandidates(rings.lookup, dni).map((c) => c.value);
    const [other] = await t.select({ personId: personIdentities.personId }).from(personIdentities).where(inArray(personIdentities.dniLookup, lookups));
    if (other && other.personId !== personId) throw new MemberProfileError("Ese DNI ya pertenece a otra persona del sistema.");
    if (other) return { changed: false, sessionsRevoked: 0 };
    await setPersonDni(t, rings, personId, dni);
    const revoked = userId ? await t.delete(session).where(eq(session.userId, userId)).returning({ id: session.id }) : [];
    await audit(t, { actorUserId, action: "member.identity_updated", entityType: "member", entityId: memberId, metadata: { sessionsRevoked: revoked.length } });
    return { changed: true, sessionsRevoked: revoked.length };
  });
}

export async function updateFee(db: Database, actorUserId: string, memberId: string, input: z.infer<typeof feeInput>) {
  await personOf(db, memberId);
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [before] = await t.select({ feeEnrollmentDate: memberFeeSettings.feeEnrollmentDate, paymentMethod: memberFeeSettings.paymentMethod }).from(memberFeeSettings).where(eq(memberFeeSettings.memberId, memberId));
    await t
      .insert(memberFeeSettings)
      .values({ memberId, ...input, updatedBy: actorUserId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: memberFeeSettings.memberId, set: { ...input, updatedBy: actorUserId, updatedAt: new Date() } });
    const meta = diff(before ?? { feeEnrollmentDate: null, paymentMethod: null }, input, ["feeEnrollmentDate", "paymentMethod"]);
    if (Object.keys(meta).length) await audit(t, { actorUserId, action: "member.fee_updated", entityType: "member", entityId: memberId, metadata: meta });
  });
}

/** Internal note, append-only. The audit log records that a note was added, never its text. */
export async function addMemberNote(db: Database, actorUserId: string, memberId: string, body: string) {
  const text = body.trim().slice(0, 2000);
  if (!text) throw new MemberProfileError("Escribí la nota.");
  await personOf(db, memberId);
  await db.insert(memberNotes).values({ memberId, authorId: actorUserId, body: text, source: "admin" });
  await audit(db, { actorUserId, action: "member.note_added", entityType: "member", entityId: memberId });
}

/**
 * The admin explicitly invites a member to activate the digital account (one at a time, never
 * automatic): through the same mechanism as «Ya soy socio/a», it creates or links the member's one
 * account and sends a single-use link. If another record uses the same email, the admin has to
 * confirm it first: email is not identity, so it is never resolved silently.
 */
export async function inviteToActivate(db: Database, deps: Deps, actorUserId: string, memberId: string, opts: { confirmSharedEmail?: boolean; now?: Date } = {}) {
  const [m] = await db
    .select({ personId: members.personId, origin: members.origin, email: persons.email, notificationEmail: admissions.notificationEmail })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .where(eq(members.id, memberId));
  if (!m) throw new MemberProfileError("El socio no existe.");
  const to = deliveryEmail(m);
  if (to && !opts.confirmSharedEmail && (await emailUsedElsewhere(db, m.personId, to)))
    throw new MemberProfileError("Ese email también figura en otro registro del padrón. Confirmá con la persona que es el suyo antes de enviar la invitación.");
  try {
    // A member from the register is invited as such; an admitted member gets their approval link again.
    return await grantMemberAccess(db, deps, actorUserId, memberId, { to, wording: m.origin === "legacy" ? "invitation" : "approval", now: opts.now, skipRepeat: true });
  } catch (e) {
    if (e instanceof MemberAccessError) throw new MemberProfileError(e.message);
    throw e;
  }
}
