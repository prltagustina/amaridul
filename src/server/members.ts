import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { account, admissionDecisions, admissions, existingMemberRequests, memberNumbers, members, oneTimeTokens, personIdentities, persons, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookupCandidates, maskDni } from "@/server/crypto/dni";
import { hashToken } from "@/server/crypto/tokens";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/server/auth/password";
import { readPersonDni, type Keyrings } from "@/server/identity/person-identity";
import { consumeToken, issueToken } from "@/server/tokens/one-time";
import { categoryOptions } from "@/demo/content";

export const ACTIVATION_KIND = "member_activation";
const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const decisionInput = z
  .object({
    decision: z.enum(["aprobada", "rechazada", "diferida"]),
    meetingDate: z.iso.date().refine((v) => new Date(v) <= new Date()),
    minutes: z.string().trim().min(1).max(200),
    category: z.union([z.enum(["activo", "adherente", "paciente"]), z.literal("")]),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "aprobada" && !v.category) ctx.addIssue({ code: "custom", path: ["category"], message: "required" });
  });
export type DecisionInput = z.infer<typeof decisionInput>;

export class InvalidDecisionError extends Error {}

/**
 * Member numbers run without year: AD-0001, AD-0002… (same atomic counter as the references).
 * Existing members may keep a historical number typed in by the admin; the counter skips any
 * number already taken, so the two never collide.
 */
export async function nextMemberNumber(db: Database): Promise<string> {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const result = await db.execute<{ last_value: number }>(sql`
      insert into reference_counters (kind, year, last_value) values ('member', 0, 1)
      on conflict (kind, year) do update set last_value = reference_counters.last_value + 1
      returning last_value
    `);
    const rows = (Array.isArray(result) ? result : (result as { rows: { last_value: number }[] }).rows) as { last_value: number }[];
    const candidate = `AD-${String(Number(rows[0].last_value)).padStart(4, "0")}`;
    if (!(await memberNumberTaken(db, candidate))) return candidate;
  }
  throw new Error("No hay números de socio disponibles");
}

/** Whether a number was ever used by any member (current or replaced): such a number is never reused. */
export async function memberNumberTaken(db: Database, number: string, exceptMemberId?: string): Promise<boolean> {
  const rows = await db
    .select({ memberId: memberNumbers.memberId })
    .from(memberNumbers)
    .where(sql`lower(${memberNumbers.number}) = lower(${number})`);
  const current = await db.select({ id: members.id }).from(members).where(sql`lower(${members.memberNumber}) = lower(${number})`);
  return [...rows.map((r) => r.memberId), ...current.map((r) => r.id)].some((id) => id !== exceptMemberId);
}

/** Records a number in the member's history (the number becomes reserved for them for good). */
export async function recordMemberNumber(db: Database, memberId: string, number: string, now = new Date()) {
  await db.insert(memberNumbers).values({ memberId, number, assignedAt: now });
}

/**
 * Member accounts sign in with DNI, never by email, and a person may already have an account with
 * that email (an admin who is also a member). So the account carries an internal address built
 * from the account's own id (stable: correcting the member number never touches it); emails always
 * go to the person's real one (see `memberEmailOf`). Accounts created before this change keep
 * their older "socio.<number>" address, which stays unique because numbers are never reused.
 */
export const accountEmail = (userId: string) => `socio.${userId}@socios.amaridul.invalid`;

/** Creates the member's digital account, pending activation. A member has at most one. */
export async function createMemberAccount(db: Database, m: { memberId: string; personId: string; name: string }) {
  const id = randomUUID();
  await db.insert(user).values({ id, name: m.name, email: accountEmail(id), role: "MEMBER", status: "pending_activation", personId: m.personId });
  const linked = await db.update(members).set({ userId: id, updatedAt: new Date() }).where(and(eq(members.id, m.memberId), isNull(members.userId))).returning({ id: members.id });
  if (!linked.length) throw new InvalidDecisionError("El socio ya tiene una cuenta");
  return id;
}

export type Deps = { email: EmailSender; baseURL: string };

/** "approval" for a new member admitted by the Comisión; "existing" for a member whose legajo was digitalised. */
export type ActivationWording = "approval" | "existing";

export async function sendActivation(
  db: Database,
  deps: Deps,
  m: { memberId: string; userId: string; memberNumber: string | null; firstName: string; to: string },
  actorUserId: string | null,
  now: Date,
  wording: ActivationWording = "approval",
) {
  const { token, expiresAt } = await issueToken(
    db,
    { kind: ACTIVATION_KIND, ttlMs: ACTIVATION_TTL_MS, userId: m.userId, subjectId: m.memberId, createdBy: actorUserId ?? undefined, revokePrevious: true },
    now,
  );
  const url = `${deps.baseURL.replace(/\/$/, "")}/qr/activar#t=${token}`;
  try {
    const template = wording === "existing" ? "existing_member_access" : "admission_approved";
    const { subject, text, html } =
      template === "existing_member_access"
        ? emailTemplates.existing_member_access({ name: m.firstName, memberNumber: m.memberNumber, url, expiresAt })
        : emailTemplates.admission_approved({ name: m.firstName, memberNumber: m.memberNumber ?? "A confirmar", url, expiresAt });
    await deps.email.send({ to: m.to, subject, text, html, template, idempotencyKey: `${template}:${m.memberId}:${hashToken(token).slice(0, 16)}` });
    return { expiresAt, emailed: true };
  } catch (e) {
    console.error("Activation email failed:", m.memberId, e instanceof Error ? e.message : e);
    return { expiresAt, emailed: false };
  }
}

/**
 * Records the Comisión Directiva decision on a request in Comisión. Approving creates the member
 * (number, account pending activation) and emails the activation link; rejecting notifies the
 * person; deferring keeps it in Comisión. Every decision stays on record.
 */
export async function recordDecision(db: Database, deps: Deps, actorUserId: string, admissionId: string, input: DecisionInput, now = new Date()) {
  const [adm] = await db
    .select({
      status: admissions.status,
      reference: admissions.reference,
      personId: admissions.personId,
      firstNames: admissions.firstNames,
      lastNames: admissions.lastNames,
      notificationEmail: admissions.notificationEmail,
      email: persons.email,
    })
    .from(admissions)
    .innerJoin(persons, eq(persons.id, admissions.personId))
    .where(eq(admissions.id, admissionId));
  if (!adm || adm.status !== "comision") throw new InvalidDecisionError("La solicitud no está en Comisión");
  const to = adm.notificationEmail || adm.email || "";
  const firstName = adm.firstNames.split(/\s+/)[0];

  if (input.decision === "diferida") {
    await db.insert(admissionDecisions).values({ admissionId, decision: "diferida", meetingDate: input.meetingDate, minutes: input.minutes, recordedBy: actorUserId, recordedAt: now });
    await audit(db, { actorUserId, action: "admission.deferred", entityType: "admission", entityId: admissionId, metadata: { reference: adm.reference } });
    return { decision: "diferida" as const };
  }

  if (input.decision === "rechazada") {
    await db.transaction(async (tx) => {
      const t = tx as unknown as Database;
      const ok = await t
        .update(admissions)
        .set({ status: "rechazada", statusChangedAt: now, statusChangedBy: actorUserId, updatedAt: now, closedAt: now })
        .where(and(eq(admissions.id, admissionId), eq(admissions.status, "comision")))
        .returning({ id: admissions.id });
      if (!ok.length) throw new InvalidDecisionError("La solicitud cambió de estado");
      await t.insert(admissionDecisions).values({ admissionId, decision: "rechazada", meetingDate: input.meetingDate, minutes: input.minutes, recordedBy: actorUserId, recordedAt: now });
      await audit(t, { actorUserId, action: "admission.rejected", entityType: "admission", entityId: admissionId, metadata: { reference: adm.reference } });
    });
    try {
      const { subject, text, html } = emailTemplates.admission_rejected({ name: firstName });
      await deps.email.send({ to, subject, text, html, template: "admission_rejected", idempotencyKey: `admission_rejected:${adm.reference}` });
    } catch (e) {
      console.error("Rejection email failed:", adm.reference, e instanceof Error ? e.message : e);
    }
    return { decision: "rechazada" as const };
  }

  const category = input.category as "activo" | "adherente" | "paciente";
  const created = await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const ok = await t
      .update(admissions)
      .set({ status: "aprobada", statusChangedAt: now, statusChangedBy: actorUserId, updatedAt: now })
      .where(and(eq(admissions.id, admissionId), eq(admissions.status, "comision")))
      .returning({ id: admissions.id });
    if (!ok.length) throw new InvalidDecisionError("La solicitud cambió de estado");
    await t.insert(admissionDecisions).values({
      admissionId,
      decision: "aprobada",
      meetingDate: input.meetingDate,
      minutes: input.minutes,
      approvedCategory: category,
      recordedBy: actorUserId,
      recordedAt: now,
    });
    const memberNumber = await nextMemberNumber(t);
    // The person owns names and address: the admission keeps what was submitted. The contact email
    // is only completed, never replaced; the notification email stays on the admission.
    const [submitted] = await t.select({ address: admissions.address, postalCode: admissions.postalCode, email: persons.email }).from(admissions).innerJoin(persons, eq(persons.id, admissions.personId)).where(eq(admissions.id, admissionId));
    await t
      .update(persons)
      .set({ firstNames: adm.firstNames, lastNames: adm.lastNames, fullName: `${adm.firstNames} ${adm.lastNames}`, address: submitted.address, postalCode: submitted.postalCode, ...(!submitted.email?.trim() && adm.notificationEmail ? { email: adm.notificationEmail } : {}), updatedAt: now })
      .where(eq(persons.id, adm.personId));
    const [m] = await t
      .insert(members)
      .values({ memberNumber, personId: adm.personId, admissionId, category, since: input.meetingDate, createdAt: now, updatedAt: now })
      .returning({ id: members.id });
    await recordMemberNumber(t, m.id, memberNumber, now);
    const userId = await createMemberAccount(t, { memberId: m.id, personId: adm.personId, name: `${adm.firstNames} ${adm.lastNames}` });
    const u = { id: userId };
    await audit(t, { actorUserId, action: "admission.approved", entityType: "admission", entityId: admissionId, metadata: { reference: adm.reference, memberNumber, category } });
    return { memberId: m.id, userId: u.id, memberNumber };
  });

  const sent = await sendActivation(db, deps, { ...created, firstName, to }, actorUserId, now);
  return { decision: "aprobada" as const, memberNumber: created.memberNumber, ...sent };
}

/** Sends a new activation link (the previous one stops working) while the account is not active yet. */
/** `actorUserId` is the admin who resends it, or null when the person asks for it (password recovery). */
export async function resendActivation(db: Database, deps: Deps, actorUserId: string | null, memberId: string, now = new Date()) {
  const [m] = await db
    .select({ memberId: members.id, userId: user.id, memberNumber: members.memberNumber, origin: members.origin, userStatus: user.status, fullName: user.name, notificationEmail: admissions.notificationEmail, email: persons.email })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .where(eq(members.id, memberId));
  if (!m || m.userStatus !== "pending_activation") throw new InvalidDecisionError("La cuenta ya está activa");
  const sent = await sendActivation(
    db,
    deps,
    { memberId: m.memberId, userId: m.userId, memberNumber: m.memberNumber, firstName: m.fullName.split(/\s+/)[0], to: deliveryEmail(m) },
    actorUserId,
    now,
    m.origin === "legacy" ? "existing" : "approval",
  );
  await audit(db, { actorUserId, action: "member.activation_resent", entityType: "member", entityId: memberId, metadata: { memberNumber: m.memberNumber } });
  return sent;
}

export type ActivationCheck = { status: "ok"; firstName: string; memberNumber: string | null; dniMasked: string } | { status: "expired" } | { status: "invalid" };

/** What the person sees when opening the activation link. Does not consume it. */
export async function checkActivation(db: Database, rings: Keyrings, token: string, now = new Date()): Promise<ActivationCheck> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { status: "invalid" };
  const [t] = await db
    .select({ userId: oneTimeTokens.userId, expiresAt: oneTimeTokens.expiresAt, usedAt: oneTimeTokens.usedAt, revokedAt: oneTimeTokens.revokedAt })
    .from(oneTimeTokens)
    .where(and(eq(oneTimeTokens.tokenHash, hashToken(token)), eq(oneTimeTokens.kind, ACTIVATION_KIND)));
  if (!t?.userId || t.usedAt || t.revokedAt) return { status: "invalid" };
  if (t.expiresAt <= now) return { status: "expired" };
  const [m] = await db
    .select({ memberNumber: members.memberNumber, personId: members.personId, name: user.name, status: user.status })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.userId, t.userId));
  if (!m || m.status !== "pending_activation") return { status: "invalid" };
  const dni = await readPersonDni(db, rings, m.personId);
  return { status: "ok", firstName: m.name.split(/\s+/)[0], memberNumber: m.memberNumber, dniMasked: dni ? maskDni(dni) : "—" };
}

export type ActivateResult = { ok: true } | { ok: false; error: "invalid_link" | "weak_password" };

/** Creates the password and activates the account; the link is consumed in the same transaction. */
export async function activateAccount(db: Database, token: string, password: string, now = new Date()): Promise<ActivateResult> {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return { ok: false, error: "weak_password" };
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const used = await consumeToken(t, ACTIVATION_KIND, token, now);
    if (!used?.userId) return { ok: false as const, error: "invalid_link" as const };
    const activated = await t
      .update(user)
      .set({ status: "active", updatedAt: now })
      .where(and(eq(user.id, used.userId), eq(user.status, "pending_activation"), eq(user.role, "MEMBER")))
      .returning({ id: user.id });
    if (!activated.length) throw new InvalidDecisionError("La cuenta no está pendiente de activación");
    await t.insert(account).values({ userId: used.userId, accountId: used.userId, providerId: "credential", password: passwordHash });
    await audit(t, { actorUserId: used.userId, action: "member.activated", entityType: "user", entityId: used.userId });
    // An existing member finishes the digital update here: the historical admission date stays as it was.
    const [m] = await t.select({ id: members.id, origin: members.origin }).from(members).where(eq(members.userId, used.userId));
    if (m?.origin === "legacy") {
      await t.update(members).set({ digitalOnboardingCompletedAt: now, updatedAt: now }).where(eq(members.id, m.id));
      const done = await t
        .update(existingMemberRequests)
        .set({ status: "completed", updatedAt: now })
        .where(and(eq(existingMemberRequests.linkedMemberId, m.id), eq(existingMemberRequests.status, "matched")))
        .returning({ id: existingMemberRequests.id });
      for (const r of done) await audit(t, { actorUserId: used.userId, action: "existing_member.completed", entityType: "existing_member_request", entityId: r.id });
    }
    return { ok: true as const };
  });
}

/** The member behind a signed-in account, for the member portal. */
export async function memberOfUser(db: Database, userId: string) {
  const [m] = await db
    .select({ id: members.id, memberNumber: members.memberNumber, category: members.category, since: members.since, status: members.status, name: user.name })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.userId, userId));
  if (!m) return null;
  return {
    ...m,
    firstName: m.name.split(/\s+/)[0],
    categoryLabel: categoryOptions.find((c) => c.value === m.category)?.label ?? m.category,
  };
}

/**
 * Where the system writes to a member: the notification email they declared in their admission,
 * if any, otherwise the person's contact email (unchanged rule; persons.email stays the canonical
 * contact and a difference between the two is shown to the admin for review).
 */
export const deliveryEmail = (r: { notificationEmail?: string | null; email: string | null }) => r.notificationEmail?.trim() || r.email || "";

/** Real address for emails to a member account (the account itself carries an internal one). */
export async function memberEmailOf(db: Database, userId: string): Promise<string | null> {
  const [r] = await db
    .select({ notificationEmail: admissions.notificationEmail, email: persons.email })
    .from(members)
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .where(eq(members.userId, userId));
  return r ? deliveryEmail(r) || null : null;
}

export async function listMembers(db: Database) {
  return db
    .select({ id: members.id, memberNumber: members.memberNumber, name: persons.fullName, category: members.category, since: members.since, status: members.status, accountStatus: user.status })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(user, eq(user.id, members.userId))
    .orderBy(desc(members.createdAt));
}

export async function getMember(db: Database, rings: Keyrings, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [m] = await db
    .select({
      id: members.id,
      memberNumber: members.memberNumber,
      personId: members.personId,
      category: members.category,
      since: members.since,
      status: members.status,
      name: persons.fullName,
      accountStatus: user.status,
      origin: members.origin,
      minutesReference: members.minutesReference,
      digitalOnboardingCompletedAt: members.digitalOnboardingCompletedAt,
      admissionId: admissions.id,
      admissionReference: admissions.reference,
      email: persons.email,
      phone: persons.phone,
    })
    .from(members)
    .leftJoin(user, eq(user.id, members.userId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .where(eq(members.id, id));
  if (!m) return null;
  const dni = await readPersonDni(db, rings, m.personId);
  return { ...m, dniMasked: dni ? maskDni(dni) : "—", categoryLabel: categoryOptions.find((c) => c.value === m.category)?.label ?? m.category };
}

/** Latest decision on a request, for the admin detail. */
export async function latestDecision(db: Database, admissionId: string) {
  const [d] = await db
    .select({ decision: admissionDecisions.decision, meetingDate: admissionDecisions.meetingDate, minutes: admissionDecisions.minutes, approvedCategory: admissionDecisions.approvedCategory, recordedAt: admissionDecisions.recordedAt })
    .from(admissionDecisions)
    .where(eq(admissionDecisions.admissionId, admissionId))
    .orderBy(desc(admissionDecisions.recordedAt))
    .limit(1);
  return d ?? null;
}

export async function memberOfAdmission(db: Database, admissionId: string) {
  const [m] = await db.select({ id: members.id, memberNumber: members.memberNumber, accountStatus: user.status }).from(members).innerJoin(user, eq(user.id, members.userId)).where(eq(members.admissionId, admissionId));
  return m ?? null;
}

/** Active member account for a DNI, for password recovery. Null for unknown, inactive or malformed. */
/** The member account behind a DNI, whatever its state (active, pending activation…). */
export async function memberAccountByDni(db: Database, rings: Keyrings, rawDni: string) {
  let lookups: string[];
  try {
    lookups = dniLookupCandidates(rings.lookup, rawDni).map((c) => c.value);
  } catch {
    return null;
  }
  const [r] = await db
    .select({ userId: user.id, email: user.email, status: user.status, memberId: members.id })
    .from(personIdentities)
    .innerJoin(user, and(eq(user.personId, personIdentities.personId), eq(user.role, "MEMBER")))
    .innerJoin(members, eq(members.userId, user.id))
    .where(inArray(personIdentities.dniLookup, lookups));
  return r ?? null;
}

export async function activeMemberAccountByDni(db: Database, rings: Keyrings, rawDni: string) {
  const r = await memberAccountByDni(db, rings, rawDni);
  return r && r.status === "active" ? r : null;
}
