import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { admissions, oneTimeTokens, preAdmissionNotes, preAdmissions, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import { hashToken } from "@/server/crypto/tokens";
import type { Keyring } from "@/server/crypto/keyring";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { nextReference } from "@/server/references";
import { issueToken, revokeTokens } from "@/server/tokens/one-time";
import { interestOptions, provinces, reprocannOptions } from "@/demo/content";

export type PreAdmissionStatus = (typeof preAdmissions.$inferSelect)["status"];

const INTERESTS = interestOptions.map((o) => o.value) as [string, ...string[]];
const HEALTH_INTERESTS = new Set<string>(interestOptions.filter((o) => o.health).map((o) => o.value));
const REPROCANN = reprocannOptions.map((o) => o.value) as [string, ...string[]];
/** Data of a closed preadmission is kept this long, then it is due for deletion (see the admin UI). */
const RETENTION_AFTER_CLOSE_MONTHS = 3;

/** Same rules as the public form; the server is the one that decides. */
export const preAdmissionInput = z
  .object({
    nombre: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().max(200).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    provincia: z.enum(provinces),
    localidad: z.string().trim().min(1).max(120),
    intereses: z.array(z.enum(INTERESTS)).min(1).max(INTERESTS.length),
    reprocann: z.union([z.enum(REPROCANN), z.literal("")]),
    participacion: z.enum(["si", "no"]),
    privacidad: z.literal(true),
  })
  .superRefine((v, ctx) => {
    if (v.intereses.some((i) => HEALTH_INTERESTS.has(i)) && !v.reprocann) {
      ctx.addIssue({ code: "custom", path: ["reprocann"], message: "required" });
    }
  });

export type PreAdmissionInput = z.infer<typeof preAdmissionInput>;

type Motivation = { intereses: string[]; reprocann: string };

const motivationAad = (id: string) => `pre_admissions.motivation:${id}`;

/** Stores a preadmission sent from the public form and sends the acknowledgement email. */
export async function createPreAdmission(
  db: Database,
  deps: { field: Keyring; email: EmailSender },
  input: PreAdmissionInput,
  now = new Date(),
): Promise<{ id: string; reference: string }> {
  const id = randomUUID();
  const reference = await nextReference(db, "pre_admission", "PRE", now);
  const motivation: Motivation = { intereses: [...new Set(input.intereses)], reprocann: input.reprocann };
  await db.insert(preAdmissions).values({
    id,
    reference,
    fullName: input.nombre,
    email: input.email,
    province: input.provincia,
    locality: input.localidad,
    wantsToParticipate: input.participacion === "si",
    motivationEncrypted: encryptField(deps.field, JSON.stringify(motivation), motivationAad(id)),
    privacyAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await audit(db, { action: "pre_admission.received", entityType: "pre_admission", entityId: id, metadata: { reference } });

  // The request is already stored: a failed email must not lose it. The team still sees it in the panel.
  try {
    const { subject, text, html } = emailTemplates.pre_admission_received({ reference, name: input.nombre });
    await deps.email.send({ to: input.email, subject, text, html, template: "pre_admission_received", idempotencyKey: `pre_admission_received:${reference}` });
  } catch (e) {
    console.error("Pre-admission email failed:", reference, e instanceof Error ? e.message : e);
  }
  return { id, reference };
}

export async function listPreAdmissions(db: Database, status?: PreAdmissionStatus) {
  return db
    .select({
      id: preAdmissions.id,
      reference: preAdmissions.reference,
      fullName: preAdmissions.fullName,
      province: preAdmissions.province,
      status: preAdmissions.status,
      createdAt: preAdmissions.createdAt,
    })
    .from(preAdmissions)
    .where(status ? eq(preAdmissions.status, status) : undefined)
    .orderBy(desc(preAdmissions.createdAt));
}

export async function countPreAdmissions(db: Database, statuses: PreAdmissionStatus[]): Promise<number> {
  const [row] = await db.select({ n: count() }).from(preAdmissions).where(inArray(preAdmissions.status, statuses));
  return Number(row?.n ?? 0);
}

export async function getPreAdmission(db: Database, field: Keyring, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db.select().from(preAdmissions).where(eq(preAdmissions.id, id));
  if (!row) return null;
  const motivation = JSON.parse(decryptField(field, row.motivationEncrypted, motivationAad(row.id))) as Motivation;
  const notes = await db
    .select({ id: preAdmissionNotes.id, body: preAdmissionNotes.body, createdAt: preAdmissionNotes.createdAt, author: user.name })
    .from(preAdmissionNotes)
    .innerJoin(user, eq(user.id, preAdmissionNotes.authorId))
    .where(eq(preAdmissionNotes.preAdmissionId, row.id))
    .orderBy(preAdmissionNotes.createdAt);
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    province: row.province,
    locality: row.locality,
    wantsToParticipate: row.wantsToParticipate,
    closedReason: row.closedReason,
    createdAt: row.createdAt,
    interests: motivation.intereses.map((v) => interestOptions.find((o) => o.value === v)?.label ?? v),
    reprocann: reprocannOptions.find((o) => o.value === motivation.reprocann)?.label ?? null,
    notes,
  };
}

/** Which status each one can move to from the panel. "invitada" → "invitada" is a resend. */
const TRANSITIONS: Record<PreAdmissionStatus, PreAdmissionStatus[]> = {
  recibida: ["en-revision", "invitada", "cerrada"],
  "en-revision": ["invitada", "cerrada"],
  invitada: ["invitada", "cerrada"],
  cerrada: [],
};

export const CLOSE_REASONS = ["Sin respuesta", "No continúa con el proceso", "No corresponde", "Duplicada"] as const;

export class InvalidTransitionError extends Error {}

export async function changePreAdmissionStatus(
  db: Database,
  actorUserId: string,
  id: string,
  next: PreAdmissionStatus,
  opts: { reason?: string } = {},
  now = new Date(),
): Promise<void> {
  // Inviting also issues the link and sends the email: only through inviteToAdmission().
  if (next === "invitada") throw new InvalidTransitionError("La invitación se envía con inviteToAdmission");
  const [row] = await db.select({ status: preAdmissions.status, reference: preAdmissions.reference }).from(preAdmissions).where(eq(preAdmissions.id, id));
  if (!row || !TRANSITIONS[row.status].includes(next)) throw new InvalidTransitionError("Cambio de estado no permitido");
  const closing = next === "cerrada";
  if (closing && !CLOSE_REASONS.includes(opts.reason as (typeof CLOSE_REASONS)[number])) throw new InvalidTransitionError("Falta el motivo de cierre");
  const retentionUntil = new Date(now);
  retentionUntil.setMonth(retentionUntil.getMonth() + RETENTION_AFTER_CLOSE_MONTHS);
  await db
    .update(preAdmissions)
    .set({
      status: next,
      statusChangedAt: now,
      statusChangedBy: actorUserId,
      updatedAt: now,
      ...(closing ? { closedReason: opts.reason, closedAt: now, retentionUntil } : {}),
    })
    // Guard against a concurrent change made from another tab or by another admin.
    .where(and(eq(preAdmissions.id, id), eq(preAdmissions.status, row.status)));
  if (closing) await revokeTokens(db, INVITATION_KIND, id, now);
  await audit(db, {
    actorUserId,
    action: "pre_admission.status_changed",
    entityType: "pre_admission",
    entityId: id,
    metadata: { reference: row.reference, from: row.status, to: next },
  });
}

export async function addPreAdmissionNote(db: Database, authorId: string, id: string, body: string): Promise<void> {
  const text = body.trim().slice(0, 1000);
  if (!text) return;
  await db.insert(preAdmissionNotes).values({ preAdmissionId: id, authorId, body: text });
  await audit(db, { actorUserId: authorId, action: "pre_admission.note_added", entityType: "pre_admission", entityId: id });
}

// ───────────── Invitation to the formal admission ─────────────

export const INVITATION_KIND = "admission_invitation";
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sends (or resends) the personal link to the formal admission. The token travels in the URL
 * fragment, so it never reaches server logs or other sites; only its SHA-256 is stored, and a
 * resend revokes the previous link.
 */
export async function inviteToAdmission(
  db: Database,
  deps: { email: EmailSender; baseURL: string },
  actorUserId: string,
  id: string,
  now = new Date(),
): Promise<{ expiresAt: Date; emailed: boolean }> {
  const [row] = await db
    .select({ status: preAdmissions.status, reference: preAdmissions.reference, fullName: preAdmissions.fullName, email: preAdmissions.email })
    .from(preAdmissions)
    .where(eq(preAdmissions.id, id));
  if (!row || !TRANSITIONS[row.status].includes("invitada")) throw new InvalidTransitionError("Esta solicitud no se puede invitar");
  if (await formalAdmissionOf(db, id)) throw new InvalidTransitionError("La solicitud formal ya fue enviada");
  const resend = row.status === "invitada";

  const { token, expiresAt } = await issueToken(db, { kind: INVITATION_KIND, ttlMs: INVITATION_TTL_MS, subjectId: id, createdBy: actorUserId, revokePrevious: true }, now);
  await db
    .update(preAdmissions)
    .set({ status: "invitada", statusChangedAt: now, statusChangedBy: actorUserId, updatedAt: now })
    .where(and(eq(preAdmissions.id, id), eq(preAdmissions.status, row.status)));
  await audit(db, {
    actorUserId,
    action: resend ? "pre_admission.invitation_resent" : "pre_admission.invited",
    entityType: "pre_admission",
    entityId: id,
    metadata: { reference: row.reference, from: row.status },
  });

  const url = `${deps.baseURL.replace(/\/$/, "")}/admision#t=${token}`;
  try {
    const { subject, text, html } = emailTemplates.admission_invitation({ name: row.fullName, url, expiresAt });
    await deps.email.send({ to: row.email, subject, text, html, template: "admission_invitation", idempotencyKey: `admission_invitation:${hashToken(token).slice(0, 16)}` });
    return { expiresAt, emailed: true };
  } catch (e) {
    console.error("Invitation email failed:", row.reference, e instanceof Error ? e.message : e);
    return { expiresAt, emailed: false };
  }
}

export type InvitationCheck =
  | { status: "ok"; reference: string; firstName: string; email: string; expiresAt: Date }
  | { status: "expired" }
  | { status: "invalid" };

/** What the person sees when opening the link. Does not consume it: the formal request does. */
export async function checkInvitation(db: Database, token: string, now = new Date()): Promise<InvitationCheck> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { status: "invalid" };
  const [t] = await db
    .select({ subjectId: oneTimeTokens.subjectId, expiresAt: oneTimeTokens.expiresAt, usedAt: oneTimeTokens.usedAt, revokedAt: oneTimeTokens.revokedAt })
    .from(oneTimeTokens)
    .where(and(eq(oneTimeTokens.tokenHash, hashToken(token)), eq(oneTimeTokens.kind, INVITATION_KIND)));
  if (!t || t.usedAt || t.revokedAt || !t.subjectId) return { status: "invalid" };
  if (t.expiresAt <= now) return { status: "expired" };
  const [pre] = await db
    .select({ reference: preAdmissions.reference, fullName: preAdmissions.fullName, email: preAdmissions.email, status: preAdmissions.status })
    .from(preAdmissions)
    .where(eq(preAdmissions.id, t.subjectId));
  if (!pre || pre.status !== "invitada") return { status: "invalid" };
  return { status: "ok", reference: pre.reference, firstName: pre.fullName.split(/\s+/)[0], email: pre.email, expiresAt: t.expiresAt };
}

/** Latest invitation link sent for a preadmission, for the admin panel. */
export async function latestInvitation(db: Database, id: string) {
  const [t] = await db
    .select({ createdAt: oneTimeTokens.createdAt, expiresAt: oneTimeTokens.expiresAt, usedAt: oneTimeTokens.usedAt })
    .from(oneTimeTokens)
    .where(and(eq(oneTimeTokens.kind, INVITATION_KIND), eq(oneTimeTokens.subjectId, id), isNull(oneTimeTokens.revokedAt)))
    .orderBy(desc(oneTimeTokens.createdAt))
    .limit(1);
  return t ?? null;
}

/** The formal request sent from this preadmission's invitation, if any. */
export async function formalAdmissionOf(db: Database, preAdmissionId: string) {
  const [a] = await db.select({ id: admissions.id, reference: admissions.reference }).from(admissions).where(eq(admissions.preAdmissionId, preAdmissionId));
  return a ?? null;
}
