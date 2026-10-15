// Fase 1: preadmissions sent from the public Sumate form.
import { boolean, date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { persons, retentionColumns } from "./core";

const tz = { withTimezone: true } as const;

// "derivada": the person turned out to be an existing member; the request moved to the legajo update.
export const preAdmissionStatus = pgEnum("pre_admission_status", ["recibida", "en-revision", "invitada", "cerrada", "derivada"]);

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
    // No longer asked in the form; kept for requests that came with it.
    phone: text("phone"),
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

export const admissionDecision = pgEnum("admission_decision", ["aprobada", "rechazada", "diferida"]);

/** Comisión Directiva decisions, append-only: a deferral and the later approval both stay on record. */
export const admissionDecisions = pgTable(
  "admission_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id")
      .notNull()
      .references(() => admissions.id, { onDelete: "restrict" }),
    decision: admissionDecision("decision").notNull(),
    meetingDate: date("meeting_date").notNull(),
    minutes: text("minutes").notNull(),
    approvedCategory: admissionCategory("approved_category"),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    recordedAt: timestamp("recorded_at", tz).notNull().defaultNow(),
  },
  (t) => [index("admission_decisions_admission_idx").on(t.admissionId)],
);

export const memberStatus = pgEnum("member_status", ["activo", "suspendido", "baja"]);
/** How the member reached the digital register: a new admission, or an existing (pre-system) member. */
export const memberOrigin = pgEnum("member_origin", ["admission", "legacy"]);

/**
 * Members. Created when the Comisión Directiva approves an admission, or when the admin registers an
 * existing member who joined before this system (no admission row, `origin = legacy`).
 */
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberNumber: text("member_number").notNull().unique(),
  personId: uuid("person_id")
    .notNull()
    .unique()
    .references(() => persons.id, { onDelete: "restrict" }),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "restrict" }),
  // Null for existing members: they never went through this system's admission.
  admissionId: uuid("admission_id")
    .unique()
    .references(() => admissions.id, { onDelete: "restrict" }),
  category: admissionCategory("category").notNull(),
  // Real date of admission. Null when an existing member's historical date is not available.
  since: date("since"),
  status: memberStatus("status").notNull().default("activo"),
  origin: memberOrigin("origin").notNull().default("admission"),
  /** Reference to the Comisión minutes, when known (existing members). */
  minutesReference: text("minutes_reference"),
  /** When the existing member finished the digital update (account activated). Never replaces `since`. */
  digitalOnboardingCompletedAt: timestamp("digital_onboarding_completed_at", tz),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  ...retentionColumns,
});
