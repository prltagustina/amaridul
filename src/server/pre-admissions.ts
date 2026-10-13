import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { preAdmissionNotes, preAdmissions, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { Keyring } from "@/server/crypto/keyring";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { nextReference } from "@/server/references";
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
    telefono: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v.replace(/\D/g, "").length >= 8),
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
    phone: input.telefono,
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
    const { subject, text } = emailTemplates.pre_admission_received({ reference, name: input.nombre });
    await deps.email.send({ to: input.email, subject, text, template: "pre_admission_received" });
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

/** Which status each one can move to from the panel. Invitation to the formal admission comes next. */
const TRANSITIONS: Record<PreAdmissionStatus, PreAdmissionStatus[]> = {
  recibida: ["en-revision", "cerrada"],
  "en-revision": ["cerrada"],
  invitada: ["cerrada"],
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
