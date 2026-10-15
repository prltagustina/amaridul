// Existing members: people who joined Amarí Dul before this system. They update their legajo and get
// digital access through the same member/user/portal as anyone admitted here, without a new admission
// and without a new Comisión decision. Submitting the update grants nothing: an admin verifies it and
// then links it to the member already on file, or registers the member with their historical data.
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { admissions, existingMemberRequests, members, personIdentities, persons, preAdmissions, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookup, dniLookupCandidates, maskDni, normalizeDni } from "@/server/crypto/dni";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import { hashToken } from "@/server/crypto/tokens";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { setPersonDni, type Keyrings } from "@/server/identity/person-identity";
import { accountEmail, sendActivation, nextMemberNumber, type Deps } from "@/server/members";
import { nextReference } from "@/server/references";
import { consumeToken, findLiveToken, issueToken, revokeTokens } from "@/server/tokens/one-time";
import { formalAdmissionOf, INVITATION_KIND } from "@/server/pre-admissions";
import { categoryOptions, provinces } from "@/demo/content";

export type ExistingMemberRequestStatus = (typeof existingMemberRequests.$inferSelect)["status"];

export const UPDATE_LINK_KIND = "existing_member_update";
const UPDATE_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const dniAad = (requestId: string) => `existing_member_requests.dni:${requestId}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export class ExistingMemberError extends Error {}
export class RequestStateError extends ExistingMemberError {}

/** What the person fills in. No category and no admission request: the admin confirms those. */
export const existingMemberInput = z.object({
  nombres: z.string().trim().min(2).max(80),
  apellidos: z.string().trim().min(2).max(80),
  dni: z
    .string()
    .trim()
    .refine((v) => {
      try {
        normalizeDni(v);
        return true;
      } catch {
        return false;
      }
    }),
  email: z.string().trim().toLowerCase().max(200).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  nacimiento: z.iso.date().refine((d) => d < today()),
  domicilio: z.string().trim().min(3).max(160),
  localidad: z.string().trim().min(1).max(120),
  provincia: z.enum(provinces),
  cp: z.string().trim().min(3).max(10),
  numeroSocio: z.string().trim().max(30).optional().default(""),
  privacidad: z.literal(true),
  confirmacion: z.literal(true),
});
export type ExistingMemberInput = z.infer<typeof existingMemberInput>;

/** Data the admin confirms for the member. Historical data that is not available stays empty. */
export const institutionalInput = z
  .object({
    numberMode: z.enum(["historic", "next"]),
    memberNumber: z.string().trim().max(30).optional().default(""),
    category: z.enum(["activo", "adherente", "paciente"]),
    since: z.union([z.iso.date().refine((d) => d <= today()), z.literal("")]),
    minutesReference: z.string().trim().max(200).optional().default(""),
    status: z.enum(["activo", "suspendido", "baja"]),
  })
  .superRefine((v, ctx) => {
    if (v.numberMode === "historic" && !v.memberNumber) ctx.addIssue({ code: "custom", path: ["memberNumber"], message: "Escribí el número de socio histórico." });
  });
export type InstitutionalInput = z.infer<typeof institutionalInput>;

/** Edits the admin can make when linking to a member already on file (the number stays). */
export const linkInput = z.object({
  /**
   * Replace the email and address on file with the ones sent. Off unless the admin ticks it: the
   * activation link goes to the email on file, so a request using someone else's DNI cannot
   * redirect that member's access.
   */
  updateContact: z.boolean().optional().default(false),
  category: z.enum(["activo", "adherente", "paciente"]),
  since: z.union([z.iso.date().refine((d) => d <= today()), z.literal("")]),
  minutesReference: z.string().trim().max(200).optional().default(""),
  status: z.enum(["activo", "suspendido", "baja"]),
});
export type LinkInput = z.infer<typeof linkInput>;

// ---------- Public side ----------

type PublicDeps = { rings: Keyrings; email: EmailSender };

/**
 * Stores an update request (new, or completing one opened from a preadmission through its personal
 * link). Always answers the same, whatever is on file: nothing about other members leaks to the public.
 */
export async function submitExistingMemberRequest(db: Database, deps: PublicDeps, input: ExistingMemberInput, token: string | null, now = new Date()) {
  const dni = normalizeDni(input.dni);
  const lookup = dniLookup(deps.rings.lookup, dni);
  const fullName = `${input.nombres} ${input.apellidos}`;
  const data = {
    fullName,
    firstNames: input.nombres,
    lastNames: input.apellidos,
    email: input.email,
    dniLookup: lookup.value,
    dniLookupKeyVersion: lookup.version,
    birthDate: input.nacimiento,
    address: input.domicilio,
    locality: input.localidad,
    province: input.provincia,
    postalCode: input.cp,
    declaredMemberNumber: input.numeroSocio || null,
    privacyAcceptedAt: now,
    dataConfirmedAt: now,
    submittedAt: now,
    status: "pending_verification" as const,
    updatedAt: now,
  };

  const result = await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    if (token) {
      const used = await consumeToken(t, UPDATE_LINK_KIND, token, now);
      if (!used?.subjectId) return null;
      const [row] = await t
        .update(existingMemberRequests)
        .set({ ...data, dniEncrypted: encryptField(deps.rings.field, dni, dniAad(used.subjectId)) })
        .where(and(eq(existingMemberRequests.id, used.subjectId), eq(existingMemberRequests.status, "awaiting_data")))
        .returning({ id: existingMemberRequests.id, reference: existingMemberRequests.reference });
      if (!row) return null;
      await audit(t, { action: "existing_member.request_received", entityType: "existing_member_request", entityId: row.id, metadata: { reference: row.reference, source: "preadmission" } });
      return row;
    }
    const id = randomUUID();
    const reference = await nextReference(t, "existing_member", "SOC", now);
    await t.insert(existingMemberRequests).values({ id, reference, source: "sumate", ...data, dniEncrypted: encryptField(deps.rings.field, dni, dniAad(id)), createdAt: now });
    await audit(t, { action: "existing_member.request_received", entityType: "existing_member_request", entityId: id, metadata: { reference, source: "sumate" } });
    return { id, reference };
  });
  if (!result) return { ok: false as const, error: "invalid_link" as const };

  try {
    const { subject, text, html } = emailTemplates.existing_member_received({ reference: result.reference, name: input.nombres.split(/\s+/)[0] });
    await deps.email.send({ to: input.email, subject, text, html, template: "existing_member_received", idempotencyKey: `existing_member_received:${result.reference}` });
  } catch (e) {
    console.error("Existing member receipt email failed:", result.reference, e instanceof Error ? e.message : e);
  }
  return { ok: true as const, reference: result.reference };
}

export type UpdateLinkCheck = { status: "ok"; firstName: string; email: string } | { status: "expired" } | { status: "invalid" };

/** What the person sees when opening the personal link. Does not consume it. */
export async function checkUpdateLink(db: Database, token: string, now = new Date()): Promise<UpdateLinkCheck> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { status: "invalid" };
  const live = await findLiveToken(db, UPDATE_LINK_KIND, token, new Date(0));
  if (!live?.subjectId) return { status: "invalid" };
  if (live.expiresAt <= now) return { status: "expired" };
  const [r] = await db.select({ fullName: existingMemberRequests.fullName, email: existingMemberRequests.email, status: existingMemberRequests.status }).from(existingMemberRequests).where(eq(existingMemberRequests.id, live.subjectId));
  if (!r || r.status !== "awaiting_data") return { status: "invalid" };
  return { status: "ok", firstName: r.fullName.split(/\s+/)[0], email: r.email };
}

// ---------- Admin: lists ----------

export async function listExistingMemberRequests(db: Database, rings: Keyrings, status?: ExistingMemberRequestStatus) {
  const rows = await db
    .select({
      dniEncrypted: existingMemberRequests.dniEncrypted,
      id: existingMemberRequests.id,
      reference: existingMemberRequests.reference,
      fullName: existingMemberRequests.fullName,
      email: existingMemberRequests.email,
      declaredMemberNumber: existingMemberRequests.declaredMemberNumber,
      status: existingMemberRequests.status,
      source: existingMemberRequests.source,
      submittedAt: existingMemberRequests.submittedAt,
      createdAt: existingMemberRequests.createdAt,
    })
    .from(existingMemberRequests)
    .where(status ? eq(existingMemberRequests.status, status) : undefined)
    .orderBy(desc(existingMemberRequests.createdAt));
  return rows.map(({ dniEncrypted, ...r }) => ({ ...r, dniMasked: dniEncrypted ? maskDni(decryptField(rings.field, dniEncrypted, dniAad(r.id))) : null }));
}

export async function countExistingMemberRequests(db: Database, statuses: ExistingMemberRequestStatus[]) {
  const [r] = await db.select({ n: count() }).from(existingMemberRequests).where(inArray(existingMemberRequests.status, statuses));
  return Number(r?.n ?? 0);
}

// ---------- Admin: detail and matching ----------

async function loadRequest(db: Database, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [r] = await db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, id));
  return r ?? null;
}

function requestDni(rings: Keyrings, r: typeof existingMemberRequests.$inferSelect): string | null {
  return r.dniEncrypted ? decryptField(rings.field, r.dniEncrypted, dniAad(r.id)) : null;
}

export type MatchReport = {
  /** A member already on file for this DNI: the request must be linked to it, never registered again. */
  member: { id: string; memberNumber: string; name: string; accountStatus: "pending_activation" | "active" | "disabled"; personId: string } | null;
  /** A person on file for this DNI without a member (e.g. an earlier, unfinished admission). */
  personId: string | null;
  /** An admission in progress for the same person: it has to be resolved first. */
  openAdmission: string | null;
  /** The person already has a non-member account (e.g. an admin): registration would collide. */
  otherAccount: boolean;
  /** The number the person declared belongs to a different member. */
  declaredNumberOwner: { id: string; memberNumber: string; name: string } | null;
  /** Other update requests with the same DNI. */
  duplicates: { id: string; reference: string; status: ExistingMemberRequestStatus }[];
  /** Other people on file with the same email (shared emails exist, so it is a warning). */
  emailConflicts: { memberNumber: string | null; name: string }[];
};

/** Finds what is already on file for the request, through the DNI's HMAC lookup (never plaintext). */
export async function matchExistingMember(db: Database, rings: Keyrings, r: typeof existingMemberRequests.$inferSelect): Promise<MatchReport> {
  const dni = requestDni(rings, r);
  const report: MatchReport = { member: null, personId: null, openAdmission: null, otherAccount: false, declaredNumberOwner: null, duplicates: [], emailConflicts: [] };

  if (dni) {
    const lookups = dniLookupCandidates(rings.lookup, dni).map((c) => c.value);
    const [identity] = await db.select({ personId: personIdentities.personId }).from(personIdentities).where(inArray(personIdentities.dniLookup, lookups));
    if (identity) {
      report.personId = identity.personId;
      const [m] = await db
        .select({ id: members.id, memberNumber: members.memberNumber, name: user.name, accountStatus: user.status, personId: members.personId })
        .from(members)
        .innerJoin(user, eq(user.id, members.userId))
        .where(eq(members.personId, identity.personId));
      if (m) report.member = m;
      const [adm] = await db
        .select({ reference: admissions.reference })
        .from(admissions)
        .where(and(eq(admissions.personId, identity.personId), inArray(admissions.status, ["recibida", "comision"])));
      report.openAdmission = adm?.reference ?? null;
      if (!m) {
        const [u] = await db.select({ id: user.id }).from(user).where(eq(user.personId, identity.personId));
        report.otherAccount = !!u;
      }
    }
    report.duplicates = await db
      .select({ id: existingMemberRequests.id, reference: existingMemberRequests.reference, status: existingMemberRequests.status })
      .from(existingMemberRequests)
      .where(and(inArray(existingMemberRequests.dniLookup, lookups), ne(existingMemberRequests.id, r.id)));
  }

  if (r.declaredMemberNumber) {
    const [owner] = await db
      .select({ id: members.id, memberNumber: members.memberNumber, name: user.name })
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(sql`lower(${members.memberNumber}) = lower(${r.declaredMemberNumber})`);
    if (owner && owner.id !== report.member?.id) report.declaredNumberOwner = owner;
  }

  const sameEmail = await db
    .select({ id: persons.id, name: persons.fullName, memberNumber: members.memberNumber })
    .from(persons)
    .leftJoin(members, eq(members.personId, persons.id))
    .where(sql`lower(${persons.email}) = lower(${r.email})`);
  report.emailConflicts = sameEmail.filter((p) => p.id !== report.personId).map((p) => ({ memberNumber: p.memberNumber, name: p.name }));
  return report;
}

export async function getExistingMemberRequest(db: Database, rings: Keyrings, id: string) {
  const r = await loadRequest(db, id);
  if (!r) return null;
  const dni = requestDni(rings, r);
  const [pre] = r.preAdmissionId ? await db.select({ reference: preAdmissions.reference }).from(preAdmissions).where(eq(preAdmissions.id, r.preAdmissionId)) : [];
  const [linked] = r.linkedMemberId
    ? await db
        .select({ id: members.id, memberNumber: members.memberNumber, accountStatus: user.status })
        .from(members)
        .innerJoin(user, eq(user.id, members.userId))
        .where(eq(members.id, r.linkedMemberId))
    : [];
  return {
    request: { ...r, dniEncrypted: undefined, dniLookup: undefined, dniMasked: dni ? maskDni(dni) : null },
    preAdmissionReference: pre?.reference ?? null,
    linkedMember: linked ?? null,
    match: await matchExistingMember(db, rings, r),
  };
}

// ---------- Admin: actions ----------

const OPEN: ExistingMemberRequestStatus[] = ["pending_verification", "needs_review"];

/** Claims the request for a resolution; a second click (or a retried request) finds it already taken. */
async function claim(t: Database, id: string, to: ExistingMemberRequestStatus, actorUserId: string, now: Date, extra: Partial<typeof existingMemberRequests.$inferInsert> = {}) {
  const [row] = await t
    .update(existingMemberRequests)
    .set({ status: to, verifiedAt: now, verifiedBy: actorUserId, updatedAt: now, ...extra })
    .where(and(eq(existingMemberRequests.id, id), inArray(existingMemberRequests.status, OPEN)))
    .returning({ id: existingMemberRequests.id, reference: existingMemberRequests.reference });
  if (!row) throw new RequestStateError("La solicitud ya fue resuelta o cambió de estado. Recargá la página.");
  return row;
}

/** Case B: the person is a member but is not on file. Creates person (or reuses it), account and member. */
export async function registerExistingMember(db: Database, deps: Deps & { rings: Keyrings }, actorUserId: string, id: string, input: InstitutionalInput, now = new Date()) {
  const r = await loadRequest(db, id);
  if (!r || !OPEN.includes(r.status)) throw new RequestStateError("La solicitud ya fue resuelta o cambió de estado. Recargá la página.");
  const dni = requestDni(deps.rings, r);
  if (!dni) throw new ExistingMemberError("La solicitud todavía no tiene DNI.");
  const match = await matchExistingMember(db, deps.rings, r);
  if (match.member) throw new ExistingMemberError(`Ya hay un socio con este DNI (${match.member.memberNumber}): vinculá la solicitud con ese socio.`);
  if (match.openAdmission) throw new ExistingMemberError(`Esta persona tiene una solicitud de admisión en curso (${match.openAdmission}). Resolvela primero.`);
  if (match.otherAccount) throw new ExistingMemberError("Esta persona ya tiene una cuenta que no es de socio. Revisalo antes de registrarla.");

  const created = await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    let memberNumber: string;
    if (input.numberMode === "historic") {
      memberNumber = input.memberNumber;
      const [taken] = await t.select({ id: members.id }).from(members).where(sql`lower(${members.memberNumber}) = lower(${memberNumber})`);
      if (taken) throw new ExistingMemberError(`El número ${memberNumber} ya pertenece a otro socio.`);
    } else {
      memberNumber = await nextMemberNumber(t);
    }
    await claim(t, id, "matched", actorUserId, now);

    let personId = match.personId;
    if (!personId) {
      const [p] = await t
        .insert(persons)
        .values({ fullName: r.fullName, email: r.email, province: r.province, locality: r.locality, createdAt: now, updatedAt: now })
        .returning({ id: persons.id });
      personId = p.id;
      await setPersonDni(t, deps.rings, personId, dni);
    } else {
      await t.update(persons).set({ fullName: r.fullName, email: r.email, province: r.province, locality: r.locality, updatedAt: now }).where(eq(persons.id, personId));
    }
    await t.update(personIdentities).set({ birthDate: r.birthDate, updatedAt: now }).where(eq(personIdentities.personId, personId));

    const [u] = await t
      .insert(user)
      .values({ name: r.fullName, email: accountEmail(memberNumber), role: "MEMBER", status: "pending_activation", personId })
      .returning({ id: user.id });
    const [m] = await t
      .insert(members)
      .values({
        memberNumber,
        personId,
        userId: u.id,
        admissionId: null,
        category: input.category,
        since: input.since || null,
        status: input.status,
        origin: "legacy",
        minutesReference: input.minutesReference || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: members.id });
    await t.update(existingMemberRequests).set({ linkedMemberId: m.id, linkedPersonId: personId }).where(eq(existingMemberRequests.id, id));
    await audit(t, {
      actorUserId,
      action: "existing_member.registered",
      entityType: "existing_member_request",
      entityId: id,
      metadata: { reference: r.reference, memberNumber, numberMode: input.numberMode, category: input.category, since: input.since || null, minutesReference: input.minutesReference || null, status: input.status, reusedPerson: !!match.personId },
    });
    await audit(t, { actorUserId, action: "member.account_created", entityType: "member", entityId: m.id, metadata: { memberNumber, origin: "legacy" } });
    return { memberId: m.id, userId: u.id, memberNumber };
  });

  const sent = await sendActivation(db, deps, { ...created, firstName: r.firstNames?.split(/\s+/)[0] ?? r.fullName.split(/\s+/)[0], to: r.email }, actorUserId, now, "existing");
  await audit(db, { actorUserId, action: "member.activation_sent", entityType: "member", entityId: created.memberId, metadata: { memberNumber: created.memberNumber, emailed: sent.emailed } });
  return { memberNumber: created.memberNumber, ...sent };
}

/** Case A: the member is already on file. Reuses member, person and account; never duplicates them. */
export async function linkExistingMember(db: Database, deps: Deps & { rings: Keyrings }, actorUserId: string, id: string, input: LinkInput, now = new Date()) {
  const r = await loadRequest(db, id);
  if (!r || !OPEN.includes(r.status)) throw new RequestStateError("La solicitud ya fue resuelta o cambió de estado. Recargá la página.");
  const match = await matchExistingMember(db, deps.rings, r);
  if (!match.member) throw new ExistingMemberError("No hay un socio con este DNI para vincular. Registralo como socio existente.");
  const member = match.member;
  const accountActive = member.accountStatus === "active";
  const [onFile] = await db.select({ email: persons.email }).from(persons).where(eq(persons.id, member.personId));
  const updateContact = input.updateContact || !onFile?.email;
  const activationTo = updateContact ? r.email : onFile!.email!;

  const before = await db
    .select({ category: members.category, since: members.since, minutesReference: members.minutesReference, status: members.status })
    .from(members)
    .where(eq(members.id, member.id));
  const next = { category: input.category, since: input.since || null, minutesReference: input.minutesReference || null, status: input.status };

  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    await claim(t, id, accountActive ? "completed" : "matched", actorUserId, now, { linkedMemberId: member.id, linkedPersonId: member.personId });
    // The contact data sent replaces the one on file only when the admin confirmed it.
    if (updateContact) {
      await t.update(persons).set({ email: r.email, province: r.province, locality: r.locality, updatedAt: now }).where(eq(persons.id, member.personId));
      if (r.birthDate) await t.update(personIdentities).set({ birthDate: r.birthDate, updatedAt: now }).where(eq(personIdentities.personId, member.personId));
    }
    await t
      .update(members)
      .set({ ...next, ...(accountActive ? { digitalOnboardingCompletedAt: now } : {}), updatedAt: now })
      .where(eq(members.id, member.id));
    const changed: Record<string, string | null> = {};
    for (const k of ["category", "since", "minutesReference", "status"] as const) {
      if ((before[0]?.[k] ?? null) !== (next[k] ?? null)) {
        changed[`${k}_before`] = before[0]?.[k] ?? null;
        changed[`${k}_after`] = next[k] ?? null;
      }
    }
    await audit(t, { actorUserId, action: "existing_member.linked", entityType: "existing_member_request", entityId: id, metadata: { reference: r.reference, memberNumber: member.memberNumber, accountActive, contactUpdated: updateContact } });
    if (Object.keys(changed).length) await audit(t, { actorUserId, action: "member.institutional_data_updated", entityType: "member", entityId: member.id, metadata: changed });
  });

  if (accountActive || member.accountStatus === "disabled") return { memberNumber: member.memberNumber, account: member.accountStatus, emailed: false };
  const sent = await sendActivation(db, deps, { memberId: member.id, userId: (await memberUser(db, member.id))!, memberNumber: member.memberNumber, firstName: r.fullName.split(/\s+/)[0], to: activationTo }, actorUserId, now, "existing");
  await audit(db, { actorUserId, action: "member.activation_sent", entityType: "member", entityId: member.id, metadata: { memberNumber: member.memberNumber, emailed: sent.emailed } });
  return { memberNumber: member.memberNumber, account: member.accountStatus, ...sent };
}

async function memberUser(db: Database, memberId: string) {
  const [m] = await db.select({ userId: members.userId }).from(members).where(eq(members.id, memberId));
  return m?.userId ?? null;
}

export async function markNeedsReview(db: Database, actorUserId: string, id: string, notes: string, now = new Date()) {
  const note = notes.trim().slice(0, 1000);
  const [row] = await db
    .update(existingMemberRequests)
    .set({ status: "needs_review", adminNotes: note || null, updatedAt: now })
    .where(and(eq(existingMemberRequests.id, id), inArray(existingMemberRequests.status, OPEN)))
    .returning({ reference: existingMemberRequests.reference });
  if (!row) throw new RequestStateError("La solicitud ya fue resuelta o cambió de estado. Recargá la página.");
  await audit(db, { actorUserId, action: "existing_member.needs_review", entityType: "existing_member_request", entityId: id, metadata: { reference: row.reference } });
}

/** "No corresponde": the person is not an existing member. Nothing is created. */
export async function rejectExistingMemberRequest(db: Database, actorUserId: string, id: string, notes: string, now = new Date()) {
  const note = notes.trim().slice(0, 1000);
  const [row] = await db
    .update(existingMemberRequests)
    .set({ status: "rejected", adminNotes: note || null, verifiedAt: now, verifiedBy: actorUserId, closedAt: now, updatedAt: now })
    .where(and(eq(existingMemberRequests.id, id), inArray(existingMemberRequests.status, [...OPEN, "awaiting_data"])))
    .returning({ reference: existingMemberRequests.reference });
  if (!row) throw new RequestStateError("La solicitud ya fue resuelta o cambió de estado. Recargá la página.");
  await audit(db, { actorUserId, action: "existing_member.rejected", entityType: "existing_member_request", entityId: id, metadata: { reference: row.reference } });
}

// ---------- From a preadmission ----------

async function sendUpdateLink(db: Database, deps: Deps, actorUserId: string, r: { id: string; reference: string; fullName: string; email: string }, now: Date) {
  const { token, expiresAt } = await issueToken(db, { kind: UPDATE_LINK_KIND, ttlMs: UPDATE_LINK_TTL_MS, subjectId: r.id, createdBy: actorUserId, revokePrevious: true }, now);
  const url = `${deps.baseURL.replace(/\/$/, "")}/sumate/socio-existente#t=${token}`;
  try {
    const { subject, text, html } = emailTemplates.existing_member_update_link({ name: r.fullName.split(/\s+/)[0], url, expiresAt });
    await deps.email.send({ to: r.email, subject, text, html, template: "existing_member_update_link", idempotencyKey: `existing_member_update_link:${r.reference}:${hashToken(token).slice(0, 16)}` });
    return { expiresAt, emailed: true };
  } catch (e) {
    console.error("Update link email failed:", r.reference, e instanceof Error ? e.message : e);
    return { expiresAt, emailed: false };
  }
}

/**
 * "Es socio existente" on a preadmission: the preadmission is kept (status "derivada"), its
 * invitation link stops working, and an update request is opened. The person gets a personal link
 * to complete the legajo (DNI, address…), since the preadmission did not ask for them.
 */
export async function convertPreAdmission(db: Database, deps: Deps, actorUserId: string, preAdmissionId: string, now = new Date()) {
  const [pre] = await db
    .select({ id: preAdmissions.id, reference: preAdmissions.reference, status: preAdmissions.status, fullName: preAdmissions.fullName, email: preAdmissions.email, province: preAdmissions.province, locality: preAdmissions.locality })
    .from(preAdmissions)
    .where(eq(preAdmissions.id, preAdmissionId));
  if (!pre || pre.status === "cerrada" || pre.status === "derivada") throw new ExistingMemberError("Esta preadmisión ya no se puede derivar.");
  if (await formalAdmissionOf(db, preAdmissionId)) throw new ExistingMemberError("Esta persona ya envió la solicitud formal: resolvela desde Admisiones.");

  const created = await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const moved = await t
      .update(preAdmissions)
      .set({ status: "derivada", statusChangedAt: now, statusChangedBy: actorUserId, updatedAt: now })
      .where(and(eq(preAdmissions.id, pre.id), eq(preAdmissions.status, pre.status)))
      .returning({ id: preAdmissions.id });
    if (!moved.length) throw new ExistingMemberError("La preadmisión cambió de estado. Recargá la página.");
    await revokeTokens(t, INVITATION_KIND, pre.id, now);
    const id = randomUUID();
    const reference = await nextReference(t, "existing_member", "SOC", now);
    await t.insert(existingMemberRequests).values({
      id,
      reference,
      status: "awaiting_data",
      source: "preadmission",
      preAdmissionId: pre.id,
      fullName: pre.fullName,
      email: pre.email,
      province: pre.province,
      locality: pre.locality,
      createdAt: now,
      updatedAt: now,
    });
    await audit(t, { actorUserId, action: "pre_admission.marked_existing_member", entityType: "pre_admission", entityId: pre.id, metadata: { reference: pre.reference, from: pre.status, request: reference } });
    await audit(t, { actorUserId, action: "existing_member.request_created", entityType: "existing_member_request", entityId: id, metadata: { reference, source: "preadmission" } });
    return { id, reference, fullName: pre.fullName, email: pre.email };
  });

  const sent = await sendUpdateLink(db, deps, actorUserId, created, now);
  return { id: created.id, reference: created.reference, ...sent };
}

/** New personal link (the previous one stops working) while the person has not completed the data. */
export async function resendUpdateLink(db: Database, deps: Deps, actorUserId: string, id: string, now = new Date()) {
  const r = await loadRequest(db, id);
  if (!r || r.status !== "awaiting_data") throw new RequestStateError("La persona ya completó sus datos.");
  const sent = await sendUpdateLink(db, deps, actorUserId, r, now);
  await audit(db, { actorUserId, action: "existing_member.update_link_resent", entityType: "existing_member_request", entityId: id, metadata: { reference: r.reference, emailed: sent.emailed } });
  return sent;
}

/** The request opened from a preadmission, for its detail page. */
export async function existingRequestOfPreAdmission(db: Database, preAdmissionId: string) {
  const [r] = await db
    .select({ id: existingMemberRequests.id, reference: existingMemberRequests.reference, status: existingMemberRequests.status })
    .from(existingMemberRequests)
    .where(eq(existingMemberRequests.preAdmissionId, preAdmissionId));
  return r ?? null;
}

export const categoryLabel = (c: string) => categoryOptions.find((o) => o.value === c)?.label ?? c;
