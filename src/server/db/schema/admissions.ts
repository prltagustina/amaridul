// Fase 1: preadmissions sent from the public Sumate form.
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { persons, retentionColumns } from "./core";

const tz = { withTimezone: true } as const;

export const preAdmissionStatus = pgEnum("pre_admission_status", ["recibida", "en-revision", "invitada", "cerrada"]);

/**
 * Contact data is stored like `persons` (plain, needed to reply). What a person tells us about their
 * motivation and REPROCANN status is health-related, so it lives encrypted in `motivationEncrypted`
 * (AES-256-GCM, AAD bound to the row): see `src/server/pre-admissions.ts`.
 */
export const preAdmissions = pgTable(
  "pre_admissions",
  {
    id: uuid("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    status: preAdmissionStatus("status").notNull().default("recibida"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    province: text("province").notNull(),
    locality: text("locality").notNull(),
    wantsToParticipate: boolean("wants_to_participate").notNull(),
    motivationEncrypted: text("motivation_encrypted").notNull(),
    privacyAcceptedAt: timestamp("privacy_accepted_at", tz).notNull(),
    closedReason: text("closed_reason"),
    statusChangedAt: timestamp("status_changed_at", tz),
    statusChangedBy: uuid("status_changed_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    ...retentionColumns,
  },
  (t) => [index("pre_admissions_status_idx").on(t.status), index("pre_admissions_created_at_idx").on(t.createdAt)],
);

/** Internal notes written by the administration. Never health data (the UI says so). */
export const preAdmissionNotes = pgTable(
  "pre_admission_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    preAdmissionId: uuid("pre_admission_id")
      .notNull()
      .references(() => preAdmissions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("pre_admission_notes_pre_admission_idx").on(t.preAdmissionId)],
);

export const admissionStatus = pgEnum("admission_status", ["recibida", "comision", "aprobada", "rechazada"]);
export const admissionCategory = pgEnum("admission_category", ["activo", "adherente", "paciente"]);

/**
 * Formal admission request, sent from the invitation link. The person (name, contact) lives in
 * `persons` and the DNI in `person_identities`; free text and the patient-category answers may hold
 * health data, so they live encrypted in `healthEncrypted` (see `src/server/admissions.ts`).
 * Every acceptance keeps its timestamp; the statute keeps the exact version accepted.
 */
export const admissions = pgTable(
  "admissions",
  {
    id: uuid("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    preAdmissionId: uuid("pre_admission_id")
      .notNull()
      .unique()
      .references(() => preAdmissions.id, { onDelete: "restrict" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "restrict" }),
    status: admissionStatus("status").notNull().default("recibida"),
    firstNames: text("first_names").notNull(),
    lastNames: text("last_names").notNull(),
    address: text("address").notNull(),
    postalCode: text("postal_code").notNull(),
    notificationEmail: text("notification_email"),
    category: admissionCategory("category").notNull(),
    healthEncrypted: text("health_encrypted").notNull(),
    statuteVersion: text("statute_version").notNull(),
    obligationsAcceptedAt: timestamp("obligations_accepted_at", tz).notNull(),
    statuteAcceptedAt: timestamp("statute_accepted_at", tz).notNull(),
    feeAcknowledgedAt: timestamp("fee_acknowledged_at", tz).notNull(),
    truthfulnessDeclaredAt: timestamp("truthfulness_declared_at", tz).notNull(),
    changesCommitmentAt: timestamp("changes_commitment_at", tz).notNull(),
    privacyAcceptedAt: timestamp("privacy_accepted_at", tz).notNull(),
    newsOptIn: boolean("news_opt_in").notNull().default(false),
    submittedAt: timestamp("submitted_at", tz).notNull(),
    statusChangedAt: timestamp("status_changed_at", tz),
    statusChangedBy: uuid("status_changed_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    ...retentionColumns,
  },
  (t) => [index("admissions_status_idx").on(t.status), index("admissions_submitted_at_idx").on(t.submittedAt)],
);
