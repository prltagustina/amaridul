import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { admissions, personIdentities, persons, preAdmissions } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookupCandidates, maskDni, normalizeDni } from "@/server/crypto/dni";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { readPersonDni, setPersonDni, type Keyrings } from "@/server/identity/person-identity";
import { nextReference } from "@/server/references";
import { consumeToken, findLiveToken } from "@/server/tokens/one-time";
import { INVITATION_KIND } from "@/server/pre-admissions";
import { categoryOptions, provinces, reprocannOptions } from "@/demo/content";

export type AdmissionStatus = (typeof admissions.$inferSelect)["status"];
export type AdmissionCategory = (typeof admissions.$inferSelect)["category"];

/** Until the statute is loaded as a versioned legal text, acceptances record this placeholder version. */
export const STATUTE_VERSION = "pendiente-de-carga";

const REPROCANN = reprocannOptions.map((o) => o.value) as [string, ...string[]];
const email = z.string().trim().toLowerCase().max(200).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
const accepted = z.literal(true);

/** Same rules as the wizard; the server is the one that decides. */
export const admissionInput = z
  .object({
    nombres: z.string().trim().min(1).max(120),
    apellidos: z.string().trim().min(1).max(120),
    dni: z.string().refine((v) => {
      try {
        normalizeDni(v);
        return true;
      } catch {
        return false;
      }
    }),
    nacimiento: z.iso.date().refine((v) => new Date(v) < new Date() && new Date(v) > new Date("1900-01-01")),
    nacionalidad: z.string().trim().min(1).max(80),
    domicilio: z.string().trim().min(1).max(200),
    localidad: z.string().trim().min(1).max(120),
    provincia: z.enum(provinces),
    cp: z.string().trim().min(1).max(12),
    email,
    telefono: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v.replace(/\D/g, "").length >= 8),
    emailNotificaciones: z.union([email, z.literal("")]),
    categoria: z.enum(["activo", "adherente", "paciente"]),
    interes: z.string().trim().max(2000),
    obligaciones: accepted,
    pacienteAcompanamiento: z.boolean(),
    pacienteReprocann: z.union([z.enum(REPROCANN), z.literal("")]),
    pacienteInformado: z.boolean(),
    estatuto: accepted,
    cuota: accepted,
    veracidad: accepted,
    cambios: accepted,
    datos: accepted,
    novedades: z.boolean(),
    confirmacion: accepted,
  })
  .superRefine((v, ctx) => {
    if (v.categoria !== "paciente") return;
    if (!v.pacienteReprocann) ctx.addIssue({ code: "custom", path: ["pacienteReprocann"], message: "required" });
    if (!v.pacienteInformado) ctx.addIssue({ code: "custom", path: ["pacienteInformado"], message: "required" });
  });

export type AdmissionInput = z.infer<typeof admissionInput>;

type Health = { interes: string; paciente: { acompanamiento: boolean; reprocann: string; informado: boolean } | null };
const healthAad = (id: string) => `admissions.health:${id}`;

export type SubmitAdmissionResult = { ok: true; reference: string } | { ok: false; error: "invalid_link" | "dni_registered" };

class LinkAlreadyUsedError extends Error {}

/**
 * Stores the formal request sent from the invitation link. The link is consumed in the same
 * transaction, so a request is stored exactly once and a used link stops working.
 */
export async function submitAdmission(
  db: Database,
  deps: { rings: Keyrings; email: EmailSender },
  token: string,
  input: AdmissionInput,
  now = new Date(),
): Promise<SubmitAdmissionResult> {
  const live = await findLiveToken(db, INVITATION_KIND, token, now);
  if (!live?.subjectId) return { ok: false, error: "invalid_link" };
  const [pre] = await db.select({ id: preAdmissions.id, status: preAdmissions.status }).from(preAdmissions).where(eq(preAdmissions.id, live.subjectId));
  if (!pre || pre.status !== "invitada") return { ok: false, error: "invalid_link" };

  // One person per DNI: a DNI already on file (another request or a member) is not loaded twice.
  const lookups = dniLookupCandidates(deps.rings.lookup, input.dni).map((c) => c.value);
  const existing = await db.select({ id: personIdentities.personId }).from(personIdentities).where(inArray(personIdentities.dniLookup, lookups));
  if (existing.length) return { ok: false, error: "dni_registered" };

  const id = randomUUID();
  const fullName = `${input.nombres} ${input.apellidos}`;
  const health: Health = {
    interes: input.interes,
    paciente:
      input.categoria === "paciente"
        ? { acompanamiento: input.pacienteAcompanamiento, reprocann: input.pacienteReprocann, informado: input.pacienteInformado }
        : null,
  };

  let reference: string;
  try {
    reference = await db.transaction(async (tx) => {
      const t = tx as unknown as Database;
      if (!(await consumeToken(t, INVITATION_KIND, token, now))) throw new LinkAlreadyUsedError();
      const ref = await nextReference(t, "admission", "ADM", now);
      const [person] = await t
        .insert(persons)
        .values({ fullName, email: input.email, phone: input.telefono, province: input.provincia, locality: input.localidad })
        .returning({ id: persons.id });
      await setPersonDni(t, deps.rings, person.id, input.dni);
      await t.update(personIdentities).set({ birthDate: input.nacimiento, nationality: input.nacionalidad }).where(eq(personIdentities.personId, person.id));
      await t.insert(admissions).values({
        id,
        reference: ref,
        preAdmissionId: pre.id,
        personId: person.id,
        firstNames: input.nombres,
        lastNames: input.apellidos,
        address: input.domicilio,
        postalCode: input.cp,
        notificationEmail: input.emailNotificaciones || null,
        category: input.categoria,
        healthEncrypted: encryptField(deps.rings.field, JSON.stringify(health), healthAad(id)),
        statuteVersion: STATUTE_VERSION,
        obligationsAcceptedAt: now,
        statuteAcceptedAt: now,
        feeAcknowledgedAt: now,
        truthfulnessDeclaredAt: now,
        changesCommitmentAt: now,
        privacyAcceptedAt: now,
        newsOptIn: input.novedades,
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await audit(t, { action: "admission.received", entityType: "admission", entityId: id, metadata: { reference: ref, category: input.categoria } });
      return ref;
    });
  } catch (e) {
    if (e instanceof LinkAlreadyUsedError) return { ok: false, error: "invalid_link" };
    // A concurrent request with the same DNI loses the race on the unique lookup.
    if (String((e as { cause?: unknown })?.cause ?? e).includes("person_identities_dni_lookup_unique")) return { ok: false, error: "dni_registered" };
    throw e;
  }

  try {
    const { subject, text } = emailTemplates.admission_received({ reference, name: input.nombres });
    await deps.email.send({ to: input.emailNotificaciones || input.email, subject, text, template: "admission_received" });
  } catch (e) {
    console.error("Admission email failed:", reference, e instanceof Error ? e.message : e);
  }
  return { ok: true, reference };
}

export async function listAdmissions(db: Database) {
  return db
    .select({
      id: admissions.id,
      reference: admissions.reference,
      firstNames: admissions.firstNames,
      lastNames: admissions.lastNames,
      category: admissions.category,
      status: admissions.status,
      submittedAt: admissions.submittedAt,
    })
    .from(admissions)
    .orderBy(desc(admissions.submittedAt));
}

export async function countAdmissions(db: Database, statuses: AdmissionStatus[]): Promise<number> {
  const [row] = await db.select({ n: count() }).from(admissions).where(inArray(admissions.status, statuses));
  return Number(row?.n ?? 0);
}

/** Full request for the admin. The DNI is masked; revealing it is a separate, audited action. */
export async function getAdmission(db: Database, rings: Keyrings, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db
    .select({
      a: admissions,
      email: persons.email,
      phone: persons.phone,
      province: persons.province,
      locality: persons.locality,
      birthDate: personIdentities.birthDate,
      nationality: personIdentities.nationality,
      preReference: preAdmissions.reference,
    })
    .from(admissions)
    .innerJoin(persons, eq(persons.id, admissions.personId))
    .innerJoin(preAdmissions, eq(preAdmissions.id, admissions.preAdmissionId))
    .leftJoin(personIdentities, eq(personIdentities.personId, admissions.personId))
    .where(eq(admissions.id, id));
  if (!row) return null;
  const { a } = row;
  const health = JSON.parse(decryptField(rings.field, a.healthEncrypted, healthAad(a.id))) as Health;
  const dni = await readPersonDni(db, rings, a.personId);
  return {
    id: a.id,
    reference: a.reference,
    preReference: row.preReference,
    status: a.status,
    fullName: `${a.firstNames} ${a.lastNames}`,
    dniMasked: dni ? maskDni(dni) : "—",
    birthDate: row.birthDate,
    nationality: row.nationality,
    address: `${a.address}, ${row.locality} (${a.postalCode}), ${row.province}`,
    email: row.email,
    phone: row.phone,
    notificationEmail: a.notificationEmail,
    category: categoryOptions.find((c) => c.value === a.category)?.label ?? a.category,
    categoryValue: a.category,
    interest: health.interes,
    patient: health.paciente && {
      acompanamiento: health.paciente.acompanamiento,
      reprocann: reprocannOptions.find((o) => o.value === health.paciente?.reprocann)?.label ?? "—",
      informado: health.paciente.informado,
    },
    statuteVersion: a.statuteVersion,
    newsOptIn: a.newsOptIn,
    submittedAt: a.submittedAt,
  };
}

export class InvalidAdmissionTransitionError extends Error {}

/** Moves a received request to the Comisión Directiva agenda. Decisions are recorded in the next stage. */
export async function elevateToCommission(db: Database, actorUserId: string, id: string, now = new Date()): Promise<void> {
  const updated = await db
    .update(admissions)
    .set({ status: "comision", statusChangedAt: now, statusChangedBy: actorUserId, updatedAt: now })
    .where(and(eq(admissions.id, id), eq(admissions.status, "recibida")))
    .returning({ reference: admissions.reference });
  if (!updated.length) throw new InvalidAdmissionTransitionError("La solicitud ya no está para elevar");
  await audit(db, { actorUserId, action: "admission.elevated", entityType: "admission", entityId: id, metadata: { reference: updated[0].reference } });
}
